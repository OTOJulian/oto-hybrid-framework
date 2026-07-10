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
export interface MigrationResult {
    migrated: string[];
    conflicts: string[];
}
export declare function migrateLegacyIntegrationKeys(configPath: string, baseDir?: string): Promise<MigrationResult>;
export {};
//# sourceMappingURL=secrets.d.ts.map