#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool amp|claude|codex|gemini|copilot|auto] [--quota] [max_iterations]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to auto-select the best tool based on usage stats
# Returns: tool name (claude, amp, codex, gemini, copilot)
# Exit 1 if no tools available with balance > 0
auto_select_tool() {
  local usage_file="$SCRIPT_DIR/usage_stats.json"

  # Check for jq dependency
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: 'jq' is required but not installed.${NC}" >&2
    echo "Install with: sudo apt install jq (Debian/Ubuntu) or brew install jq (macOS)" >&2
    exit 1
  fi

  # Collect fresh usage statistics
  echo -e "${CYAN}Collecting usage statistics for auto-selection...${NC}" >&2
  bash "$SCRIPT_DIR/scripts/collect-usage.sh" "$usage_file" > /dev/null 2>&1 || {
    echo -e "${RED}Error: Failed to collect usage statistics${NC}" >&2
    exit 1
  }

  if [ ! -f "$usage_file" ]; then
    echo -e "${RED}Error: Usage stats file not found${NC}" >&2
    exit 1
  fi

  # Find the best tool using jq:
  # 1. Filter to available tools with balance > 0
  # 2. Sort by balance (descending), then by refill time (null last, soonest first for tie-break)
  # 3. Return the first tool name
  local best_tool
  best_tool=$(jq -r '
    .tools
    | map(select(.available == true and .balance > 0))
    | sort_by(-.balance, .refill // "9999-99-99")
    | .[0].tool // empty
  ' "$usage_file")

  if [ -z "$best_tool" ]; then
    echo -e "${RED}Error: No tools available with remaining balance.${NC}" >&2
    echo -e "${YELLOW}Run './ralph.sh --quota' to see current tool status.${NC}" >&2
    exit 1
  fi

  echo -e "${GREEN}Auto-selected tool: ${BOLD}$best_tool${NC}" >&2
  echo "$best_tool"
}

# Helper function to format time until reset
format_time_until() {
  local target_time="$1"
  if [ -z "$target_time" ] || [ "$target_time" = "null" ]; then
    echo "N/A"
    return
  fi

  # Parse ISO timestamp and calculate difference
  local target_epoch now_epoch diff_seconds
  target_epoch=$(date -d "$target_time" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$target_time" +%s 2>/dev/null) || {
    echo "N/A"
    return
  }
  now_epoch=$(date +%s)
  diff_seconds=$((target_epoch - now_epoch))

  if [ "$diff_seconds" -lt 0 ]; then
    echo "Now"
    return
  fi

  local hours=$((diff_seconds / 3600))
  local minutes=$(((diff_seconds % 3600) / 60))

  if [ "$hours" -gt 24 ]; then
    local days=$((hours / 24))
    echo "${days}d ${hours}h"
  elif [ "$hours" -gt 0 ]; then
    echo "${hours}h ${minutes}m"
  else
    echo "${minutes}m"
  fi
}

# Helper function to format expiration date
format_expiration() {
  local expires_at="$1"
  if [ -z "$expires_at" ] || [ "$expires_at" = "null" ]; then
    echo "N/A"
    return
  fi

  # Extract just the date part
  local date_part
  date_part=$(echo "$expires_at" | cut -dT -f1)
  echo "$date_part"
}

# Function to display quota table (enhanced version)
display_quota_table() {
  local usage_file="$SCRIPT_DIR/usage_stats.json"

  # Check for jq dependency
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: 'jq' is required but not installed.${NC}"
    echo "Install with: sudo apt install jq (Debian/Ubuntu) or brew install jq (macOS)"
    exit 1
  fi

  # Run the collection script
  echo -e "${CYAN}Collecting usage statistics from all AI tools...${NC}"
  echo ""
  bash "$SCRIPT_DIR/scripts/collect-usage.sh" "$usage_file" > /dev/null 2>&1 || {
    echo -e "${RED}Error: Failed to collect usage statistics${NC}"
    exit 1
  }

  if [ ! -f "$usage_file" ]; then
    echo -e "${RED}Error: Usage stats file not found${NC}"
    exit 1
  fi

  # Read timestamp
  local timestamp
  timestamp=$(jq -r '.timestamp' "$usage_file")

  # Print header - wider table for more info
  echo -e "${BOLD}╔═══════════════════════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║                                    AI Tool Quota Status                                       ║${NC}"
  echo -e "${BOLD}╠═══════════════════════════════════════════════════════════════════════════════════════════════╣${NC}"
  printf "${BOLD}║${NC} %-9s │ %-12s │ %-8s │ %-8s │ %-8s │ %-10s │ %-12s │ %-8s ${BOLD}║${NC}\n" \
    "Tool" "Plan" "Balance" "Daily %" "Period" "Resets In" "Expires" "Status"
  echo -e "${BOLD}╠═══════════════════════════════════════════════════════════════════════════════════════════════╣${NC}"

  # Read and display each tool
  local tools_count
  tools_count=$(jq '.tools | length' "$usage_file")

  for i in $(seq 0 $((tools_count - 1))); do
    local tool balance daily_usage quota_period refill available plan_name plan_expires error
    tool=$(jq -r ".tools[$i].tool" "$usage_file")
    balance=$(jq -r ".tools[$i].balance" "$usage_file")
    daily_usage=$(jq -r ".tools[$i].dailyUsage // \"--\"" "$usage_file")
    quota_period=$(jq -r ".tools[$i].quotaPeriod // \"daily\"" "$usage_file")
    refill=$(jq -r ".tools[$i].refill // empty" "$usage_file")
    available=$(jq -r ".tools[$i].available" "$usage_file")
    plan_name=$(jq -r ".tools[$i].plan.name // \"--\"" "$usage_file")
    plan_expires=$(jq -r ".tools[$i].plan.expiresAt // empty" "$usage_file")
    error=$(jq -r ".tools[$i].error // empty" "$usage_file")

    # Format time until reset
    local resets_in
    resets_in=$(format_time_until "$refill")

    # Format expiration date
    local expires_text
    expires_text=$(format_expiration "$plan_expires")

    # Format daily usage
    local daily_text
    if [ "$daily_usage" = "null" ] || [ "$daily_usage" = "--" ]; then
      daily_text="--"
    else
      daily_text="${daily_usage}%"
    fi

    # Capitalize quota period
    local period_text
    case "$quota_period" in
      daily) period_text="Daily" ;;
      weekly) period_text="Weekly" ;;
      monthly) period_text="Monthly" ;;
      unlimited) period_text="Unlimit" ;;
      *) period_text="$quota_period" ;;
    esac

    # Determine color based on balance and availability
    local color status_text
    if [ "$available" = "true" ]; then
      if [ "$balance" -ge 50 ]; then
        color="${GREEN}"
        status_text="Good"
      elif [ "$balance" -ge 20 ]; then
        color="${YELLOW}"
        status_text="Low"
      else
        color="${RED}"
        status_text="Critical"
      fi
    else
      color="${RED}"
      status_text="Unavail"
    fi

    printf "${BOLD}║${NC} ${color}%-9s${NC} │ %-12s │ %7s%% │ %8s │ %-8s │ %10s │ %-12s │ ${color}%-8s${NC} ${BOLD}║${NC}\n" \
      "$tool" "$plan_name" "$balance" "$daily_text" "$period_text" "$resets_in" "$expires_text" "$status_text"
  done

  echo -e "${BOLD}╚═══════════════════════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  # Summary section
  echo -e "${BOLD}Legend:${NC}"
  echo -e "  ${GREEN}●${NC} Good (>50%)  ${YELLOW}●${NC} Low (20-50%)  ${RED}●${NC} Critical (<20%) or Unavailable"
  echo ""
  echo -e "${CYAN}Last updated: ${timestamp}${NC}"

  # Show best tool recommendation
  local best_tool best_balance
  best_tool=$(jq -r '.tools | map(select(.available == true and .balance > 0)) | sort_by(-.balance) | .[0].tool // empty' "$usage_file")
  best_balance=$(jq -r '.tools | map(select(.available == true and .balance > 0)) | sort_by(-.balance) | .[0].balance // 0' "$usage_file")

  if [ -n "$best_tool" ]; then
    echo -e "${GREEN}Recommended: ${BOLD}$best_tool${NC}${GREEN} ($best_balance% balance)${NC}"
  else
    echo -e "${RED}No tools available with remaining balance${NC}"
  fi
}

# Parse arguments
TOOL="amp"  # Default to amp for backwards compatibility
MAX_ITERATIONS=10
SHOW_QUOTA=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --quota)
      SHOW_QUOTA=true
      shift
      ;;
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    *)
      # Assume it's max_iterations if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# If --quota flag is set, display quota and exit
if [ "$SHOW_QUOTA" = true ]; then
  display_quota_table
  exit 0
fi

# Validate tool choice (auto is valid but will be resolved to a specific tool)
VALID_TOOLS="amp|claude|codex|gemini|copilot|auto"
if [[ ! "$TOOL" =~ ^($VALID_TOOLS)$ ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be one of: $VALID_TOOLS"
  exit 1
fi

# If auto mode, run collection -> selection to determine best tool
if [ "$TOOL" = "auto" ]; then
  TOOL=$(auto_select_tool)
fi

PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Tool: $TOOL - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  # Run the selected tool with the ralph prompt
  PROMPT_FILE="$SCRIPT_DIR/CLAUDE.md"

  case "$TOOL" in
    amp)
      # Amp: use prompt.md for amp-specific instructions
      OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
      ;;
    claude)
      # Claude Code: use --dangerously-skip-permissions for autonomous operation, --print for output
      OUTPUT=$(claude --dangerously-skip-permissions --print < "$PROMPT_FILE" 2>&1 | tee /dev/stderr) || true
      ;;
    codex)
      # Codex: use full-auto approval mode for autonomous operation
      OUTPUT=$(codex --approval-mode full-auto "$(cat "$PROMPT_FILE")" 2>&1 | tee /dev/stderr) || true
      ;;
    gemini)
      # Gemini: use --yolo mode for auto-approval of all actions
      OUTPUT=$(gemini --yolo "$(cat "$PROMPT_FILE")" 2>&1 | tee /dev/stderr) || true
      ;;
    copilot)
      # Copilot: use -p for non-interactive mode with --allow-all for full permissions
      OUTPUT=$(copilot -p "$(cat "$PROMPT_FILE")" --allow-all 2>&1 | tee /dev/stderr) || true
      ;;
  esac
  
  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi
  
  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
