import type { QueryHandler } from './utils.js';
export type RuntimeName = 'claude' | 'codex' | 'gemini';
export type RegistrationStatus = 'not-installed' | 'not-registered' | 'oto-managed' | 'user-owned' | 'drifted' | 'missing-but-expected';
export interface RuntimeStatus {
    runtime: RuntimeName;
    status: RegistrationStatus;
    target: string;
    detail?: 'unparseable';
}
export interface StatusOptions {
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    homeDir?: string;
}
export declare function resolveRuntimeMcpTarget(runtimeName: RuntimeName, { env, homeDir }?: StatusOptions): {
    configDir: string;
    target: string;
};
export declare function classifyExaRegistration(runtimeName: RuntimeName, opts?: StatusOptions): RuntimeStatus;
export declare function checkExaCoherence({ exaSearchEnabled, keySource, statuses, }: {
    exaSearchEnabled: boolean;
    keySource: 'env' | 'keyfile' | null;
    statuses: RuntimeStatus[];
}): string[];
export declare const mcpStatus: QueryHandler;
//# sourceMappingURL=mcp-status.d.ts.map