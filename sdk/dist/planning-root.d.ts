/**
 * True when `.planning/STATE.md` carries the `oto_state_version:` marker -
 * the signal that `.planning/` is an oto-migrated root, not a GSD-era one.
 * Port of oto/bin/lib/core.cjs:55-63 (hasMigratedPlanningRoot).
 */
export declare function hasMigratedPlanningRoot(projectDir: string): boolean;
/**
 * Resolve the planning-root directory name for a project, mirroring the CJS
 * resolver (oto/bin/lib/core.cjs:65-69):
 *   1. '.oto' if .oto/ exists.
 *   2. '.planning' only if .planning/ exists and carries the migrated marker.
 *   3. '.oto' otherwise.
 */
export declare function planningRootName(projectDir: string): '.oto' | '.planning';
/**
 * True when the project owns an oto planning root: .oto/ exists OR a
 * migrated .planning/ is present. Port of oto/bin/lib/core.cjs:71-73
 * (hasPlanningRoot). Used by findProjectRoot's walk-up predicate (D-03).
 */
export declare function hasPlanningRoot(projectDir: string): boolean;
//# sourceMappingURL=planning-root.d.ts.map