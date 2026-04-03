"use client";

import { useState, useEffect, useMemo } from "react";
import { getServices, type Service } from "./lib/services";
import Monitor from "./components/monitor";

const SERVER_IP = process.env.NEXT_PUBLIC_SERVER_IP || "localhost";
const PROXMOX_IP = process.env.NEXT_PUBLIC_PROXMOX_IP || "localhost";

function Sidebar({ services, active, onSelect, onHome }: { services: Service[]; active: string; onSelect: (s: Service) => void; onHome: () => void }) {
  return (
    <nav className="w-14 bg-[#111] border-r border-white/10 flex flex-col items-center py-4 gap-3 flex-shrink-0">
      <button onClick={onHome} title="Inicio" className="text-lg font-bold mb-2 text-red-500 hover:text-red-400 transition-colors cursor-pointer">S</button>
      {services.filter(s => s.id !== "home").map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          title={s.name}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 cursor-pointer ${
            active === s.id ? "bg-white/15 ring-1 ring-red-500/50" : ""
          }`}
        >
          <img src={s.icon} alt={s.name} className="w-4.5 h-4.5" />
        </button>
      ))}
    </nav>
  );
}

function IframeView({ url }: { url: string }) {
  return <iframe src={url} className="w-full h-full border-0" allow="fullscreen; autoplay; clipboard-write" />;
}

function Placeholder({ text }: { text: string }) {
  return <div className="flex items-center justify-center h-full text-white/40 text-lg">{text}</div>;
}

export default function Home() {
  const services = useMemo(() => getServices(SERVER_IP, PROXMOX_IP), []);
  const homeService = services[0];
  const [active, setActive] = useState<Service>(homeService);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const found = services.find((s) => s.id === hash);
    if (found) setActive(found);

    const onHash = () => {
      const h = window.location.hash.slice(1);
      setActive(services.find((s) => s.id === h) || homeService);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [services, homeService]);

  const navigate = (s: Service) => {
    if (s.type === "external") { window.open(s.url, "_blank"); return; }
    window.location.hash = s.id;
    setActive(s);
  };

  const goHome = () => { window.location.hash = "home"; setActive(homeService); };

  const renderContent = () => {
    if (active.id === "home") return <Monitor serverIp={SERVER_IP} />;
    if (active.type === "iframe") return <IframeView url={active.url} />;
    if (active.id === "movies") return <Placeholder text="🎬 StreamDeck — abrir en nueva pestaña" />;
    return null;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar services={services} active={active.id} onSelect={navigate} onHome={goHome} />
      <main className="flex-1 bg-[#0a0a0a] overflow-hidden">
        <div className="h-full">{renderContent()}</div>
      </main>
    </div>
  );
}
