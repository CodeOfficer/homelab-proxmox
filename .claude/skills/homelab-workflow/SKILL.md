---
name: homelab-workflow
description: Enforce homelab-proxmox workflow patterns including single source of truth documentation, prompt logging, git commits, environment variables, and phase tracking. Use this skill when completing tasks, updating docs/ or CLAUDE.md files, or when workflow compliance validation is needed. Provides AI-powered fixes for violations.
---

# Homelab Workflow Enforcer

## Overview

Enforce workflow patterns and conventions for the homelab-proxmox project. Provide AI-powered validation and automatic fixes for common workflow violations.

## When to Use This Skill

Invoke this skill when:
- Completing a task or set of tasks
- Making changes to CLAUDE.md or docs/ files
- User asks about workflow compliance
- Workflow validation is needed
- Fixes for workflow violations are required

## Core Capabilities

### 1. Documentation Compliance Checking

Verify the "single source of truth" pattern through intelligent content analysis:

**Check for duplication between CLAUDE.md and docs/**

Read and analyze the actual content (not just keywords) to detect duplication:

1. **Read CLAUDE.md** - Look for sections describing:
   - Hardware specifications (exact models, capacities, capabilities)
   - Network configuration details (IPs, VLANs, topology)
   - Software versions and application lists

2. **Read corresponding docs/ files**:
   - `docs/HARDWARE.md` for hardware specifications
   - `docs/NETWORK.md` for network configuration
   - `docs/SOFTWARE.md` for software versions

3. **Identify duplicated CONTENT** - Not just keywords, but actual specification details:
   - ❌ BAD: CLAUDE.md lists "MS-01 with 96GB RAM, 2x 2TB NVMe" (this is specification)
   - ✅ GOOD: CLAUDE.md says "Control plane on pve-node-02 and pve-node-03" (this is architecture decision)

4. **Distinguish mentions from duplication**:
   - Mentioning "MS-01" or "96GB" in context is FINE
   - Listing out full specifications is DUPLICATION
   - Architecture decisions referencing hardware are GOOD
   - Repeating exact model numbers/capacities is BAD

**When violations found:**
1. Identify the duplicated content in CLAUDE.md
2. Verify the content exists in the appropriate docs/ file
3. Remove the specification details from CLAUDE.md
4. Keep only architecture decisions/rationale in CLAUDE.md
5. Update CLAUDE.md to reference (not duplicate) docs/ files

### 2. Prompt Logging Enforcement

**MANDATORY: Log EVERY SINGLE user prompt to `logs/prompts.log`**

This is not optional. This is not "when convenient". **AFTER EVERY USER MESSAGE.**

**Required Format:**
```
[YYYY-MM-DD HH:MM:SS] User: "prompt text"
→ Response: brief summary

[YYYY-MM-DD HH:MM:SS] User: "next prompt"
→ Response: brief summary

```

**Critical Format Rules:**
1. ✅ Use actual timestamps in HH:MM:SS format (e.g., `[2025-11-23 14:05:00]`)
2. ❌ NEVER use shell syntax like `$(date +%H:%M:%S)` - this won't evaluate correctly
3. ✅ ALWAYS include blank line after each entry (between entries)
4. ✅ Keep response summaries brief (one line, ~10-20 words)
5. ✅ Append-only (never modify existing entries)
6. ✅ **logs/ is gitignored** - never try to commit it (permanent knowledge, remember this)

**Check if prompt was logged:**
1. Read logs/prompts.log
2. Verify MOST RECENT entry has a recent timestamp (within last few minutes)
3. Check for shell syntax that won't evaluate (`$(date ...`))
4. Check format compliance (actual timestamps, not shell variables)
5. Verify blank line spacing is consistent

**When logging is missing or malformed:**
1. Identify which prompts weren't logged
2. Add missing entries with actual timestamps (not shell syntax)
3. Fix any entries using `$(date ...)` syntax - replace with actual time
4. Ensure consistent blank line spacing between ALL entries
5. logs/ is gitignored (remember this permanently, don't rediscover it)

### 3. Git Commit Validation

Ensure changes are committed after completing work.

**Check for uncommitted changes:**
```bash
git status --porcelain
```

**When uncommitted changes found:**
1. Identify what was changed (docs/, CLAUDE.md, code, etc.)
2. Determine if work is complete and ready to commit
3. Generate appropriate commit message following pattern:
   ```
   <Short descriptive summary>

   - Bullet points for key changes
   - Important decisions made
   - Files created/modified

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
4. Offer to create the commit

### 4. CLAUDE.md Status Updates

Keep CLAUDE.md "Current Status" and phase tracking current.

**Check CLAUDE.md compliance:**
1. Verify "Last Updated" date is today (if changes were made)
2. Check phase completion checkboxes match actual progress
3. Verify "Current Status" section reflects reality
4. Ensure architecture decisions are documented

**When updates needed:**
1. Update "Last Updated" date to today
2. Mark completed tasks with [x]
3. Update "Current Status" with current phase
4. Add any new architecture decisions

### 5. Environment Variable Scanning

Check for hardcoded values that should be in `.envrc`.

**Scan for violations:**
1. Check for hardcoded IPs (except in docs/NETWORK.md)
2. Check for hardcoded secrets/tokens/passwords
3. Check for hardcoded URLs or API endpoints
4. Verify .envrc.example is documented

**When hardcoded values found:**
1. Identify the hardcoded value
2. Determine appropriate environment variable name
3. Add to .envrc.example with documentation
4. Replace hardcoded value with `${VARIABLE_NAME}`
5. Remind to set value in local .envrc

### 6. TodoWrite Compliance

Ensure TodoWrite tool is used appropriately for multi-step tasks.

**Check if TodoWrite should be used:**
- Task has 3+ distinct steps
- Task is complex/non-trivial
- User provided multiple tasks
- Multi-step work is being performed

**When TodoWrite not used but should be:**
1. Identify the subtasks involved
2. Create todo list with proper format:
   - `content`: Imperative form ("Run tests")
   - `activeForm`: Present continuous ("Running tests")
3. Mark exactly ONE task as in_progress
4. Track progress through completion

## Workflow Enforcement Process

Follow this process when enforcing workflow:

### Step 1: Assess Current State

1. Check git status for uncommitted changes
2. Check logs/prompts.log for missing entries
3. Read CLAUDE.md for Last Updated date and status
4. Run duplication checker
5. Review recent work for compliance

### Step 2: Identify Violations

Create a list of violations found:
- Documentation duplication
- Missing prompt logs
- Uncommitted changes
- Outdated CLAUDE.md status
- Hardcoded values
- Missing TodoWrite usage

### Step 3: Prioritize Fixes

Fix in this order:
1. **Critical**: Documentation duplication (breaks single source of truth)
2. **Important**: Missing prompt logs (required for every interaction)
3. **Important**: Uncommitted changes (work should be saved)
4. **Normal**: CLAUDE.md status updates
5. **Normal**: Hardcoded values
6. **Helpful**: TodoWrite usage

### Step 4: Apply Fixes

For each violation:
1. Explain what's wrong and why it matters
2. Show the specific fix needed
3. Apply the fix (edit files, run scripts, create commits)
4. Verify the fix resolved the issue

### Step 5: Validate and Report

1. Re-run validation checks
2. Confirm all violations fixed
3. Report summary of changes made
4. Update CLAUDE.md if needed
5. Create commit for workflow fixes

## Resources

### Scripts

- **`scripts/log_prompt.sh`** - Append prompt to logs/prompts.log in correct format

### References

- **`references/workflow_patterns.md`** - Complete reference of all workflow patterns, requirements, and anti-patterns. Read this file for detailed information about each pattern.

## Quick Reference

**Complete workflow for finishing work:**

1. ✅ Mark todos as completed (if using TodoWrite)
2. ✅ Update docs/ files with any new information
3. ✅ Update CLAUDE.md status and phase tracking
4. ✅ Check for duplication (AI reads CLAUDE.md and docs/ files)
5. ✅ Log the prompt with actual timestamp (NOT shell syntax) and blank line after
6. ✅ Commit changes: `git add . && git commit -m "message"`

**Logging format reminder:**
- Use actual timestamps: `[2025-11-23 14:05:00]` ✅
- NOT shell syntax: `[2025-11-23 $(date +%H:%M:%S)]` ❌
- Blank line after each entry ✅

**Validation command:**

User can run `/validate` for comprehensive workflow validation check.
