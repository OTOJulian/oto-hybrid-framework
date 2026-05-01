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
CMD_TO_VALIDATE="$CMD" node <<'NODE' >/dev/null 2>&1
const cmd = process.env.CMD_TO_VALIDATE || '';

function splitSegments(input) {
  const segments = [];
  let current = '';
  let quote = null;
  let escaped = false;

  const push = () => {
    if (current.trim()) segments.push(current);
    current = '';
  };

  for (const ch of input) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      current += ch;
      escaped = true;
      continue;
    }
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      current += ch;
      quote = ch;
      continue;
    }
    if (ch === ';' || ch === '&' || ch === '|') {
      push();
      continue;
    }
    current += ch;
  }

  push();
  return segments;
}

function tokenize(segment) {
  const tokens = [];
  let current = '';
  let quote = null;
  let escaped = false;
  let active = false;

  const push = () => {
    if (active) tokens.push(current);
    current = '';
    active = false;
  };

  for (const ch of segment) {
    if (escaped) {
      current += ch;
      active = true;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      active = true;
      continue;
    }
    if (quote === "'") {
      if (ch === "'") quote = null;
      else {
        current += ch;
        active = true;
      }
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = null;
      else {
        current += ch;
        active = true;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      active = true;
      continue;
    }
    if (/\s/.test(ch)) {
      push();
      continue;
    }
    current += ch;
    active = true;
  }

  push();
  return tokens;
}

function gitSubcommandIndex(tokens) {
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === '--') return -1;

    const optionWithValue = [
      '-C',
      '-c',
      '--git-dir',
      '--work-tree',
      '--namespace',
      '--exec-path',
      '--super-prefix',
    ];
    if (optionWithValue.includes(token)) {
      i += 1;
      continue;
    }

    if (
      token.startsWith('--git-dir=') ||
      token.startsWith('--work-tree=') ||
      token.startsWith('--namespace=') ||
      token.startsWith('--exec-path=') ||
      token.startsWith('--super-prefix=')
    ) {
      continue;
    }

    if (
      token === '--bare' ||
      token === '--no-pager' ||
      token === '--paginate' ||
      token === '--no-optional-locks' ||
      token === '--literal-pathspecs' ||
      token === '--glob-pathspecs' ||
      token === '--noglob-pathspecs' ||
      token === '--icase-pathspecs'
    ) {
      continue;
    }

    return token.startsWith('-') ? -1 : i;
  }

  return -1;
}

let sawCommit = false;
const messages = [];

for (const segment of splitSegments(cmd)) {
  const tokens = tokenize(segment);
  if (tokens[0] !== 'git') continue;

  const commitIndex = gitSubcommandIndex(tokens);
  if (commitIndex === -1 || tokens[commitIndex] !== 'commit') continue;
  sawCommit = true;

  let message = null;
  for (let i = commitIndex + 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === '-m' || token === '--message') {
      message = i + 1 < tokens.length ? tokens[i + 1] : '';
      break;
    }
    if (token.startsWith('--message=')) {
      message = token.slice('--message='.length);
      break;
    }
  }

  if (!message) process.exit(11);
  messages.push(message);
}

if (!sawCommit) process.exit(10);

const conventional = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?:\s.+/;
for (const message of messages) {
  const subject = String(message).split(/\r?\n/, 1)[0];
  if (!conventional.test(subject)) process.exit(12);
  if (subject.length > 72) process.exit(13);
}
NODE
COMMIT_STATUS=$?

if [ "$COMMIT_STATUS" -eq 10 ]; then
  exit 0
fi

if [ "$COMMIT_STATUS" -eq 11 ]; then
  echo '{"decision":"block","reason":"Commit message must be provided with -m/--message so oto can validate Conventional Commits."}'
  exit 2
fi

if [ "$COMMIT_STATUS" -eq 12 ]; then
  echo '{"decision": "block", "reason": "Commit message must follow Conventional Commits: <type>(<scope>): <subject>. Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore. Subject must be <=72 chars, lowercase, imperative mood, no trailing period."}'
  exit 2
fi

if [ "$COMMIT_STATUS" -eq 13 ]; then
  echo '{"decision": "block", "reason": "Commit subject must be 72 characters or less."}'
  exit 2
fi

if [ "$COMMIT_STATUS" -ne 0 ]; then
  echo '{"decision":"block","reason":"Unable to parse git commit command for validation."}'
  exit 2
fi

if [ "$COMMIT_STATUS" -eq 0 ]; then

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
