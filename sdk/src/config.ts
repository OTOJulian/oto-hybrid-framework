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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GitConfig {
  branching_strategy: string;
  phase_branch_template: string;
  milestone_branch_template: string;
  quick_branch_template: string | null;
}

export interface WorkflowConfig {
  research: boolean;
  plan_check: boolean;
  verifier: boolean;
  nyquist_validation: boolean;
  /** Mirrors gsd-tools flat `config.tdd_mode` (from `workflow.tdd_mode`). */
  tdd_mode: boolean;
  auto_advance: boolean;
  node_repair: boolean;
  node_repair_budget: number;
  ui_phase: boolean;
  ui_safety_gate: boolean;
  text_mode: boolean;
  research_before_questions: boolean;
  discuss_mode: string;
  skip_discuss: boolean;
  /** Maximum self-discuss passes in auto/headless mode before forcing proceed. Default: 3. */
  max_discuss_passes: number;
  /** Subagent timeout in ms (matches `get-shit-done/bin/lib/core.cjs` default 300000). */
  subagent_timeout: number;
  /**
   * Issue #2492. When true (default), enforces that every trackable decision in
   * CONTEXT.md `<decisions>` is referenced by at least one plan (translation
   * gate, blocking) and reports decisions not honored by shipped artifacts at
   * verify-phase (validation gate, non-blocking). Set false to disable both.
   */
  context_coverage_gate: boolean;
}

export interface HooksConfig {
  context_warnings: boolean;
}

export interface GSDConfig {
  model_profile: string;
  commit_docs: boolean;
  parallelization: boolean;
  search_gitignored: boolean;
  brave_search: boolean;
  firecrawl: boolean;
  exa_search: boolean;
  git: GitConfig;
  workflow: WorkflowConfig;
  hooks: HooksConfig;
  agent_skills: Record<string, unknown>;
  /** Project slug for branch templates; mirrors gsd-tools `config.project_code`. */
  project_code?: string | null;
  /** Interactive vs headless; mirrors gsd-tools flat `config.mode`. */
  mode?: string;
  /** Internal auto-chain flag; mirrors gsd-tools `config._auto_chain_active`. */
  _auto_chain_active?: boolean;
  [key: string]: unknown;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const CONFIG_DEFAULTS: GSDConfig = {
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
async function loadUserDefaults(): Promise<Record<string, unknown>> {
  const home = process.env.GSD_HOME || homedir();
  const defaultsPath = join(home, '.gsd', 'defaults.json');
  let raw: string;
  try {
    raw = await readFile(defaultsPath, 'utf-8');
  } catch {
    return {};
  }
  const trimmed = raw.trim();
  if (trimmed === '') return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function scrubIntegrationStrings(obj: Record<string, unknown>): Record<string, unknown> {
  // OTO Phase 14 gap-closure (WR-05 / SECR-01): the loader contract is
  // boolean-only for integration flags on the EFFECTIVE view. Migration
  // normally coerces non-booleans, but if its rewrite fails the raw value
  // would escape — normalize every present non-boolean to Boolean(value).
  // (Non-empty string → true, '' → false, object/array → true, null/0 → false.)
  // This also applies on the ~/.gsd fallback paths; never persist this view.
  for (const k of ['exa_search', 'brave_search', 'firecrawl'] as const) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && typeof obj[k] !== 'boolean') {
      obj[k] = Boolean(obj[k]);
    }
  }
  return obj;
}

function deepMergeConfig(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(overlay)) {
    const overlayValue = overlay[key];
    if (overlayValue !== null && typeof overlayValue === 'object' && !Array.isArray(overlayValue)) {
      const baseValue = base[key];
      const nestedBase = baseValue !== null && typeof baseValue === 'object' && !Array.isArray(baseValue)
        ? baseValue as Record<string, unknown>
        : {};
      result[key] = deepMergeConfig(nestedBase, overlayValue as Record<string, unknown>);
    } else {
      result[key] = overlayValue;
    }
  }
  return result;
}

export async function loadConfig(projectDir: string, workstream?: string): Promise<GSDConfig> {
  const configPath = join(projectDir, relPlanningPath(projectDir, workstream), 'config.json');
  const rootConfigPath = join(projectDir, planningRootName(projectDir), 'config.json');

  // Phase 14 (SECR-03): self-heal legacy integration key strings → ~/.oto keyfiles (D-01).
  try { await migrateLegacyIntegrationKeys(configPath); } catch { /* never block reads */ }

  // Phase 14 gap-closure (SECR-03, CR-04): the root layer is a possible fallback — heal it before any read.
  if (workstream) {
    try { await migrateLegacyIntegrationKeys(rootConfigPath); } catch { /* never block reads */ }
  }

  let raw: string;
  let rawPath = configPath;
  let rootRaw: string | null = null;
  let projectConfigFound = false;
  let workstreamConfigFound = false;
  try {
    raw = await readFile(configPath, 'utf-8');
    projectConfigFound = true;
    workstreamConfigFound = workstream !== undefined;
  } catch {
    // If workstream config missing, fall back to root config
    if (workstream) {
      try {
        raw = await readFile(rootConfigPath, 'utf-8');
        rawPath = rootConfigPath;
        projectConfigFound = true;
      } catch {
        raw = '';
      }
    } else {
      raw = '';
    }
  }

  // A present workstream config overlays (rather than replaces) the root
  // config, matching the CJS loader's executable semantics (WR-09).
  if (workstreamConfigFound) {
    try {
      rootRaw = await readFile(rootConfigPath, 'utf-8');
    } catch {
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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`Malformed JSON in config file at ${rawPath}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Config at ${rawPath} must be a JSON object`);
  }

  // Phase 14 gap-closure (SECR-01): loader contract is boolean-only for integration flags.
  scrubIntegrationStrings(parsed);

  if (rootRaw !== null && rootRaw.trim() !== '') {
    let rootParsed: Record<string, unknown>;
    try {
      rootParsed = JSON.parse(rootRaw);
    } catch {
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

function mergeDefaults(parsed: Record<string, unknown>): GSDConfig {
  return {
    ...structuredClone(CONFIG_DEFAULTS),
    ...parsed,
    git: {
      ...CONFIG_DEFAULTS.git,
      ...(parsed.git as Partial<GitConfig> ?? {}),
    },
    workflow: {
      ...CONFIG_DEFAULTS.workflow,
      ...(parsed.workflow as Partial<WorkflowConfig> ?? {}),
    },
    hooks: {
      ...CONFIG_DEFAULTS.hooks,
      ...(parsed.hooks as Partial<HooksConfig> ?? {}),
    },
    agent_skills: {
      ...CONFIG_DEFAULTS.agent_skills,
      ...(parsed.agent_skills as Record<string, unknown> ?? {}),
    },
  };
}
