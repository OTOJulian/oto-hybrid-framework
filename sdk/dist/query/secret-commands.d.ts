/**
 * Secret CRUD query commands (SECR-04).
 *
 * API keys are deliberately prohibited in argv because argv is visible in
 * shell history and process listings. `secret-set` accepts secret material
 * only from piped stdin or a silent interactive TTY prompt (D-09), stores it
 * in a 0600 keyfile, and returns masked output only.
 */
import { type IntegrationSlug } from './secrets.js';
import type { QueryResult } from './utils.js';
type SecretInput = NodeJS.ReadStream | (NodeJS.ReadableStream & {
    isTTY?: boolean;
});
interface SecretCommandResult<T> extends QueryResult<T> {
    raw: string;
}
/**
 * Read a secret without ever accepting it through argv.
 *
 * Piped input is collected directly. Interactive input is read through a
 * readline interface whose output hook is muted after the prompt is written,
 * preventing terminal echo of the key.
 */
export declare function readSecretInput(stdin?: SecretInput, stderr?: NodeJS.WriteStream): Promise<string>;
/** Set an integration key from stdin and enable its boolean config flag. */
export declare function secretSet(args: string[], projectDir: string, workstream?: string, stdin?: SecretInput, stderr?: NodeJS.WriteStream): Promise<{
    data: {
        integration: "firecrawl" | "exa" | "brave";
        config_key: "exa_search" | "brave_search" | "firecrawl";
        enabled: boolean;
        keyfile: string;
        masked: string;
    };
}>;
/** Delete an integration keyfile and disable its boolean config flag. */
export declare function secretClear(args: string[], projectDir: string, workstream?: string): Promise<SecretCommandResult<{
    integration: IntegrationSlug;
    config_key: string;
    cleared: true;
    keyfile_existed: boolean;
    enabled: false;
    env_still_set: boolean;
}>>;
interface SecretStatusEntry {
    integration: IntegrationSlug;
    label: string;
    enabled: boolean;
    source: 'env' | 'keyfile' | null;
    env_var: string;
    keyfile: string;
    masked: string;
    shadowed_keyfile: boolean;
    healed: boolean;
}
/** Report masked key sources and flag state for one or every integration. */
export declare function secretStatus(args: string[], projectDir: string, workstream?: string): Promise<SecretCommandResult<{
    integrations: SecretStatusEntry[];
}>>;
export {};
//# sourceMappingURL=secret-commands.d.ts.map