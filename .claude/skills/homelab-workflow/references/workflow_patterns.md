# Homelab Proxmox Workflow Patterns Reference

This document contains the core workflow patterns that MUST be followed throughout the homelab-proxmox project.

## Single Source of Truth Pattern

**Rule:** The `docs/` directory is the ONLY source of truth for specifications. NEVER duplicate information.

### File Responsibilities

| File | Contains | Does NOT Contain |
|------|----------|------------------|
| `docs/HARDWARE.md` | Physical hardware specs, exact models, capacities | Architecture decisions, plans |
| `docs/NETWORK.md` | Network config, VLANs, IP addressing, topology | Why we chose this architecture |
| `docs/SOFTWARE.md` | Software stack, versions, application catalog | Installation plans or procedures |
| `docs/LINKS.md` | Reference links and resources | Project plans or todos |
| `CLAUDE.md` | Project plan, phases, todos, architecture decisions | Hardware specs, network config, software versions |

### Enforcement

**Before making ANY change:**
1. Read the relevant docs/ file first
2. Determine which file should contain the information
3. Update ONLY that file
4. Reference (don't duplicate) when needed

**After making changes:**
1. Run validation to check for duplication
2. Ensure no specs leaked into CLAUDE.md
3. Ensure no plans leaked into docs/

## Prompt Logging Pattern

**Rule:** MUST log every user prompt to `logs/prompts.log` immediately after receiving it.

### Format
```
[YYYY-MM-DD HH:MM:SS] User: "<exact user prompt>"
→ Response: <one-line summary of what was accomplished>

```

### Requirements
- Timestamp must be when prompt was received
- User prompt must be exact (quoted)
- Response summary added when work complete
- Summaries brief (10-20 words max)
- Blank line between entries
- File is append-only (never delete entries)

### Using the Script
```bash
scripts/log_prompt.sh "user prompt text" "brief summary of response"
```

## Git Commit Pattern

**Rule:** MUST commit changes after completing tasks or updating the plan.

### When to Commit
- After completing a task or set of related tasks
- After updating CLAUDE.md with plan/status changes
- After making changes to docs/ files
- After infrastructure/code changes
- When a logical unit of work is complete

### Commit Message Format
```
<Short summary of changes>

<Optional detailed description>
- Bullet points for key changes
- List important decisions made
- Note any files created/modified

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Requirements
- Always run `git add .` or stage specific files first
- Use descriptive messages (not "update" or "fix")
- Include Co-Authored-By attribution
- Don't commit `.envrc` or `logs/` (gitignored)
- Commit atomically (related changes together)

## Documentation Update Pattern

**Rule:** Update docs/ files IMMEDIATELY when information changes. Never say "will update later".

### Workflow
1. Information discovered → Update appropriate docs/ file NOW
2. Hardware changed → Update `docs/HARDWARE.md` NOW
3. Network configured → Update `docs/NETWORK.md` NOW
4. Software installed → Update `docs/SOFTWARE.md` NOW
5. Plan changed → Update `CLAUDE.md` NOW

### Anti-Patterns
❌ "I'll update the docs later"
❌ "Let me note that for the docs"
❌ Assuming docs are current without checking
❌ Letting docs drift from reality

## Environment Variable Pattern

**Rule:** NEVER hardcode configurable values. Everything goes in `.envrc`.

### Pattern
- All secrets and config in `.envrc` (gitignored)
- Template maintained in `.envrc.example`
- Terraform uses `var.variable_name`
- Shell scripts use `${VARIABLE_NAME}`

### Enforcement
- Reject any code with hardcoded IPs, passwords, URLs, secrets
- Always suggest environment variable approach
- Document all required variables in `.envrc.example`
- If a value might change, it's a variable

## TodoWrite Pattern

**Rule:** Use TodoWrite tool for multi-step tasks (3+ steps or complex work).

### When to Use
1. Complex multi-step tasks (3+ distinct steps)
2. Non-trivial and complex tasks requiring planning
3. User explicitly requests todo list
4. User provides multiple tasks
5. After receiving new instructions
6. Before starting work (mark as in_progress)
7. After completing (mark as completed)

### When NOT to Use
1. Single straightforward task
2. Trivial task with no benefit from tracking
3. Less than 3 trivial steps
4. Purely conversational or informational

### Requirements
- Task descriptions in TWO forms:
  - `content`: Imperative form ("Run tests", "Build project")
  - `activeForm`: Present continuous ("Running tests", "Building project")
- Exactly ONE task in_progress at a time
- Mark complete IMMEDIATELY after finishing
- ONLY mark complete when FULLY accomplished
- Never mark complete if tests fail, partial work, or errors

## Phase Tracking Pattern

**Rule:** Keep CLAUDE.md "Current Status" and phase checkboxes always current.

### Requirements
- Update "Last Updated" date when plan changes
- Mark checkboxes [x] when tasks complete
- Update "Current Status" section to match reality
- Document decisions in "Architecture Decisions"
- Keep phase descriptions accurate

### Frequency
- After every completed task
- When moving to new phase
- When architecture decision made
- When plan changes

## File Structure Pattern

**Rule:** Maintain consistent repository structure.

```
homelab-proxmox/
├── docs/                      # Source of truth (ALWAYS CURRENT)
├── infrastructure/
│   ├── terraform/            # Root Terraform configs
│   └── modules/              # Reusable Terraform modules
├── applications/             # Kubernetes apps (each has deploy.sh)
├── scripts/                  # Automation scripts
├── logs/                     # Interaction logs (gitignored)
│   └── prompts.log          # User prompt history
├── .claude/                  # Local Claude Code primitives
│   ├── hooks/               # Workflow enforcement hooks
│   ├── commands/            # Slash commands
│   └── skills/              # Project-specific skills
├── .envrc.example           # Environment template
├── .envrc                   # Local config (gitignored)
├── Makefile                 # Command orchestration
├── README.md                # Project overview
└── CLAUDE.md                # Workflow + plan
```

## Validation Pattern

**Rule:** Validate workflow compliance regularly.

### Methods
1. **Automatic** - Hook runs after each prompt
2. **On-demand** - `/validate` command for deep check
3. **AI-powered** - This skill for intelligent fixes

### What to Check
- [ ] No duplication between CLAUDE.md and docs/
- [ ] Hardware specs only in docs/HARDWARE.md
- [ ] Network config only in docs/NETWORK.md
- [ ] Software versions only in docs/SOFTWARE.md
- [ ] Prompts logged in logs/prompts.log
- [ ] Changes committed to git
- [ ] Last Updated date current
- [ ] Phase status accurate
- [ ] No hardcoded values
- [ ] TodoWrite used appropriately
