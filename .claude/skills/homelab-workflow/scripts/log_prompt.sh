#!/bin/bash
# Script to log user prompts to logs/prompts.log in the correct format
# Usage: log_prompt.sh "user prompt text" "response summary"

set -e

# Claude Code working directory is the project root
PROJECT_ROOT="${CLAUDE_PROJECT_ROOT:-.}"
LOG_FILE="$PROJECT_ROOT/logs/prompts.log"

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Create log file if it doesn't exist
if [[ ! -f "$LOG_FILE" ]]; then
    cat > "$LOG_FILE" << 'EOF'
# Prompt Log
# Format: [TIMESTAMP] User: "<prompt>"
#         → Response: <brief summary>

EOF
fi

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
USER_PROMPT="${1:-}"
RESPONSE_SUMMARY="${2:-}"

if [[ -z "$USER_PROMPT" ]]; then
    echo "Error: User prompt required"
    echo "Usage: $0 \"user prompt text\" \"response summary\""
    exit 1
fi

# Append entry
cat >> "$LOG_FILE" << EOF
[$TIMESTAMP] User: "$USER_PROMPT"
→ Response: $RESPONSE_SUMMARY

EOF

echo "✅ Logged to $LOG_FILE"
