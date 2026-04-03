const ICON_CDN = "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg";

const serviceMap: Record<string, { name: string; icon: string; description: string }> = {
  immich_server:          { name: "Immich",      icon: `${ICON_CDN}/immich.svg`,       description: "Fotos y Videos" },
  immich_machine_learning:{ name: "Immich ML",   icon: `${ICON_CDN}/immich.svg`,       description: "Reconocimiento facial" },
  immich_postgres:        { name: "Immich DB",   icon: `${ICON_CDN}/postgresql.svg`,   description: "Base de datos Immich" },
  immich_redis:           { name: "Immich Cache", icon: `${ICON_CDN}/redis.svg`,       description: "Cache Immich" },
  jellyfin:               { name: "Jellyfin",    icon: `${ICON_CDN}/jellyfin.svg`,     description: "Películas y Series" },
  nextcloud:              { name: "Nextcloud",   icon: `${ICON_CDN}/nextcloud.svg`,    description: "Archivos y Chat" },
  "nextcloud-db":         { name: "Nextcloud DB", icon: `${ICON_CDN}/mariadb.svg`,     description: "Base de datos Nextcloud" },
  adguard:                { name: "AdGuard",     icon: `${ICON_CDN}/adguard-home.svg`, description: "DNS y Bloqueo de Ads" },
  streamhub:              { name: "StreamHub",   icon: `${ICON_CDN}/homepage.svg`,     description: "Dashboard" },
};

// Main services (shown as cards)
const mainServices = new Set(["immich_server", "jellyfin", "nextcloud", "adguard"]);

export interface ServiceCard {
  name: string;
  icon: string;
  description: string;
  url: string;
  up: boolean;
  main: boolean;
}

export interface FixedService {
  name: string;
  icon: string;
  description: string;
  url: string;
}

export function getFixedServices(proxmoxIp: string): FixedService[] {
  return [
    { name: "Proxmox", icon: `${ICON_CDN}/proxmox.svg`, description: "Hypervisor", url: `https://${proxmoxIp}:8006` },
  ];
}

export function buildServices(containers: { name: string; up: boolean; ports: string }[], serverIp: string): ServiceCard[] {
  return containers
    .filter(c => c.name !== "streamhub")
    .map(c => {
      const info = serviceMap[c.name];
      const portMatch = c.ports.match(/:(\d+)/);
      const port = portMatch ? portMatch[1] : "";
      return {
        name: info?.name || c.name,
        icon: info?.icon || `${ICON_CDN}/docker.svg`,
        description: info?.description || c.name,
        url: port ? `http://${serverIp}:${port}` : "",
        up: c.up,
        main: mainServices.has(c.name),
      };
    });
}
