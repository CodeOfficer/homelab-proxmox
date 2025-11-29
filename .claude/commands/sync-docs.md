# Sync Documentation and Commit

Review the current session's work and update all relevant documentation files:

## Files to Update

1. **CHANGELOG.md** - Add entry for completed work:
   - Use format: `## [Phase X.Y] - YYYY-MM-DD`
   - Include `### Added`, `### Changed`, `### Fixed` sections as appropriate
   - Add `### Technical Notes` for implementation details worth preserving

2. **CLAUDE.md** - Update project status:
   - Update "Completed" phase number
   - Move completed items from "Next Steps" to appropriate section
   - Update any IP addresses, ports, or connection info
   - Keep it concise - details belong in CHANGELOG.md

3. **docs/*.md** - Update if the work changed:
   - HARDWARE.md - Physical hardware specs
   - NETWORK.md - IPs, ports, VLANs
   - SOFTWARE.md - Versions, services
   - ARCHITECTURE.md - Design decisions

## Commit Guidelines

- Only commit documentation files (no code changes)
- Use descriptive commit message summarizing what was documented
- Format: `Update docs for Phase X.Y: <brief description>`

## Steps

1. Review what was accomplished in this session
2. Check git status for any uncommitted doc changes
3. Update CHANGELOG.md with new phase entry
4. Update CLAUDE.md status section
5. Update docs/*.md if relevant
6. Stage and commit with appropriate message

Do NOT update docs if nothing significant was accomplished. Ask if unclear what phase number to use.
