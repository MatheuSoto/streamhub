# StreamHub

Self-hosted homelab dashboard. Monitor your Proxmox server, access services via iframes, all in one place.

## Features

- Real-time server monitoring (CPU, RAM, GPU, disks, storage pools)
- LXC/VM status from Proxmox API
- Docker container status
- Embedded services via iframes (Immich, Jellyfin, AdGuard, etc.)
- Sidebar navigation with service icons

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- Proxmox API for server metrics
- Node.js monitor service for GPU + Docker stats

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in your server IPs
npm run dev
```

## Monitor Service

The dashboard requires a monitor API running on your LXC/server (port 9100). It queries:
- Proxmox API for host/guest metrics
- `nvidia-smi` for GPU stats
- `docker ps` for container status

See `monitor/server.js` for the service code.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SERVER_IP` | IP of the LXC running services |
| `NEXT_PUBLIC_PROXMOX_IP` | IP of the Proxmox host |

## License

MIT
