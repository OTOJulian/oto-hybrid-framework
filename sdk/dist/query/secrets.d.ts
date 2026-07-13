/**
 * SDK-side integration secret storage.
 *
 * This module mirrors `oto/bin/lib/secrets.cjs` as part of Phase 14's
 * both-write-paths discipline. Keep both implementations behavior-identical:
 * committed config stores booleans while API keys live in env vars or 0600
 * keyfiles under ~/.oto.
 */
export declare const INTEGRATIONS: {
    readonly exa: {
        readonly configKey: "exa_search";
        readonly envVar: "EXA_API_KEY";
        readonly keyfileName: "exa_api_key";
        readonly label: "Exa";
    };
    readonly brave: {
        readonly configKey: "brave_search";
        readonly envVar: "BRAVE_API_KEY";
        readonly keyfileName: "brave_api_key";
        readonly label: "Brave";
    };
    readonly firecrawl: {
        readonly configKey: "firecrawl";
        readonly envVar: "FIRECRAWL_API_KEY";
        readonly keyfileName: "firecrawl_api_key";
        readonly label: "Firecrawl";
    };
};
export type IntegrationSlug = keyof typeof INTEGRATIONS;
type Integration = (typeof INTEGRATIONS)[IntegrationSlug];
type IntegrationMatch = Integration & {
    slug: IntegrationSlug;
};
export declare function integrationForConfigKey(configKey: string): IntegrationMatch | null;
export declare function keyfilePath(slug: string, baseDir?: string): string;
export declare function writeKeyfile(slug: string, value: string, baseDir?: string): void;
export interface KeyfileValue {
    value: string;
    healed: boolean;
}
export declare function readKeyfile(slug: string, baseDir?: string): KeyfileValue | null;
export declare function deleteKeyfile(slug: string, baseDir?: string): boolean;
export interface KeySource {
    source: 'env' | 'keyfile' | null;
    envVar: string;
    keyfile: string;
    masked: string;
    shadowedKeyfile: boolean;
}
export declare function detectKeySource(slug: string, baseDir?: string): KeySource;
export declare function maskSecret(value: unknown): string;
export type IntegrationValidation = {
    ok: true;
} | {
    ok: false;
    message: string;
};
export declare function validateIntegrationValue(configKey: string, value: unknown): IntegrationValidation;
export declare function warnIfNoKeyDetected(configKey: string, baseDir?: string): void;
/**
 * Validate/migrate the integration fields of a fully merged new-project
 * config BEFORE any write (Phase 14 gap-closure, CR-01 / SECR-02).
 *
 * Mirrors `reconcileNewProjectIntegrations` in oto/bin/lib/secrets.cjs
 * (both-write-paths discipline) with two SDK-specific differences:
 * - Caller-supplied non-boolean values throw GSDError (Validation) instead
 *   of returning { ok:false } — the sanitized D-05 message never echoes the
 *   value.
 * - There is NO defaults-file write-back of any kind: the SDK's D11 defaults
 *   source belongs to the separate GSD install and is READ-ONLY per D-08.
 *   The string stays there and each subsequent new-project run re-migrates
 *   with a repeat masked notice (accepted posture, T-14-05-05).
 *
 * Trusted global-default strings become 0600 keyfiles under ~/.oto with the
 * keyfile-wins conflict policy (D-02); other non-booleans are coerced via
 * Boolean(value). Mutates `merged` in place.
 */
/** Phase 14 gap-closure (CR-02): first offending nested dot-path or null.
 *  Empty strings included. The VALUE is never returned. Mirrors
 *  findNestedIntegrationString in oto/bin/lib/secrets.cjs. */
export declare function findNestedIntegrationString(node: Record<string, unknown>, prefix: string): string | null;
/**
 * Two-phase new-project reconciliation mirroring oto/bin/lib/secrets.cjs.
 * Phase A throws Validation errors after a side-effect-free deep scan and
 * caller/default classification. Phase B compensates every attempted write
 * before throwing an Execution error. D-08 keeps ~/.gsd defaults read-only.
 */
export declare function reconcileNewProjectIntegrations(merged: Record<string, unknown>, userChoices: Record<string, unknown>, baseDir?: string, rawDefaults?: Record<string, unknown>): {
    migrated: string[];
};
export interface MigrationResult {
    migrated: string[];
    conflicts: string[];
}
/**
 * Migrate legacy integration strings while holding the config mutator lock.
 *
 * The shared SDK lock force-acquires after roughly two seconds against a live
 * lock (existing state-mutation semantics). Callers already inside that lock
 * must pass `alreadyLocked` to join the transaction without double-acquiring.
 */
export declare function migrateLegacyIntegrationKeys(configPath: string, baseDir?: string, opts?: {
    alreadyLocked?: boolean;
}): Promise<MigrationResult>;
export {};
//# sourceMappingURL=secrets.d.ts.map