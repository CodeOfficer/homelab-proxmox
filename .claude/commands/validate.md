---
description: Deep validation of homelab workflow compliance
---

# Workflow Validation

Perform a comprehensive validation of all CLAUDE.md workflow patterns and conventions. Check the following:

## 1. Documentation Compliance

**Single Source of Truth:**
- Read CLAUDE.md and all docs/ files (HARDWARE.md, NETWORK.md, SOFTWARE.md, LINKS.md)
- Check for ANY duplication of information between CLAUDE.md and docs/
- Verify hardware specs ONLY in docs/HARDWARE.md
- Verify network config ONLY in docs/NETWORK.md
- Verify software versions ONLY in docs/SOFTWARE.md
- Report any violations with specific line numbers

## 2. Prompt Logging

**Check logs/prompts.log:**
- Verify file exists
- Check recent entries follow the format: `[YYYY-MM-DD HH:MM:SS] User: "prompt" → Response: summary`
- Identify any missing entries from recent conversation
- Report if logging is behind

## 3. Git Status

**Check repository state:**
- Run `git status` to find uncommitted changes
- List all modified/new/deleted files
- Check if changes are related to completed tasks
- Suggest if commit is needed with appropriate message

## 4. Phase and Status Tracking

**Check CLAUDE.md:**
- Verify "Last Updated" date is current
- Check if "Current Status" section matches actual work done
- Verify phase completion checkboxes are accurate
- Check if todos in TodoWrite match CLAUDE.md phases

## 5. Environment Variables

**Scan for hardcoded values:**
- Check for hardcoded IPs (except in docs/NETWORK.md)
- Check for hardcoded secrets/tokens/passwords
- Verify .envrc.example exists and is documented
- Check if any new variables need adding to .envrc.example

## 6. File Structure

**Verify repository structure:**
- Check all expected directories exist: docs/, infrastructure/, applications/, scripts/, logs/
- Verify .gitignore is properly configured (logs/, .envrc ignored)
- Check .claude/ folder structure (hooks/, commands/, skills/)

## 7. Workflow Pattern Adherence

**Review recent work:**
- Were docs/ files read before making changes?
- Were changes committed after completing tasks?
- Was TodoWrite used for multi-step tasks?
- Were todos marked complete immediately after finishing?

## Output Format

Provide a structured report:

```
🔍 WORKFLOW VALIDATION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PASSED
- [List all checks that passed]

⚠️  WARNINGS
- [List any issues that need attention]

❌ FAILURES
- [List any critical violations]

💡 RECOMMENDATIONS
- [List suggested improvements]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Status: [PASS/WARN/FAIL]
```

**After validation, offer to fix any issues found.**
