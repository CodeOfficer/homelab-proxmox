# Factorio Dedicated Server

Factorio dedicated server running on K3s.

## Quick Start

```bash
./deploy.sh
# or
make deploy-factorio
```

## Connection

| Service | Address |
|---------|---------|
| Game Server | `10.20.11.202:34197` (UDP) |
| RCON | Internal only (port-forward if needed) |

**Friends via Tailscale:** Connect to `10.20.11.202:34197`

## Architecture

- **Helm Chart:** [SQLJames/factorio-server-charts](https://github.com/SQLJames/factorio-server-charts)
- **Docker Image:** [factoriotools/factorio](https://hub.docker.com/r/factoriotools/factorio)
- **Storage:** local-path PVC (10Gi)
- **Node:** Control plane (tolerations set)

## Auto-Save

Factorio has **built-in auto-save** (unlike 7DTD):
- Saves every 5 minutes (configurable)
- Saves on graceful shutdown (SIGTERM)
- 10 autosave slots retained

No CronJob workaround needed.

## Shutdown

Safe methods (world is saved):
```bash
kubectl delete pod -n factorio -l app.kubernetes.io/name=factorio-server-charts
kubectl rollout restart deployment -n factorio factorio-factorio-server-charts
```

## RCON Access

RCON password stored in `.secrets/factorio-rcon-password`.

```bash
# Port-forward for local RCON access
kubectl port-forward -n factorio svc/factorio-factorio-server-charts-rcon 27015:27015
```

## Mods

To enable mods, edit `values.yaml`:

```yaml
mods:
  enabled: true
  portal:
    - name: mod-name
      version: 1.0.0
```

Note: Mod portal downloads require a Factorio.com account configured in `account` section.

## Logs

```bash
kubectl logs -n factorio -l app=factorio-factorio-server-charts -f
```

## Resources

- [Factorio Wiki - Multiplayer](https://wiki.factorio.com/Multiplayer)
- [factoriotools/factorio-docker](https://github.com/factoriotools/factorio-docker)
- [Helm Chart Docs](https://github.com/SQLJames/factorio-server-charts)
