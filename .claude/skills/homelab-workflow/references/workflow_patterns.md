# Homelab Proxmox Workflow Patterns Reference

Core workflow patterns for the homelab-proxmox project.

## Single Source of Truth Pattern

**Rule:** The `docs/` directory is the ONLY source of truth for specifications.

| File | Contains | Does NOT Contain |
|------|----------|------------------|
| `docs/HARDWARE.md` | Physical hardware specs, models, capacities | Plans, decisions |
| `docs/NETWORK.md` | Network config, VLANs, IPs, topology | Why we chose it |
| `docs/SOFTWARE.md` | Software stack, versions | Installation plans |
| `docs/LINKS.md` | Reference links | Project todos |
| `CLAUDE.md` | Plan, phases, architecture decisions | Specs from docs/ |

## Prompt Logging Pattern

**Rule:** Automatically logged via Stop hook (`.claude/hooks/stop`).

- Runs after every Claude response
- Parses transcript for user prompt and response
- Appends to `logs/prompts.log` with timestamp
- Format: `[YYYY-MM-DD HH:MM:SS] User: "prompt"` + `→ Response: summary`

**Note:** `logs/` is gitignored. No manual logging required.

## Git Commit Pattern

**Rule:** Commit changes after completing tasks or updating the plan.

### When to Commit
- After completing a task
- After updating CLAUDE.md or docs/
- After infrastructure/code changes
- When a logical unit of work is complete

### Commit Message Format
```
<Short summary of changes>

- Bullet points for key changes
- Important decisions made

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Environment Variable Pattern

**Rule:** Never hardcode configurable values. Everything goes in `.envrc`.

- All secrets and config in `.envrc` (gitignored)
- Template maintained in `.envrc.example`
- Terraform uses `var.variable_name`
- Shell scripts use `${VARIABLE_NAME}`

## TodoWrite Pattern

**Rule:** Use TodoWrite for multi-step tasks (3+ steps or complex work).

### When to Use
- Complex tasks with 3+ distinct steps
- User provides multiple tasks
- Multi-step work in progress

### Requirements
- Two forms: `content` (imperative) and `activeForm` (present continuous)
- Exactly ONE task in_progress at a time
- Mark complete IMMEDIATELY after finishing

## Phase Tracking Pattern

**Rule:** Keep CLAUDE.md always current.

- Update "Last Updated" when plan changes
- Mark checkboxes [x] when tasks complete
- Update "Current Status" to match reality

## File Structure

```
homelab-proxmox/
├── docs/                      # Source of truth
├── infrastructure/
│   ├── packer/               # VM template
│   ├── terraform/            # VM provisioning
│   ├── ansible/              # K3s installation
│   └── modules/              # Terraform modules
├── applications/             # K8s apps (future)
├── scripts/                  # Automation
├── logs/                     # Logs (gitignored)
├── .claude/
│   ├── hooks/                # Automated hooks
│   ├── commands/             # Slash commands
│   └── skills/               # Skills
├── .envrc.example            # Environment template
├── Makefile                  # Command interface
└── CLAUDE.md                 # Plan + status
```
