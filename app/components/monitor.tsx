"use client";

import { useEffect, useState } from "react";

interface Stats {
  host: {
    cpu: number; cpuModel: string; cores: number; threads: number; mhz: string; load: string[]; ioWait: number;
    mem: { pct: number; used: number; total: number; free: number };
    swap: { pct: number; used: number; total: number };
    uptime: number; kernel: string; pveVersion: string;
  };
  gpu: { name: string; driver: string; temp: number; memUsed: number; memTotal: number; util: number; powerDraw: number; powerLimit: number; fan: number };
  physicalDisks: { model: string; size: number; type: string; health: string; wearout: number | string; rpm: number | string; serial: string }[];
  storage: { name: string; type: string; used: number; total: number; free: number; pct: number; content: string }[];
  guests: { name: string; id: number; type: string; status: string; cpu: number; cores: number; mem: { pct: number; used: number; total: number }; swap?: { pct: number; used: number; total: number }; disk?: { pct: number; used: number; total: number }; net?: { in: number; out: number }; diskRead?: number; diskWrite?: number; uptime: number }[];
  containers: { name: string; up: boolean; status: string; image: string; ports: string }[];
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function Stat({ label, value, sub, pct, color }: { label: string; value: string; sub?: string; pct: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-white/50">{label}</span>
        <span className="font-medium text-white">{value}</span>
      </div>
      <Bar pct={pct} color={color} />
      {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-white/70">{title}</h2>
        {badge && <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Monitor({ serverIp }: { serverIp: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = () => fetch(`http://${serverIp}:9100`).then(r => r.json()).then(setStats).catch(() => {});
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [serverIp]);

  if (!stats) return <div className="flex items-center justify-center h-full text-white/40">Conectando al servidor...</div>;

  const s = stats;

  return (
    <div className="p-6 lg:p-8 mx-auto space-y-5 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-3 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            Servidor Proxmox
          </h1>
          <p className="text-xs text-white/40 mt-1">PVE {s.host.pveVersion} • Kernel {s.host.kernel} • Uptime {formatUptime(s.host.uptime)}</p>
        </div>
        <div className="text-right text-xs text-white/40">
          <p>{s.host.cpuModel}</p>
          <p>{s.host.cores} cores / {s.host.threads} threads</p>
        </div>
      </div>

      {/* ═══ SERVIDOR FÍSICO ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Procesador" badge={`Load: ${s.host.load.join(" / ")}`}>
          <Stat label="CPU" value={`${s.host.cpu}%`} pct={s.host.cpu} color="bg-blue-500" />
          <Stat label="I/O Wait" value={`${(s.host.ioWait * 100).toFixed(2)}%`} pct={s.host.ioWait * 100} color="bg-blue-400" />
        </Section>

        <Section title="Memoria">
          <Stat label="RAM" value={`${s.host.mem.pct}%`} sub={`${s.host.mem.used}GB usado • ${s.host.mem.free}GB libre • ${s.host.mem.total}GB total`} pct={s.host.mem.pct} color="bg-green-500" />
          <Stat label="Swap" value={`${s.host.swap.pct}%`} sub={`${s.host.swap.used}GB / ${s.host.swap.total}GB`} pct={s.host.swap.pct} color="bg-green-400" />
        </Section>

        <Section title="GPU" badge={`Driver ${s.gpu.driver}`}>
          <p className="text-sm text-white/80">{s.gpu.name}</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Stat label="Temp" value={`${s.gpu.temp}°C`} pct={s.gpu.temp} color="bg-red-500" />
            <Stat label="Uso" value={`${s.gpu.util}%`} pct={s.gpu.util} color="bg-red-400" />
          </div>
          <Stat label="VRAM" value={`${s.gpu.memUsed}MB / ${s.gpu.memTotal}MB`} pct={s.gpu.memTotal ? (s.gpu.memUsed / s.gpu.memTotal) * 100 : 0} color="bg-red-500" />
          <div className="flex justify-between text-xs text-white/40">
            <span>⚡ {s.gpu.powerDraw}W / {s.gpu.powerLimit}W</span>
            <span>Fan {s.gpu.fan}%</span>
          </div>
        </Section>
      </div>

      {/* ═══ ALMACENAMIENTO ═══ */}
      <Section title="Almacenamiento">
        <div className="space-y-4">
          <h3 className="text-xs text-white/40 uppercase tracking-wider">Discos Físicos</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {s.physicalDisks.map((d) => (
              <div key={d.serial} className="bg-white/[0.03] rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm text-white/80">{d.model}</p>
                  <p className="text-xs text-white/40">{d.type.toUpperCase()} • {d.size}GB{d.rpm !== 0 && d.rpm !== "0" ? ` • ${d.rpm} RPM` : ""}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded ${d.health === "PASSED" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{d.health}</span>
                  {d.wearout !== "N/A" && <p className="text-xs text-white/40 mt-1">Vida: {d.wearout}%</p>}
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-xs text-white/40 uppercase tracking-wider mt-4">Particiones / Storage Pools</h3>
          {s.storage.map((st) => (
            <div key={st.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/70 font-medium">{st.name}</span>
                  <span className="text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{st.type}</span>
                </div>
                <span className="text-white/50">{st.used}GB / {st.total}GB ({st.free}GB libre)</span>
              </div>
              <Bar pct={st.pct} color={st.pct > 80 ? "bg-red-500" : st.pct > 60 ? "bg-yellow-500" : "bg-yellow-500"} />
              <p className="text-xs text-white/40">{st.content}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ LXC / VMs ═══ */}
      <Section title="Máquinas Virtuales & LXC" badge={`${s.guests.length} guest${s.guests.length !== 1 ? "s" : ""}`}>
        {s.guests.map((g) => (
          <div key={g.id} className="bg-white/[0.03] rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${g.status === "running" ? "bg-green-500" : g.status === "stopped" ? "bg-white/20" : "bg-red-500"}`} />
                <span className="font-medium text-sm text-white">{g.name}</span>
                <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">{g.type} {g.id}</span>
                <span className="text-xs text-white/40">{g.cores} cores</span>
              </div>
              <span className="text-xs text-white/40">{g.status === "running" ? `Up ${formatUptime(g.uptime)}` : g.status}</span>
            </div>
            {g.status === "running" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="CPU" value={`${g.cpu}%`} pct={g.cpu} color="bg-blue-500" />
                  <Stat label="RAM" value={`${g.mem.pct}%`} sub={`${g.mem.used}GB / ${g.mem.total}GB`} pct={g.mem.pct} color="bg-green-500" />
                  {g.disk && <Stat label="Disco" value={`${g.disk.pct}%`} sub={`${g.disk.used}GB / ${g.disk.total}GB`} pct={g.disk.pct} color="bg-yellow-500" />}
                </div>
                {g.swap && g.swap.total > 0 && (
                  <Stat label="Swap" value={`${g.swap.pct}%`} sub={`${g.swap.used}GB / ${g.swap.total}GB`} pct={g.swap.pct} color="bg-green-400" />
                )}
                <div className="flex gap-6 text-xs text-white/40">
                  {g.net && <span>Red: ↓ {g.net.in}GB ↑ {g.net.out}GB</span>}
                  {g.diskRead !== undefined && <span>Disco: R {g.diskRead}GB W {g.diskWrite}GB</span>}
                </div>
              </>
            )}
          </div>
        ))}
      </Section>

      {/* ═══ DOCKER ═══ */}
      <Section title="Docker Containers" badge={`${s.containers.filter(c => c.up).length}/${s.containers.length} running`}>
        <div className="space-y-1.5">
          {s.containers.map((c) => (
            <div key={c.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.up ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm text-white">{c.name}</span>
              </div>
              <div className="flex items-center gap-4">
                {c.ports && <span className="text-xs text-white/40 max-w-[200px] truncate">{c.ports}</span>}
                <span className="text-xs text-white/40 truncate max-w-[150px]">{c.image}</span>
                <span className="text-xs text-white/40 w-24 text-right truncate">{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
