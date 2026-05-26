/**
 * Workstream utility functions for multi-workstream project support.
 *
 * When --ws <name> is provided, all planning paths are routed to
 * <planning-root>/workstreams/<name>/ instead.
 */
/**
 * Validate a workstream name.
 * Allowed: alphanumeric, hyphens, underscores, dots.
 * Disallowed: empty, spaces, slashes, special chars, path traversal.
 */
export declare function validateWorkstreamName(name: string): boolean;
/**
 * Return the relative planning directory path, rooted at the project's
 * resolved planning root (`.oto` or migrated `.planning`, per planningRootName).
 *
 * - Without workstream: e.g. `.oto`
 * - With workstream: e.g. `.oto/workstreams/<name>`
 */
export declare function relPlanningPath(projectDir: string, workstream?: string): string;
//# sourceMappingURL=workstream-utils.d.ts.map