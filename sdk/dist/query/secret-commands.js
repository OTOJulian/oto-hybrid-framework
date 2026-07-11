/**
 * Secret CRUD query commands (SECR-04).
 *
 * API keys are deliberately prohibited in argv because argv is visible in
 * shell history and process listings. `secret-set` accepts secret material
 * only from piped stdin or a silent interactive TTY prompt (D-09), stores it
 * in a 0600 keyfile, and returns masked output only.
 */
import { accessSync, constants, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { ErrorClassification, GSDError } from '../errors.js';
import { planningPaths } from './helpers.js';
import { configSet } from './config-mutation.js';
import { INTEGRATIONS, deleteKeyfile, detectKeySource, maskSecret, migrateLegacyIntegrationKeys, readKeyfile, writeKeyfile, } from './secrets.js';
const INTEGRATION_SLUGS = Object.keys(INTEGRATIONS);
/**
 * Read a secret without ever accepting it through argv.
 *
 * Piped input is collected directly. Interactive input is read through a
 * readline interface whose output hook is muted after the prompt is written,
 * preventing terminal echo of the key.
 */
export async function readSecretInput(stdin = process.stdin, stderr = process.stderr) {
    let raw;
    if (stdin.isTTY) {
        raw = await new Promise((resolve, reject) => {
            const rl = createInterface({ input: stdin, output: stderr, terminal: true });
            const muted = rl;
            stderr.write('Enter API key (input hidden): ');
            muted._writeToOutput = () => { };
            const onError = (error) => {
                rl.close();
                reject(error);
            };
            stdin.once('error', onError);
            rl.once('line', (line) => {
                stdin.removeListener('error', onError);
                stderr.write('\n');
                rl.close();
                resolve(line);
            });
            rl.once('SIGINT', () => {
                stdin.removeListener('error', onError);
                rl.close();
                reject(new GSDError('API key entry cancelled', ErrorClassification.Interruption));
            });
        });
    }
    else {
        raw = await new Promise((resolve, reject) => {
            const chunks = [];
            stdin.on('data', (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            stdin.once('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            stdin.once('error', reject);
        });
    }
    const secret = raw.trim();
    if (secret === '') {
        throw new GSDError('empty API key — nothing written', ErrorClassification.Validation);
    }
    if (/\s/.test(secret)) {
        throw new GSDError('API key contains whitespace — aborting', ErrorClassification.Validation);
    }
    return secret;
}
function resolveSlug(arg) {
    const slug = (arg ?? '').trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(INTEGRATIONS, slug)) {
        throw new GSDError(`unknown integration '${arg ?? ''}' — valid: ${INTEGRATION_SLUGS.join(', ')}`, ErrorClassification.Validation);
    }
    return slug;
}
/**
 * Fail fast when the config destination cannot accept a flag update (CR-03).
 *
 * Detecting EISDIR/EACCES faults BEFORE any keyfile byte is mutated keeps the
 * keyfile + config flag pair transactional: a doomed config write can never
 * orphan a fresh 0600 keyfile or strand a deleted credential.
 */
function preflightConfigDestination(projectDir, workstream) {
    const paths = planningPaths(projectDir, workstream);
    if (existsSync(paths.config) && statSync(paths.config).isDirectory()) {
        throw new GSDError(`config path is a directory, not a file: ${paths.config} — cannot update integration flag`, ErrorClassification.Validation);
    }
    const parent = dirname(paths.config);
    if (existsSync(parent)) {
        try {
            accessSync(parent, constants.W_OK);
        }
        catch {
            throw new GSDError(`config directory is not writable: ${parent} — fix permissions and retry`, ErrorClassification.Execution);
        }
    }
}
/** Set an integration key from stdin and enable its boolean config flag. */
export async function secretSet(args, projectDir, workstream, stdin = process.stdin, stderr = process.stderr) {
    const slug = resolveSlug(args[0]);
    if (args[1] !== undefined) {
        throw new GSDError('API keys are never accepted as arguments (argv leaks to shell history/ps) — pipe via stdin or run interactively', ErrorClassification.Validation);
    }
    const integration = INTEGRATIONS[slug];
    preflightConfigDestination(projectDir, workstream); // fail BEFORE reading/writing anything
    const secret = await readSecretInput(stdin, stderr);
    const prior = readKeyfile(slug); // snapshot: null | { value }
    writeKeyfile(slug, secret);
    try {
        await configSet([integration.configKey, 'true'], projectDir, workstream);
    }
    catch (err) {
        // Compensate: restore exact prior keyfile state, then rethrow sanitized.
        try {
            if (prior === null)
                deleteKeyfile(slug);
            else
                writeKeyfile(slug, prior.value);
        }
        catch {
            /* best-effort restore */
        }
        // configSet's args are [configKey, 'true'], so `msg` can never contain the
        // secret; the secret variable is never interpolated into any error.
        const msg = err instanceof Error ? err.message : String(err);
        throw new GSDError(`failed to enable ${integration.configKey} — keyfile restored to its previous state (${msg})`, ErrorClassification.Execution);
    }
    return {
        data: {
            integration: slug,
            config_key: integration.configKey,
            enabled: true,
            keyfile: `~/.oto/${integration.keyfileName}`,
            masked: maskSecret(secret),
        },
    };
}
/** Delete an integration keyfile and disable its boolean config flag. */
export async function secretClear(args, projectDir, workstream) {
    const slug = resolveSlug(args[0]);
    const integration = INTEGRATIONS[slug];
    preflightConfigDestination(projectDir, workstream);
    // Config-first ordering: a config failure here leaves the keyfile untouched,
    // so a failed clear can never destroy the only stored credential.
    const result = await configSet([integration.configKey, 'false'], projectDir, workstream);
    let existed;
    try {
        existed = deleteKeyfile(slug);
    }
    catch (err) {
        const prev = result.data?.previousValue;
        try {
            await configSet([integration.configKey, prev === true ? 'true' : 'false'], projectDir, workstream);
        }
        catch {
            /* best-effort flag restore */
        }
        const msg = err instanceof Error ? err.message : String(err);
        throw new GSDError(`failed to remove keyfile — ${integration.configKey} flag restored (${msg})`, ErrorClassification.Execution);
    }
    const envStillSet = Boolean(process.env[integration.envVar]?.trim());
    const raw = envStillSet
        ? `keyfile removed; ${integration.envVar} still set — integration remains available.`
        : `keyfile removed; ${integration.configKey} set to false.`;
    return {
        data: {
            integration: slug,
            config_key: integration.configKey,
            cleared: true,
            keyfile_existed: existed,
            enabled: false,
            env_still_set: envStillSet,
        },
        raw,
    };
}
function readConfig(projectDir, workstream) {
    try {
        const parsed = JSON.parse(readFileSync(planningPaths(projectDir, workstream).config, 'utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}
/** Report masked key sources and flag state for one or every integration. */
export async function secretStatus(args, projectDir, workstream) {
    const slugs = args[0] === undefined ? INTEGRATION_SLUGS : [resolveSlug(args[0])];
    // Phase 14 gap-closure (SECR-03, WR-01): status must self-heal legacy strings like every other read path.
    // Fail-open is safe here: this handler's display is masked-only by construction (D-10) and never returns raw config values.
    try {
        await migrateLegacyIntegrationKeys(planningPaths(projectDir, workstream).config);
    }
    catch { /* masked display still renders */ }
    const config = readConfig(projectDir, workstream);
    const integrations = [];
    const lines = [];
    for (const slug of slugs) {
        const integration = INTEGRATIONS[slug];
        const displayKeyfile = `~/.oto/${integration.keyfileName}`;
        // Heal loose permissions even when an environment value shadows the file.
        const keyfile = readKeyfile(slug);
        const source = detectKeySource(slug);
        const enabled = config[integration.configKey] === true;
        const state = enabled ? 'enabled' : 'disabled';
        integrations.push({
            integration: slug,
            label: integration.label,
            enabled,
            source: source.source,
            env_var: source.envVar,
            keyfile: displayKeyfile,
            masked: source.masked,
            shadowed_keyfile: source.shadowedKeyfile,
            healed: keyfile?.healed ?? false,
        });
        if (source.source === 'env') {
            const shadow = source.shadowedKeyfile ? ` [shadows ${displayKeyfile}]` : '';
            lines.push(`${integration.label}: ${state} — key from env ${source.envVar} (${source.masked})${shadow}`);
        }
        else if (source.source === 'keyfile') {
            lines.push(`${integration.label}: ${state} — key from ${displayKeyfile} (${source.masked})`);
        }
        else {
            lines.push(`${integration.label}: ${state} — no key detected`);
        }
    }
    return { data: { integrations }, raw: lines.join('\n') };
}
//# sourceMappingURL=secret-commands.js.map