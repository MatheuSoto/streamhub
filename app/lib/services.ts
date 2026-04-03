export interface Service {
  id: string;
  name: string;
  icon: string;
  url: string;
  type: "iframe" | "internal" | "external";
}

const CDN = "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg";

export function getServices(serverIp: string, proxmoxIp: string): Service[] {
  return [
    { id: "home",     name: "Inicio",     icon: `${CDN}/homepage.svg`,        url: "",                                type: "internal" },
    { id: "movies",   name: "Películas",  icon: `${CDN}/radarr.svg`,          url: "",                                type: "internal" },
    { id: "photos",   name: "Fotos",      icon: `${CDN}/immich.svg`,          url: `http://${serverIp}:2283`,         type: "iframe" },
    { id: "media",    name: "Media",      icon: `${CDN}/jellyfin.svg`,        url: `http://${serverIp}:8096`,         type: "iframe" },
    { id: "files",    name: "Archivos",   icon: `${CDN}/nextcloud.svg`,       url: `http://${serverIp}:8080`,         type: "external" },
    { id: "dns",      name: "DNS",        icon: `${CDN}/adguard-home.svg`,    url: `http://${serverIp}:3000`,         type: "iframe" },
    { id: "proxmox",  name: "Proxmox",    icon: `${CDN}/proxmox.svg`,         url: `https://${proxmoxIp}:8006`,       type: "external" },
  ];
}
