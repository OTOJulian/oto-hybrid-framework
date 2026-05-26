/**
 * Workstream utility functions for multi-workstream project support.
 *
 * When --ws <name> is provided, all planning paths are routed to
 * <planning-root>/workstreams/<name>/ instead.
 */
import { posix } from 'node:path';
import { planningRootName } from './planning-root.js';
/**
 * Validate a workstream name.
 * Allowed: alphanumeric, hyphens, underscores, dots.
 * Disallowed: empty, spaces, slashes, special chars, path traversal.
 */
export function validateWorkstreamName(name) {
    if (!name || name.length === 0)
        return false;
    // Only allow alphanumeric, hyphens, underscores, dots
    // Must not be ".." or start with ".." (path traversal)
    if (name === '..' || name.startsWith('../'))
        return false;
    return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name);
}
/**
 * Return the relative planning directory path, rooted at the project's
 * resolved planning root (`.oto` or migrated `.planning`, per planningRootName).
 *
 * - Without workstream: e.g. `.oto`
 * - With workstream: e.g. `.oto/workstreams/<name>`
 */
export function relPlanningPath(projectDir, workstream) {
    const root = planningRootName(projectDir);
    if (!workstream)
        return root;
    // POSIX segments so the same logical string is used on all platforms.
    return posix.join(root, 'workstreams', workstream);
}
//# sourceMappingURL=workstream-utils.js.map