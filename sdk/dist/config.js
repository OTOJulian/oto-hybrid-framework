/**
 * Config reader — loads `.planning/config.json` and merges with defaults.
 *
 * Mirrors the default structure from `get-shit-done/bin/lib/config.cjs`
 * `buildNewProjectConfig()`.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { relPlanningPath } from './workstream-utils.js';
import { planningRootName } from './query/helpers.js';
import { migrateLegacyIntegrationKeys } from './query/secrets.js';
// ─── Defaults ────────────────────────────────────────────────────────────────
export const CONFIG_DEFAULTS = {
    model_profile: 'balanced',
    commit_docs: true,
    parallelization: true,
    search_gitignored: false,
    brave_search: false,
    firecrawl: false,
    exa_search: false,
    git: {
        branching_strategy: 'none',
        phase_branch_template: 'gsd/phase-{phase}-{slug}',
        milestone_branch_template: 'gsd/{milestone}-{slug}',
        quick_branch_template: null,
    },
    workflow: {
        research: true,
        plan_check: true,
        verifier: true,
        nyquist_validation: true,
        tdd_mode: false,
        auto_advance: false,
        node_repair: true,
        node_repair_budget: 2,
        ui_phase: true,
        ui_safety_gate: true,
        text_mode: false,
        research_before_questions: false,
        discuss_mode: 'discuss',
        skip_discuss: false,
        max_discuss_passes: 3,
        subagent_timeout: 300000,
        context_coverage_gate: true,
    },
    hooks: {
        context_warnings: true,
    },
    agent_skills: {},
    project_code: null,
    mode: 'interactive',
    _auto_chain_active: false,
};
// ─── Loader ──────────────────────────────────────────────────────────────────
/**
 * Load project config from `.planning/config.json`, merging with defaults.
 * When project config is missing or empty, layers user defaults
 * (`~/.gsd/defaults.json`) over built-in defaults.
 * Throws on malformed JSON with a helpful error message.
 */
/**
 * Read user-level defaults from `~/.gsd/defaults.json` (or `$GSD_HOME/.gsd/`
 * when set). Returns `{}` when the file is missing, empty, or malformed —
 * matches CJS behavior in `get-shit-done/bin/lib/core.cjs` (#1683, #2652).
 */
async function loadUserDefaults() {
    const home = process.env.GSD_HOME || homedir();
    const defaultsPath = join(home, '.gsd', 'defaults.json');
    let raw;
    try {
        raw = await readFile(defaultsPath, 'utf-8');
    }
    catch {
        return {};
    }
    const trimmed = raw.trim();
    if (trimmed === '')
        return {};
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return {};
        }
        return parsed;
    }
    catch {
        return {};
    }
}
function scrubIntegrationStrings(obj) {
    // OTO Phase 14 gap-closure (WR-05 / SECR-01): the loader contract is
    // boolean-only for integration flags on the EFFECTIVE view. Migration
    // normally coerces non-booleans, but if its rewrite fails the raw value
    // would escape — normalize every present non-boolean to Boolean(value).
    // (Non-empty string → true, '' → false, object/array → true, null/0 → false.)
    // This also applies on the ~/.gsd fallback paths; never persist this view.
    for (const k of ['exa_search', 'brave_search', 'firecrawl']) {
        if (Object.prototype.hasOwnProperty.call(obj, k) && typeof obj[k] !== 'boolean') {
            obj[k] = Boolean(obj[k]);
        }
    }
    return obj;
}
function deepMergeConfig(base, overlay) {
    const result = { ...base };
    for (const key of Object.keys(overlay)) {
        const overlayValue = overlay[key];
        if (overlayValue !== null && typeof overlayValue === 'object' && !Array.isArray(overlayValue)) {
            const baseValue = base[key];
            const nestedBase = baseValue !== null && typeof baseValue === 'object' && !Array.isArray(baseValue)
                ? baseValue
                : {};
            result[key] = deepMergeConfig(nestedBase, overlayValue);
        }
        else {
            result[key] = overlayValue;
        }
    }
    return result;
}
export async function loadConfig(projectDir, workstream) {
    const configPath = join(projectDir, relPlanningPath(projectDir, workstream), 'config.json');
    const rootConfigPath = join(projectDir, planningRootName(projectDir), 'config.json');
    // Phase 14 (SECR-03): self-heal legacy integration key strings → ~/.oto keyfiles (D-01).
    try {
        await migrateLegacyIntegrationKeys(configPath);
    }
    catch { /* never block reads */ }
    // Phase 14 gap-closure (SECR-03, CR-04): the root layer is a possible fallback — heal it before any read.
    if (workstream) {
        try {
            await migrateLegacyIntegrationKeys(rootConfigPath);
        }
        catch { /* never block reads */ }
    }
    let raw;
    let rawPath = configPath;
    let rootRaw = null;
    let projectConfigFound = false;
    let workstreamConfigFound = false;
    try {
        raw = await readFile(configPath, 'utf-8');
        projectConfigFound = true;
        workstreamConfigFound = workstream !== undefined;
    }
    catch {
        // If workstream config missing, fall back to root config
        if (workstream) {
            try {
                raw = await readFile(rootConfigPath, 'utf-8');
                rawPath = rootConfigPath;
                projectConfigFound = true;
            }
            catch {
                raw = '';
            }
        }
        else {
            raw = '';
        }
    }
    // A present workstream config overlays (rather than replaces) the root
    // config, matching the CJS loader's executable semantics (WR-09).
    if (workstreamConfigFound) {
        try {
            rootRaw = await readFile(rootConfigPath, 'utf-8');
        }
        catch {
            rootRaw = null;
        }
    }
    // Pre-project context: no .planning/config.json exists. Layer user-level
    // defaults from ~/.gsd/defaults.json over built-in defaults. Mirrors the
    // CJS fall-back branch in get-shit-done/bin/lib/core.cjs:421 (#1683) so
    // SDK-dispatched init queries (e.g. resolveModel in Codex installs, #2652)
    // honor user-level knobs like `resolve_model_ids: "omit"`.
    if (!projectConfigFound) {
        const userDefaults = await loadUserDefaults();
        return mergeDefaults(scrubIntegrationStrings({ ...userDefaults }));
    }
    const trimmed = raw.trim();
    if (trimmed === '') {
        // Empty project config — treat as no project config (CJS core.cjs
        // catches JSON.parse on empty and falls through to the pre-project path).
        const userDefaults = await loadUserDefaults();
        return mergeDefaults(scrubIntegrationStrings({ ...userDefaults }));
    }
    let parsed;
    try {
        parsed = JSON.parse(trimmed);
    }
    catch {
        throw new Error(`Malformed JSON in config file at ${rawPath}`);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error(`Config at ${rawPath} must be a JSON object`);
    }
    // Phase 14 gap-closure (SECR-01): loader contract is boolean-only for integration flags.
    scrubIntegrationStrings(parsed);
    if (rootRaw !== null && rootRaw.trim() !== '') {
        let rootParsed;
        try {
            rootParsed = JSON.parse(rootRaw);
        }
        catch {
            throw new Error(`Malformed JSON in config file at ${rootConfigPath}`);
        }
        if (typeof rootParsed !== 'object' || rootParsed === null || Array.isArray(rootParsed)) {
            throw new Error(`Config at ${rootConfigPath} must be a JSON object`);
        }
        parsed = deepMergeConfig(scrubIntegrationStrings(rootParsed), parsed);
    }
    // Project config exists — user-level defaults are ignored (CJS parity).
    // `buildNewProjectConfig` already baked them into config.json at /gsd:new-project.
    return mergeDefaults(parsed);
}
function mergeDefaults(parsed) {
    return {
        ...structuredClone(CONFIG_DEFAULTS),
        ...parsed,
        git: {
            ...CONFIG_DEFAULTS.git,
            ...(parsed.git ?? {}),
        },
        workflow: {
            ...CONFIG_DEFAULTS.workflow,
            ...(parsed.workflow ?? {}),
        },
        hooks: {
            ...CONFIG_DEFAULTS.hooks,
            ...(parsed.hooks ?? {}),
        },
        agent_skills: {
            ...CONFIG_DEFAULTS.agent_skills,
            ...(parsed.agent_skills ?? {}),
        },
    };
}
//# sourceMappingURL=config.js.map