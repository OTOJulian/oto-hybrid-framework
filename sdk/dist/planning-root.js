/**
 * Planning-root resolution - the single authority for deciding whether a
 * project's planning root is `.oto/` or a migrated `.planning/`.
 *
 * LEAF MODULE: imports only node builtins. It must NOT import from helpers.ts
 * or workstream-utils.ts - both of those import the resolver, and a back-edge
 * here would form an ESM cycle. Keep this file dependency-free.
 *
 * Direct TS port of oto/bin/lib/core.cjs:47-73 (isDirectory /
 * hasMigratedPlanningRoot / planningRootName / hasPlanningRoot).
 */
import { join } from 'node:path';
import { existsSync, statSync, readFileSync } from 'node:fs';
function isDir(p) {
    try {
        return existsSync(p) && statSync(p).isDirectory();
    }
    catch {
        return false;
    }
}
/**
 * True when `.planning/STATE.md` carries the `oto_state_version:` marker -
 * the signal that `.planning/` is an oto-migrated root, not a GSD-era one.
 * Port of oto/bin/lib/core.cjs:55-63 (hasMigratedPlanningRoot).
 */
export function hasMigratedPlanningRoot(projectDir) {
    try {
        const state = readFileSync(join(projectDir, '.planning', 'STATE.md'), 'utf-8');
        return /^oto_state_version\s*:/m.test(state);
    }
    catch {
        return false;
    }
}
/**
 * Resolve the planning-root directory name for a project, mirroring the CJS
 * resolver (oto/bin/lib/core.cjs:65-69):
 *   1. '.oto' if .oto/ exists.
 *   2. '.planning' only if .planning/ exists and carries the migrated marker.
 *   3. '.oto' otherwise.
 */
export function planningRootName(projectDir) {
    if (isDir(join(projectDir, '.oto')))
        return '.oto';
    if (isDir(join(projectDir, '.planning')) && hasMigratedPlanningRoot(projectDir))
        return '.planning';
    return '.oto';
}
/**
 * True when the project owns an oto planning root: .oto/ exists OR a
 * migrated .planning/ is present. Port of oto/bin/lib/core.cjs:71-73
 * (hasPlanningRoot). Used by findProjectRoot's walk-up predicate (D-03).
 */
export function hasPlanningRoot(projectDir) {
    return isDir(join(projectDir, '.oto')) || hasMigratedPlanningRoot(projectDir);
}
//# sourceMappingURL=planning-root.js.map