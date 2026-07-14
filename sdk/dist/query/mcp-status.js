import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { planningPaths } from './helpers.js';
import { detectKeySource } from './secrets.js';
const RUNTIMES = {
    claude: { env: 'CLAUDE_CONFIG_DIR', segment: '.claude', file: '.claude.json' },
    codex: { env: 'CODEX_HOME', segment: '.codex', file: 'config.toml' },
    gemini: { env: 'GEMINI_CONFIG_DIR', segment: '.gemini', file: 'settings.json' },
};
function expandTilde(value, homeDir) {
    return value === '~' || value.startsWith('~/') ? join(homeDir, value.slice(1)) : value;
}
export function resolveRuntimeMcpTarget(runtimeName, { env = process.env, homeDir = homedir() } = {}) {
    const runtime = RUNTIMES[runtimeName];
    const configured = env[runtime.env];
    const configDir = configured
        ? expandTilde(configured, homeDir)
        : join(homeDir, runtime.segment);
    return {
        configDir,
        target: runtimeName === 'claude'
            ? join(configured ? expandTilde(configured, homeDir) : homeDir, runtime.file)
            : join(configDir, runtime.file),
    };
}
function stableStringify(value) {
    if (Array.isArray(value))
        return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}
function parseJsonc(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return JSON.parse(text
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^[ \t]*\/\/.*$/gm, ''));
    }
}
const MCP_BEGIN = '# === BEGIN OTO MCP ===';
const MCP_END = '# === END OTO MCP ===';
function codexBlockInner(text) {
    const start = text.indexOf(MCP_BEGIN);
    const finish = text.indexOf(MCP_END, start + MCP_BEGIN.length);
    if (start === -1 || finish === -1 || finish < start)
        return null;
    let inner = text.slice(start + MCP_BEGIN.length, finish);
    if (inner.startsWith('\n'))
        inner = inner.slice(1);
    if (inner.endsWith('\n'))
        inner = inner.slice(0, -1);
    return inner;
}
function hasExternalCodexEntry(text) {
    const start = text.indexOf(MCP_BEGIN);
    const finish = text.indexOf(MCP_END, start + MCP_BEGIN.length);
    const outside = start === -1 || finish === -1
        ? text
        : text.slice(0, start) + text.slice(finish + MCP_END.length);
    return /^\s*\[\[?\s*mcp_servers\.exa\s*\]?\]\s*$/m.test(outside);
}
function readLiveEntry(runtimeName, target) {
    let text;
    try {
        text = readFileSync(target, 'utf8');
    }
    catch {
        return { entry: null, external: false };
    }
    if (runtimeName === 'codex') {
        return { entry: codexBlockInner(text), external: hasExternalCodexEntry(text) };
    }
    try {
        const parsed = (runtimeName === 'gemini' ? parseJsonc(text) : JSON.parse(text));
        return { entry: parsed?.mcpServers?.exa ?? null, external: false };
    }
    catch {
        return { entry: null, external: false, detail: 'unparseable' };
    }
}
// OTO Phase 15 gap closure (WR-01): CJS-equivalent install-state validation (port of bin/lib/install-state.cjs) — fingerprints establish ownership only through schema-valid state.
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isSafeRelativePath(p) {
    return !isAbsolute(p) && !p.split(/[\\/]+/).includes('..');
}
export function validateInstallState(state) {
    if (!isPlainObject(state))
        return false;
    if (state.version !== 1)
        return false;
    if (typeof state.oto_version !== 'string')
        return false;
    if (typeof state.installed_at !== 'string')
        return false;
    if (!['claude', 'codex', 'gemini'].includes(state.runtime))
        return false;
    if (typeof state.config_dir !== 'string')
        return false;
    if (!Array.isArray(state.files))
        return false;
    for (const f of state.files) {
        if (!isPlainObject(f))
            return false;
        if (typeof f.path !== 'string' || f.path.length === 0 || !isSafeRelativePath(f.path))
            return false;
        if (typeof f.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(f.sha256))
            return false;
    }
    const instruction = state.instruction_file;
    if (!isPlainObject(instruction))
        return false;
    if (typeof instruction.path !== 'string' || instruction.path.length === 0 || !isSafeRelativePath(instruction.path))
        return false;
    if (state.hooks !== undefined) {
        if (!isPlainObject(state.hooks) || typeof state.hooks.version !== 'string')
            return false;
    }
    if (state.mcp !== undefined) {
        if (!isPlainObject(state.mcp))
            return false;
        for (const record of Object.values(state.mcp)) {
            if (!isPlainObject(record))
                return false;
            if (typeof record.target !== 'string' || record.target.length === 0)
                return false;
            if (typeof record.registered_at !== 'string')
                return false;
            if (!isPlainObject(record.entry) && typeof record.entry !== 'string')
                return false;
        }
    }
    return true;
}
function readFingerprint(configDir) {
    try {
        const state = JSON.parse(readFileSync(join(configDir, 'oto', '.install.json'), 'utf8'));
        if (!validateInstallState(state))
            return null;
        return state.mcp?.exa?.entry ?? null;
    }
    catch {
        return null;
    }
}
export function classifyExaRegistration(runtimeName, opts = {}) {
    const { configDir, target } = resolveRuntimeMcpTarget(runtimeName, opts);
    if (!existsSync(configDir))
        return { runtime: runtimeName, status: 'not-installed', target };
    const record = readFingerprint(configDir);
    const live = readLiveEntry(runtimeName, target);
    let status;
    if (live.external)
        status = 'user-owned';
    else if (live.entry !== null && record !== null) {
        status = stableStringify(live.entry) === stableStringify(record) ? 'oto-managed' : 'drifted';
    }
    else if (live.entry !== null)
        status = 'user-owned';
    else if (record !== null)
        status = 'missing-but-expected';
    else
        status = 'not-registered';
    return { runtime: runtimeName, status, target, ...(live.detail ? { detail: live.detail } : {}) };
}
export function checkExaCoherence({ exaSearchEnabled, keySource, statuses, }) {
    const registered = statuses.some(({ status }) => ['oto-managed', 'user-owned', 'drifted'].includes(status));
    const otoOwned = statuses.some(({ status }) => ['oto-managed', 'drifted'].includes(status));
    const warnings = [];
    if (exaSearchEnabled && !registered) {
        warnings.push('oto: exa_search is enabled but the exa MCP server is not registered in any runtime — run /oto-settings-integrations');
    }
    if (otoOwned && keySource === null) {
        warnings.push('oto: exa MCP server is registered but no usable Exa API key was detected — run /oto-settings-integrations');
    }
    return warnings;
}
function readExaSearchEnabled(projectDir, workstream) {
    try {
        const config = JSON.parse(readFileSync(planningPaths(projectDir, workstream).config, 'utf8'));
        return config.exa_search === true;
    }
    catch {
        return false;
    }
}
export const mcpStatus = async (_args, projectDir, workstream) => {
    const runtimes = Object.keys(RUNTIMES).map((runtime) => classifyExaRegistration(runtime));
    const warnings = checkExaCoherence({
        exaSearchEnabled: readExaSearchEnabled(projectDir, workstream),
        keySource: detectKeySource('exa').source,
        statuses: runtimes,
    });
    const raw = [
        ...runtimes.map(({ runtime, status, target }) => `exa MCP [${runtime}]: ${status} (${target})`),
        ...warnings,
    ].join('\n');
    return { data: { runtimes, warnings }, raw };
};
//# sourceMappingURL=mcp-status.js.map