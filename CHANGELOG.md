# Changelog

All notable changes to the homelab-proxmox infrastructure.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Phase 5.9] - 2025-12-01

### Fixed
- **K3s false-positive Prometheus alerts** - disabled ServiceMonitors for embedded components
  - kubeControllerManager, kubeScheduler, kubeProxy, kubeEtcd
  - K3s embeds these in the k3s binary - no separate metrics endpoints exist
  - Prevents "target disappeared from discovery" alerts

### Added
- **Factorio save import workflow** - documented staging mechanism
  - Place save in `/factorio/save-importer/import/` directory
  - Pod restart triggers init container to import and rename file
  - Useful for migrating saves from desktop Factorio to server

### Changed
- `applications/monitoring/values.yaml` - disabled K3s-incompatible ServiceMonitors

### Technical Notes
- K3s architecture: scheduler/controller-manager/proxy run in-process, not as separate pods
- Standard kube-prometheus-stack expects separate component pods with metrics endpoints
- Save importer uses checksum tracking to avoid re-importing unchanged files

## [Phase 5.8] - 2025-12-01

### Added
- **dotdc Kubernetes dashboards** - interactive cluster monitoring
  - k8s-views-global (ID: 15757) - cluster overview with node health
  - k8s-views-nodes (ID: 15759) - per-node drill-down with dropdown selector
  - k8s-views-namespaces (ID: 15758) - namespace resource breakdown
  - k8s-views-pods (ID: 15760) - pod-level detail
  - Imported via Helm values `grafana.dashboards` from grafana.com

### Removed
- Custom k8s-treemap dashboard (`applications/monitoring/dashboards/k8s-treemap.yaml`)
  - Replaced by dotdc dashboards which have proper interactive features

### Changed
- `applications/monitoring/values.yaml` - added dashboardProviders and dashboards config

### Technical Notes
- dotdc dashboards use Grafana variables for node/namespace/pod selection
- Source: https://github.com/dotdc/grafana-dashboards-kubernetes
- Dashboards appear in Grafana under "Kubernetes" folder
- The custom treemap had label rendering issues and no interactivity

## [Phase 5.7] - 2025-12-01

### Fixed
- **Mapshot CronJob scheduling failure**
  - Root cause: Phase 5.6 set both request AND limit to 8Gi
  - Scheduler couldn't find node with 8Gi free (k3s-cp-02 has 8Gi total)
  - Fix: request=2Gi (scheduling), limit=8Gi (OOM protection)

### Technical Notes
- K8s `requests` = scheduler reservation (must be available on node)
- K8s `limits` = maximum burst usage (OOM kill threshold)
- Requests should be typical usage, limits should be peak usage

## [Phase 5.6] - 2025-11-30

### Added
- ContainerOOMKilled Prometheus alert (`applications/monitoring/alerts.yaml`)
  - Alerts via Telegram when containers are OOM-killed
  - Catches failures that can't be trapped by EXIT handlers

### Fixed
- **Mapshot Telegram notifications not sending**
  - Root cause: Container was OOM-killed (4Gi insufficient for Space Age maps)
  - SIGKILL from OOM cannot be trapped, so EXIT handler never ran
  - Increased memory limit: 4Gi → 8Gi

### Technical Notes
- Exit code 137 = SIGKILL (OOM kill)
- Bash EXIT traps don't run on SIGKILL - need external monitoring
- Prometheus `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}` tracks OOM events

## [Phase 5.5] - 2025-11-30

### Added
- Loki ServiceMonitor and Promtail PodMonitor (`applications/loki/servicemonitor.yaml`)
  - Enables Prometheus to scrape Loki/Promtail metrics
  - Required for Loki Health dashboard to function
- UnPoller deployment for UniFi metrics (`applications/unpoller/deployment.yaml`)
  - Scrapes UniFi controller at 10.20.10.1
  - ServiceMonitor for Prometheus integration

### Fixed
- **K8s Treemap dashboard**: Converted deprecated treemap panels to bar gauges
  - Treemap visualization no longer supported in Grafana 10+
- **UniFi Network dashboard**: Updated all metrics for unpoller v2
  - Old metrics (e.g., `unpoller_client_info`) → new (e.g., `unpoller_site_users`)
  - Fixed authentication with environment variables instead of config file
- **Loki Health dashboard**: Added ServiceMonitor so Prometheus scrapes Loki
  - Was showing "No data" because no scrape target existed

### Technical Notes
- UnPoller v2 metric name changes required complete dashboard rewrite
- Loki exposes metrics on port 3100, Promtail on port 3101
- ServiceMonitor requires `release: monitoring` label for Prometheus to discover

## [Phase 5.4] - 2025-11-30

### Added
- Loki health dashboard (`applications/monitoring/dashboards/loki-health.yaml`)
  - Log ingestion rate, storage %, active streams
  - Request latency p99, Promtail read rate by node
- PodMemoryPressure alert rule (warn at 80% of container limit)
- Promtail multiline log support (`applications/loki/promtail-values.yaml`)
  - Handles stack traces and multi-line game server logs
  - Regex matches ISO-8601 timestamps

### Changed
- Mapshot CronJob now auto-cleans old renders (keeps latest only)
  - Cleans both NAS (`/nas/mapshot/renders/`) and PVC locations
  - Removes stale zoom symlinks after cleanup
- Mapshot failure notifications via Telegram
  - Added EXIT trap for unhandled errors
  - All failures now send alerts (was success-only)

### Technical Notes
- Memory pressure threshold: 80% of `container_spec_memory_limit_bytes`
- Mapshot cleanup runs after every successful render
- Promtail multiline firstline regex: `^\d{4}[-/]\d{2}[-/]\d{2}|^\[\d{4}[-/]\d{2}[-/]\d{2}|^\d{2}:\d{2}:\d{2}`

## [Phase 5.3] - 2025-11-30

### Added
- Loki 3.5.7 log aggregation (`applications/loki/`)
  - Modern grafana/loki chart with volume query support
  - Promtail DaemonSet on all nodes for log collection
  - 15-day retention, 10Gi local-path storage
  - Grafana datasource auto-configured
  - CronJob logs dashboard for backup debugging
- CronJob health PrometheusRules (`applications/monitoring/alerts.yaml`)
  - `CronJobFailed` - Alert when backup jobs fail (severity: critical)
  - `FactorioBackupStale` - No successful backup in 7h
  - `SDTDBackupStale` - No successful backup in 7h
  - `PostgreSQLBackupStale` - No successful backup in 25h
  - `OpenWebUIBackupStale` - No successful backup in 25h
  - `MapshotRenderStale` - No successful render in 5h (warning)
  - `CronJobSuspended` - CronJob accidentally paused
- Factorio backup CronJob (`applications/factorio/backup-cronjob.yaml`)
- Open-WebUI backup CronJob (`applications/open-webui/backup-cronjob.yaml`)
- Backup README (`applications/backups/README.md`)
- `make deploy-loki` and `make loki-status` targets

### Changed
- Consolidated all backups to UNAS K3sStorage (was split between Synology and UNAS)
- Backup directory structure: `namespace/purpose/history/` pattern
  - `latest.*` at top level, timestamped backups in `history/` subfolder
- Renamed `databases/` → `postgresql/` on NAS for consistency
- Updated all backup CronJobs with history/ subfolder pattern

### Technical Notes
- Loki volume histogram requires modern Loki 3.5.7+ (loki-stack chart doesn't support it)
- Promtail collects logs from deployment time forward (no historical data)
- CronJob staleness thresholds: schedule + 1h buffer (6h job → 7h alert)
- NFS path: `/volume/567898ba-8471-4adb-9be9-d3e1f96fa7ba/.srv/.unifi-drive/K3sStorage/.data`

## [Phase 5.2] - 2025-11-30

### Added
- Telegram alerting integration
  - Alertmanager sends critical alerts to Telegram
  - Mapshot CronJob notifies on render completion
  - 7DTD backup CronJob notifies on success
  - Config: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.envrc`
- PrometheusRule for critical alerts (`applications/monitoring/alerts.yaml`)
  - Node unreachable (5+ min)
  - Pod crash loops (5+ restarts in 15 min)
  - PVC near full (>85%)
  - Game server down (sdtd/factorio namespace pods)
- Game server dashboard improvements
  - CPU throttling panel (stutter indicator)
  - Memory % of limit panel (OOM risk indicator)
  - TCP retransmits panel (network issues)

### Fixed
- 7DTD backup now directly copies save data
  - Bypasses broken Helm chart backup mechanism
  - Creates timestamped tarballs every 6 hours
  - Retains last 10 backups on Synology NFS
  - Checksum-based change detection (skips backup if no changes)
  - Fixed retention pruning (was keeping ~27, now exactly 10)
- Mapshot viewer 404 errors
  - Root cause: viewer requests `/s1zoom_N/tile.jpg` but mapshot outputs to `/d-XXXXX/s1zoom_N/tile.jpg`
  - Fix: symlink `mapshot.json` AND all zoom directories to render dir
  - Refactored cronjob with path constants, validation functions, and better error handling

### Technical Notes
- Telegram secrets are optional (`optional: true` in secretKeyRef)
- Alertmanager route: warnings → Grafana only, critical → Telegram
- 7DTD saves location varies by world type (RWG creates random folder names)

## [Phase 5.1] - 2025-11-29

### Changed
- 7 Days to Die: Switched from Navezgane to RWG world generation
  - 8K map size (seed: "foundation", world: "Fekigu Territory")
  - Game name: "FoundationRWG"
  - Warrior difficulty (3)
  - Keep inventory on death (dropOnDeath: 0, dropOnQuit: 0)
  - EAC disabled for LAN play

### Fixed
- 7DTD backup sidecar crash loop (58 restarts in 29h → 0)
  - Root cause: Navezgane doesn't create `/data/GeneratedWorlds/` directory
  - RWG creates this directory, fixing rsync exit code 23 errors
  - Re-enabled built-in backups (30 min interval, 48 max)

### Technical Notes
- Helm chart uses nested YAML: `serverConfig.gameplay.world.gameWorld`
- EAC setting path: `serverConfig.other.eacEnabled`
- World generation takes ~2 minutes for 8K map

## [Phase 5.0] - 2025-11-28

### Added
- Prometheus + Grafana monitoring stack (kube-prometheus-stack Helm chart)
  - Grafana at https://grafana.codeofficer.com
  - 15-day metric retention (10Gi local-path storage)
  - Node exporter on all 3 nodes
  - kube-state-metrics for K8s object metrics
  - Alertmanager for alert routing
- NVIDIA DCGM exporter for GPU metrics (RTX 4000 Ada)
  - GPU temperature, utilization, memory usage
  - ServiceMonitor for Prometheus scraping

### Technical Notes
- Grafana admin password saved to `.secrets/grafana-admin-password`
- All monitoring components scheduled on control plane nodes
- GPU metrics available via `DCGM_FI_DEV_*` Prometheus metrics

## [Phase 4.8] - 2025-11-28

### Added
- Factorio dedicated game server (SQLJames/factorio-server-charts)
  - Built-in auto-save every 5 minutes (no CronJob needed)
  - LoadBalancer service at 10.20.11.202:34197
  - Space Age DLC enabled
  - RCON password in `.secrets/factorio-rcon-password`

### Technical Notes
- Factorio is simpler than 7DTD - built-in auto-save, fast startup (~30s vs 45min)
- No account needed for private server

## [Phase 4.7] - 2025-11-28

### Added
- 7 Days to Die dedicated game server (thelande/7dtd Helm chart)
  - Auto-save CronJob every 5 minutes via telnet (crash protection)
  - Backup sync to Synology NFS
  - LoadBalancer service at 10.20.11.201:26900
- Tailscale subnet router on k3s-cp-01 for remote game access
  - Exposes 10.20.11.0/24 to Tailscale network
  - Friends can join via Tailscale invite

### Technical Notes
- 7DTD has NO built-in auto-save; only saves on player logout or graceful shutdown
- Telnet enabled for `saveworld` command (password in `.secrets/7dtd-telnet-password`)
- Never use Ctrl+D/SIGKILL on game server pods - use `kubectl delete pod` for graceful shutdown

## [Phase 4.6] - 2025-11-28

### Added
- PostgreSQL backup CronJob (daily 3 AM to Synology)
- HTTPS redirect middleware for all ingresses (`applications/traefik/middleware.yaml`)
- Ingress convention documented in CLAUDE.md

## [Phase 4.5] - 2025-11-28

### Added
- NFS StorageClass (nfs-client) via nfs-subdir-external-provisioner
- PostgreSQL in databases namespace (Bitnami Helm chart, local-path storage)
- Redis in databases namespace (Bitnami Helm chart, local-path storage)

### Changed
- Ollama: emptyDir → NFS PVC (100Gi)
- Open WebUI: emptyDir → NFS PVC (10Gi)

## [Phase 4] - 2025-11-26

### Added
- MetalLB for LoadBalancer services (10.20.11.200-210)
- cert-manager with Let's Encrypt ClusterIssuers (staging + prod)
- NVIDIA device plugin for GPU workloads
- hello-world test deployment
- Ollama LLM server on GPU node
- Open WebUI chat interface

## [Phase 3.5] - 2025-11-26

### Added
- GPU worker node (k3s-gpu-01) on pve-01
- NVIDIA RTX 4000 Ada passthrough
- NVIDIA driver 550 + container toolkit via Ansible

### Technical Notes
- VM requires: `bios = "ovmf"` + `efi_disk`
- Kernel params: `net.ifnames=0 biosdevname=0` (for q35 NIC naming)
- Device plugin needs: `runtimeClassName: nvidia`
- GPU nodes labeled: `nvidia.com/gpu.present=true`

## [Phase 3] - 2025-11-26

### Added
- K3s cluster with 2 control plane nodes (embedded etcd)
- k3s-cp-01 (10.20.11.80) on pve-02
- k3s-cp-02 (10.20.11.81) on pve-03
- Terraform provisioning from VM template

## [Phase 2] - 2025-11-25

### Added
- Ubuntu 24.04 VM template (VMID 9000)
- Packer automation for template creation
- cloud-init integration for automated provisioning

## [Phase 1] - 2025-11-25

### Added
- 3-node Proxmox cluster (pve-01, pve-02, pve-03)
- NFS storage mounts (VMStorage for Proxmox, K3sStorage for K3s)
- GPU passthrough configuration on pve-01 (IOMMU, vfio-pci)

## [Phase 0] - 2025-11-25

### Added
- docs/HARDWARE.md - Physical hardware specifications
- docs/NETWORK.md - Network architecture, VLANs, IP addressing
- docs/SOFTWARE.md - Software stack and versions
- docs/LINKS.md - Reference documentation links
