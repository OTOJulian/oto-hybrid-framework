#!/bin/bash
# oto-hook-version: {{OTO_VERSION}}
# oto-validate-commit.sh — PreToolUse hook: enforce Conventional Commits format
# Blocks git commit commands with non-conforming messages (exit 2).
# Allows conforming messages and all non-commit commands (exit 0).
# Uses Node.js for JSON parsing (always available in OTO projects, no jq dependency).
#
# OPT-IN: This hook is a no-op unless config.json has hooks.session_state: true.
# Enable with: "hooks": { "session_state": true } in .oto/config.json

# Check opt-in config — exit silently if not enabled
if [ -f .oto/config.json ]; then
  ENABLED=$(node -e "try{const c=require('./.oto/config.json');process.stdout.write(c.hooks?.session_state===true?'1':'0')}catch{process.stdout.write('0')}" 2>/dev/null)
  if [ "$ENABLED" != "1" ]; then exit 0; fi
else
  exit 0
fi

INPUT=$(cat)

# Extract command from JSON using Node (handles escaping correctly, no jq needed)
CMD=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).tool_input?.command||'')}catch{}})" 2>/dev/null)

# Only check git commit commands. Supports common git options before the
# commit subcommand, for example: git -C repo commit -m "fix: message".
COMMIT_RE='(^|[;&|])[[:space:]]*git([[:space:]]+[^[:space:];&|]+)*[[:space:]]+commit([[:space:]]|$)'
if [[ "$CMD" =~ $COMMIT_RE ]]; then
  # Extract message from -m/--message forms Claude may pass through Bash.
  MSG=""
  DOUBLE_RE='(^|[[:space:]])(-m|--message)[[:space:]]+"([^"]+)"'
  SINGLE_RE="(^|[[:space:]])(-m|--message)[[:space:]]+'([^']+)'"
  EQUALS_RE='(^|[[:space:]])--message=([^[:space:];&|]+)'
  UNQUOTED_RE='(^|[[:space:]])(-m|--message)[[:space:]]+([^[:space:];&|]+)'
  if [[ "$CMD" =~ $DOUBLE_RE ]]; then
    MSG="${BASH_REMATCH[3]}"
  elif [[ "$CMD" =~ $SINGLE_RE ]]; then
    MSG="${BASH_REMATCH[3]}"
  elif [[ "$CMD" =~ $EQUALS_RE ]]; then
    MSG="${BASH_REMATCH[2]}"
  elif [[ "$CMD" =~ $UNQUOTED_RE ]]; then
    MSG="${BASH_REMATCH[3]}"
  else
    echo '{"decision":"block","reason":"Commit message must be provided with -m/--message so oto can validate Conventional Commits."}'
    exit 2
  fi

  if [ -n "$MSG" ]; then
    SUBJECT=$(echo "$MSG" | head -1)
    # Validate Conventional Commits format
    if ! [[ "$SUBJECT" =~ ^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?:[[:space:]].+ ]]; then
      echo '{"decision": "block", "reason": "Commit message must follow Conventional Commits: <type>(<scope>): <subject>. Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore. Subject must be <=72 chars, lowercase, imperative mood, no trailing period."}'
      exit 2
    fi
    if [ ${#SUBJECT} -gt 72 ]; then
      echo '{"decision": "block", "reason": "Commit subject must be 72 characters or less."}'
      exit 2
    fi
  fi

  if [ ! -f .oto/STATE.md ]; then
    echo '{"decision":"block","reason":"Commit blocked: no active phase found in .oto/STATE.md."}'
    exit 2
  fi

  PHASE_LINE=$(grep -m 1 '^Phase:' .oto/STATE.md 2>/dev/null || true)
  PLAN_LINE=$(grep -m 1 '^Plan:' .oto/STATE.md 2>/dev/null || true)
  PHASE_VALUE="${PHASE_LINE#Phase:}"
  PLAN_VALUE="${PLAN_LINE#Plan:}"
  PHASE_VALUE=$(echo "$PHASE_VALUE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  PLAN_VALUE=$(echo "$PLAN_VALUE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  if [ -z "$PHASE_LINE" ] || [[ "$PHASE_VALUE" == *"Not started"* ]] || [[ "$PHASE_VALUE" == *"none active"* ]] || [[ "$PHASE_VALUE" == *"COMPLETE"* ]] || [[ "$PHASE_VALUE" == *"completed"* ]]; then
    echo '{"decision":"block","reason":"Commit blocked: no active phase found in .oto/STATE.md."}'
    exit 2
  fi

  if [ -z "$PLAN_LINE" ] || [ -z "$PLAN_VALUE" ] || [ "$PLAN_VALUE" = "—" ] || [ "$PLAN_VALUE" = "-" ] || [ "$PLAN_VALUE" = "N/A" ] || [ "$PLAN_VALUE" = "Not started" ]; then
    echo '{"decision":"block","reason":"Commit blocked: no active plan found in .oto/STATE.md."}'
    exit 2
  fi
fi

exit 0
