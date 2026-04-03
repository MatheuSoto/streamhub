"use client";

import { useEffect, useState } from "react";
import { buildServices, getFixedServices, type ServiceCard } from "./lib/services";

const MONITOR_URL = process.env.NEXT_PUBLIC_MONITOR_URL || "http://localhost:9100";
const SERVER_IP = process.env.NEXT_PUBLIC_SERVER_IP || "localhost";
const PROXMOX_IP = process.env.NEXT_PUBLIC_PROXMOX_IP || "localhost";

interface Stats {
  host: {
    cpu: number; cpuModel: string; cores: number; threads: number; load: string[]; ioWait: number;
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
        <span className="text-white/60">{label}</span>
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
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [svcs, setSvcs] = useState<ServiceCard[]>([]);

  useEffect(() => {
    const load = () => fetch(MONITOR_URL).then(r => r.json()).then((d: Stats) => {
      setStats(d);
      setSvcs(buildServices(d.containers, SERVER_IP));
    }).catch(() => {});
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="p-6 lg:p-8 mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Stream<span className="text-red-500">Hub</span></h1>
          {stats && <span className="text-xs text-white/40">Uptime {formatUptime(stats.host.uptime)}</span>}
        </div>

        {/* Services - auto-discovered */}
        {svcs.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {svcs.filter(s => s.main).map((s) => (
                <a key={s.name} href={s.url || "#"} target="_blank" rel="noopener"
                  className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <img src={s.icon} alt={s.name} className="w-8 h-8" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white group-hover:text-red-400 transition-colors">{s.name}</p>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.up ? "bg-green-500" : "bg-red-500"}`} />
                      </div>
                      <p className="text-xs text-white/40">{s.description}</p>
                    </div>
                  </div>
                </a>
              ))}
              {getFixedServices(PROXMOX_IP).map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener"
                  className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <img src={s.icon} alt={s.name} className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-red-400 transition-colors">{s.name}</p>
                      <p className="text-xs text-white/40">{s.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {!stats ? (
          <div className="text-center text-white/40 py-20">Conectando al servidor...</div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Servidor</h2>
                <p className="text-xs text-white/40">{stats.host.cpuModel} • {stats.host.cores}C/{stats.host.threads}T • PVE {stats.host.pveVersion}</p>
              </div>
              <span className="flex items-center gap-2 text-xs text-white/40">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Online
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Section title="Procesador" badge={`Load ${stats.host.load.join(" / ")}`}>
                <Stat label="CPU" value={`${stats.host.cpu}%`} pct={stats.host.cpu} color="bg-blue-500" />
                <Stat label="I/O Wait" value={`${(stats.host.ioWait * 100).toFixed(2)}%`} pct={stats.host.ioWait * 100} color="bg-blue-400" />
              </Section>
              <Section title="Memoria">
                <Stat label="RAM" value={`${stats.host.mem.pct}%`} sub={`${stats.host.mem.used}GB / ${stats.host.mem.total}GB (${stats.host.mem.free}GB libre)`} pct={stats.host.mem.pct} color="bg-green-500" />
                <Stat label="Swap" value={`${stats.host.swap.pct}%`} sub={`${stats.host.swap.used}GB / ${stats.host.swap.total}GB`} pct={stats.host.swap.pct} color="bg-green-400" />
              </Section>
              <Section title="GPU" badge={`Driver ${stats.gpu.driver}`}>
                <p className="text-sm text-white/80">{stats.gpu.name}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Stat label="Temp" value={`${stats.gpu.temp}°C`} pct={stats.gpu.temp} color="bg-red-500" />
                  <Stat label="Uso" value={`${stats.gpu.util}%`} pct={stats.gpu.util} color="bg-red-400" />
                </div>
                <Stat label="VRAM" value={`${stats.gpu.memUsed}MB / ${stats.gpu.memTotal}MB`} pct={stats.gpu.memTotal ? (stats.gpu.memUsed / stats.gpu.memTotal) * 100 : 0} color="bg-red-500" />
                <p className="text-xs text-white/40">⚡ {stats.gpu.powerDraw}W / {stats.gpu.powerLimit}W • Fan {stats.gpu.fan}%</p>
              </Section>
            </div>

            <Section title="Almacenamiento">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-xs text-white/40 uppercase tracking-wider">Discos Físicos</h3>
                  {stats.physicalDisks.map((d) => (
                    <div key={d.serial} className="flex justify-between items-center bg-white/[0.03] rounded-lg p-3">
                      <div>
                        <p className="text-sm text-white">{d.model}</p>
                        <p className="text-xs text-white/40">{d.type.toUpperCase()} • {d.size}GB{d.rpm !== 0 && d.rpm !== "0" ? ` • ${d.rpm} RPM` : ""}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded ${d.health === "PASSED" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{d.health}</span>
                        {d.wearout !== "N/A" && <p className="text-xs text-white/40 mt-1">Vida: {d.wearout}%</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs text-white/40 uppercase tracking-wider">Storage Pools</h3>
                  {stats.storage.map((st) => (
                    <div key={st.name}>
                      <div className="flex justify-between text-sm">
                        <span className="text-white font-medium">{st.name} <span className="text-xs text-white/40">{st.type}</span></span>
                        <span className="text-white/60">{st.used}GB / {st.total}GB</span>
                      </div>
                      <Bar pct={st.pct} color={st.pct > 80 ? "bg-red-500" : "bg-yellow-500"} />
                      <p className="text-xs text-white/40">{st.free}GB libre</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="VMs & LXC" badge={`${stats.guests.length} guests`}>
              {stats.guests.map((g) => (
                <div key={g.id} className="bg-white/[0.03] rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${g.status === "running" ? "bg-green-500" : "bg-white/20"}`} />
                      <span className="font-medium text-sm text-white">{g.name}</span>
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">{g.type} {g.id}</span>
                    </div>
                    <span className="text-xs text-white/40">{g.status === "running" ? `Up ${formatUptime(g.uptime)}` : g.status}</span>
                  </div>
                  {g.status === "running" && (
                    <div className="grid grid-cols-3 gap-4">
                      <Stat label="CPU" value={`${g.cpu}%`} pct={g.cpu} color="bg-blue-500" />
                      <Stat label="RAM" value={`${g.mem.pct}%`} sub={`${g.mem.used}GB / ${g.mem.total}GB`} pct={g.mem.pct} color="bg-green-500" />
                      {g.disk && <Stat label="Disco" value={`${g.disk.pct}%`} sub={`${g.disk.used}GB / ${g.disk.total}GB`} pct={g.disk.pct} color="bg-yellow-500" />}
                    </div>
                  )}
                </div>
              ))}
            </Section>

            <Section title="Docker" badge={`${stats.containers.filter(c => c.up).length}/${stats.containers.length} running`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
                {stats.containers.map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.up ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="text-sm text-white">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {c.ports && <span className="text-xs text-white/40">{c.ports}</span>}
                      <span className="text-xs text-white/40">{c.image}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
