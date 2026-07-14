/**
 * Minimal, dependency-free semver-aware version comparison.
 *
 * This is intentionally not a full semver implementation: it does not
 * validate input, understand build metadata (`+meta`), or reject
 * non-semver strings. It compares dot-separated segments numerically when
 * both sides are numeric and lexically otherwise, treating missing
 * segments as `0`. This is enough to pick the "latest" of a list of chart
 * versions scraped from real-world Helm releases, which are not always
 * strict semver.
 *
 * If charts start relying on build metadata or stricter semver semantics,
 * swap this for the `semver` package.
 */

/** Split a version into its core (dot-separated) part and optional pre-release suffix. */
function splitVersion(version: string): { core: string; pre: string | undefined } {
  const idx = version.indexOf('-');
  if (idx === -1) {
    return { core: version, pre: undefined };
  }
  return { core: version.slice(0, idx), pre: version.slice(idx + 1) };
}

/** Compare two dot-separated identifiers: numeric segments compare numerically, others lexically. */
function compareIdentifiers(a: string, b: string): number {
  const aIsNumeric = /^\d+$/.test(a);
  const bIsNumeric = /^\d+$/.test(b);

  if (aIsNumeric && bIsNumeric) {
    const diff = Number(a) - Number(b);
    return diff === 0 ? 0 : diff > 0 ? 1 : -1;
  }

  if (aIsNumeric !== bIsNumeric) {
    // Per semver precedence rules, numeric identifiers have lower precedence
    // than non-numeric ones when compared against each other.
    return aIsNumeric ? -1 : 1;
  }

  return a === b ? 0 : a > b ? 1 : -1;
}

/** Compare two arrays of dot-separated segments, treating missing segments as '0'. */
function compareSegments(a: string[], b: string[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const cmp = compareIdentifiers(a[i] ?? '0', b[i] ?? '0');
    if (cmp !== 0) {
      return cmp;
    }
  }
  return 0;
}

/**
 * Compare two version strings.
 *
 * Returns a positive number if `a` > `b`, negative if `a` < `b`, and `0` if
 * equal. Pre-release versions (anything after the first `-`) are compared
 * per semver precedence rules: a version WITHOUT a pre-release suffix is
 * considered newer than the same core version WITH a pre-release suffix
 * (e.g. `1.0.0` > `1.0.0-beta.1`).
 */
export function compareVersions(a: string, b: string): number {
  const va = splitVersion(a);
  const vb = splitVersion(b);

  const coreCmp = compareSegments(va.core.split('.'), vb.core.split('.'));
  if (coreCmp !== 0) {
    return coreCmp;
  }

  if (va.pre === undefined && vb.pre === undefined) {
    return 0;
  }
  if (va.pre === undefined) {
    return 1;
  }
  if (vb.pre === undefined) {
    return -1;
  }

  return compareSegments(va.pre.split('.'), vb.pre.split('.'));
}

/**
 * Return the "latest" (highest-precedence) version from a list of version
 * strings, or `'unknown'` if the list is empty. Non-semver strings never
 * throw; they're simply compared segment-by-segment as described above.
 */
export function latestVersion(versions: string[]): string {
  if (versions.length === 0) {
    return 'unknown';
  }
  return versions.reduce((max, v) => (compareVersions(v, max) > 0 ? v : max));
}
