const http = require("http");
const https = require("https");
const { execSync } = require("child_process");

const PVE_HOST = process.env.PVE_HOST || "localhost";
const PVE_TOKEN = process.env.PVE_TOKEN || "";

function run(cmd) { try { return execSync(cmd, { timeout: 5000 }).toString().trim(); } catch { return ""; } }

function pveGet(path) {
  return new Promise((resolve) => {
    const req = https.get(`https://${PVE_HOST}:8006${path}`, {
      headers: { Authorization: PVE_TOKEN },
      rejectUnauthorized: false,
    }, (res) => {
      let d = "";
      res.on("data", (c) => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d).data); } catch { resolve(null); } });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

function gb(bytes) { return +(bytes / 1073741824).toFixed(1); }

http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const [node, lxcs, vms, physDisks, storage] = await Promise.all([
    pveGet("/api2/json/nodes/pve/status"),
    pveGet("/api2/json/nodes/pve/lxc"),
    pveGet("/api2/json/nodes/pve/qemu"),
    pveGet("/api2/json/nodes/pve/disks/list"),
    pveGet("/api2/json/nodes/pve/storage"),
  ]);

  const gpu = run("nvidia-smi --query-gpu=temperature.gpu,memory.used,memory.total,utilization.gpu,name,driver_version,power.draw,power.limit,fan.speed --format=csv,noheader,nounits").split(", ");

  const containers = run("docker ps -a --format '{{.Names}}|{{.Status}}|{{.Image}}|{{.Ports}}'").split("\n").filter(Boolean).map(l => {
    const [name, status, image, ports] = l.split("|");
    // Simplify ports: extract only host:container mappings
    const portList = (ports || "").match(/0\.0\.0\.0:(\d+)->(\d+)\/tcp/g) || [];
    const simplePorts = portList.map(p => { const m = p.match(/0\.0\.0\.0:(\d+)->(\d+)/); return m ? `:${m[1]}` : ""; }).filter(Boolean).join(" ");
    return { name, up: (status || "").includes("Up"), status: (status || "").replace(/\s*\(.*\)/, ""), image: (image || "").split("/").pop()?.split(":")[0] || "", ports: simplePorts };
  });

  const mem = node?.memory || {};
  const swap = node?.swap || {};

  res.end(JSON.stringify({
    host: {
      cpu: Math.round((node?.cpu || 0) * 100),
      cpuModel: node?.cpuinfo?.model || "",
      cores: node?.cpuinfo?.cores || 0,
      threads: node?.cpuinfo?.cpus || 0,
      mhz: node?.cpuinfo?.mhz || "",
      load: node?.loadavg || [],
      ioWait: node?.wait || 0,
      mem: { pct: mem.total ? Math.round(mem.used / mem.total * 100) : 0, used: gb(mem.used || 0), total: gb(mem.total || 0), free: gb(mem.available || 0) },
      swap: { pct: swap.total ? Math.round(swap.used / swap.total * 100) : 0, used: gb(swap.used || 0), total: gb(swap.total || 0) },
      uptime: node?.uptime || 0,
      kernel: node?.["current-kernel"]?.release || "",
      pveVersion: node?.pveversion?.split("/")[1] || "",
    },
    gpu: {
      name: gpu[4] || "N/A", driver: gpu[5] || "", temp: +gpu[0] || 0,
      memUsed: +gpu[1] || 0, memTotal: +gpu[2] || 0, util: +gpu[3] || 0,
      powerDraw: Math.round(+gpu[6] || 0), powerLimit: Math.round(+gpu[7] || 0),
      fan: +gpu[8] || 0,
    },
    physicalDisks: (physDisks || []).map(d => ({
      model: d.model, size: gb(d.size), type: d.type, health: d.health,
      wearout: d.wearout, rpm: d.rpm, serial: d.serial,
    })),
    storage: (storage || []).filter(s => s.active).map(s => ({
      name: s.storage, type: s.type,
      used: gb(s.used || 0), total: gb(s.total || 0), free: gb(s.avail || 0),
      pct: s.total ? Math.round((s.used || 0) / s.total * 100) : 0,
      content: s.content,
    })),
    guests: [
      ...(lxcs || []).map(l => ({
        name: l.name, id: l.vmid, type: "LXC", status: l.status,
        cpu: Math.round((l.cpu || 0) * 100), cores: l.cpus,
        mem: { pct: l.maxmem ? Math.round(l.mem / l.maxmem * 100) : 0, used: gb(l.mem || 0), total: gb(l.maxmem || 0) },
        swap: { pct: l.maxswap ? Math.round(l.swap / l.maxswap * 100) : 0, used: gb(l.swap || 0), total: gb(l.maxswap || 0) },
        disk: { used: gb(l.disk || 0), total: gb(l.maxdisk || 0), pct: l.maxdisk ? Math.round(l.disk / l.maxdisk * 100) : 0 },
        net: { in: gb(l.netin || 0), out: gb(l.netout || 0) },
        diskRead: gb(l.diskread || 0), diskWrite: gb(l.diskwrite || 0),
        uptime: l.uptime || 0,
      })),
      ...(vms || []).map(v => ({
        name: v.name, id: v.vmid, type: "VM", status: v.status,
        cpu: Math.round((v.cpu || 0) * 100), cores: v.cpus || 0,
        mem: { pct: v.maxmem ? Math.round((v.mem || 0) / v.maxmem * 100) : 0, used: gb(v.mem || 0), total: gb(v.maxmem || 0) },
        disk: { used: gb(v.disk || 0), total: gb(v.maxdisk || 0), pct: v.maxdisk ? Math.round((v.disk || 0) / v.maxdisk * 100) : 0 },
        uptime: v.uptime || 0,
      })),
    ],
    containers,
  }));
}).listen(9100, () => console.log("Monitor on :9100"));
