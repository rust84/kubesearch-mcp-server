# GitHub Stars Scoring

## Overview

Search results now include **GitHub stars** as a quality indicator, rewarding charts deployed in high-quality, well-maintained repositories.

## How It Works

### Stars Score Calculation

```typescript
starsScore = avgStars × 0.1
```

Where:
- **avgStars**: Average GitHub stars across all repositories using this chart
- **Weight**: 0.1 (meaning 10 stars = 1 point, 100 stars = 10 points)

### Integration into Total Score

```typescript
baseScore = fullMatchScore - lengthScore + countScore + starsScore
finalScore = baseScore × authorMultiplier
```

The stars score is added to the base score **before** the author multiplier is applied.

## Real-World Examples

### Example 1: Plex Chart

**Data:**
- 67 deployments across community repos
- Average 90 GitHub stars per repository
- Chart from bjw-s (1.1× multiplier)
- Exact match for "plex"

**Score Calculation:**
```
Full match:      +10.0
Deployments:     +335.0  (67 × 5)
Stars:           +9.0    (90 × 0.1)
Length penalty:  -0.0    (same length as query)
─────────────────────────
Base score:      354.0
Author boost:    ×1.1
─────────────────────────
Final score:     389.4
```

### Example 2: Chart with High Stars

**Chart:** plex-off-deck
- 7 deployments
- **384 average stars** (very high-quality repos)

**Stars contribution:** 384 × 0.1 = **+38.4 points**

This is significant! Despite having fewer deployments, high-star repos boost the score substantially.

### Example 3: Cert-Manager

Different deployments of cert-manager show varying star counts:
- Deployment 1: 21 stars → +2.1 points
- Deployment 2: 83 stars → +8.3 points
- Deployment 3: 98 stars → +9.8 points

## Benefits

### 1. Repository Quality Signal
- High stars indicate well-maintained, popular repositories
- Charts used by quality repos rank higher
- Filters out low-quality or abandoned deployments

### 2. Balanced with Deployment Count
- Deployment count shows popularity (×5 weight)
- Stars show quality (×0.1 weight)
- Combined: Popular **and** quality charts win

### 3. Fair Weighting
- 100 stars = +10 points
- 20 deployments = +100 points
- Stars help differentiate similar deployment counts

## Impact on Search Results

### Before Stars Scoring
```
1. plex - 345 points (67 deployments)
2. plex - 120 points (22 deployments)
```

### After Stars Scoring
```
1. plex - 389.4 points (67 deployments, 90 stars)
2. plex - 135.5 points (22 deployments, 32 stars)
```

**Difference:** +12.9% and +12.9% boost respectively

Charts from high-quality repos get meaningful but not overwhelming boosts.

## Why Average Stars?

We use **average stars** (not max or sum) because:

### Average Stars
✅ Represents typical repository quality
✅ Fair for charts in both few and many repos
✅ One high-quality repo improves score appropriately
✅ Not skewed by total number of deployments

### Max Stars (not used)
❌ Ignores all other repositories
❌ One outlier can dominate
❌ Doesn't represent overall quality

### Sum Stars (not used)
❌ Unfairly favors charts in many repos
❌ 100 repos with 10 stars each > 5 repos with 1000 stars each
❌ Conflates popularity with quality

## Data Source

Stars are read from the `repo` table in `repos.db`:

```sql
SELECT repo_name, stars FROM repo;
```

Each repository in the k8s-at-home-search database includes its GitHub star count, updated when the database is rebuilt.

## Technical Implementation

### Type Changes
```typescript
// Added avgStars to ReleaseInfo
export interface ReleaseInfo {
  release: string;
  chart: string;
  name: string;
  key: string;
  chartsUrl: string;
  count: number;
  avgStars: number;  // NEW
  icon?: string;
}
```

### Data Collection
```typescript
// Calculate average stars in data-collector.ts
const releaseStars: Record<string, number> = {};
for (const key of keys) {
  const repoList = repos[key];
  const totalStars = repoList.reduce((sum, repo) => sum + repo.stars, 0);
  releaseStars[key] = Math.round(totalStars / repoList.length);
}
```

### Scoring Algorithm
```typescript
// Added stars to scoring calculation
const starsScore = release.avgStars * SEARCH_WEIGHTS.stars;
let score = fullMatchScore - lengthScore + countScore + starsScore;
```

## Configuration

The stars weight is **not configurable** (unlike author weights). It's a constant:

```typescript
export const SEARCH_WEIGHTS = {
  fullMatch: 10,
  length: 1,
  count: 5,
  stars: 0.1,  // Fixed weight
};
```

**Rationale:** Stars should be a consistent, objective quality signal. Making it configurable could lead to gaming the system or inconsistent results.

If you need to adjust the weight, edit `src/types/kubesearch.ts` and rebuild.

## Testing

Run the test suite:

```bash
cd /home/russell/repos/kubesearch-mcp-server

export KUBESEARCH_DB_PATH=/home/russell/repos/k8s-at-home-search/repos.db
export KUBESEARCH_DB_EXTENDED_PATH=/home/russell/repos/k8s-at-home-search/repos-extended.db

npx tsx test-stars-weighting.ts
```

## Future Enhancements

Potential improvements:
- **Decay factor**: Reduce stars weight for very old repos
- **Stars per deployment ratio**: Favor high-star, low-deployment (boutique) charts
- **Minimum stars filter**: Exclude charts from repos with <5 stars
- **Weighted average**: Weight by deployment recency
- **Star growth**: Consider star velocity (stars gained per month)

## Files Modified

1. ✅ `src/types/kubesearch.ts` - Added avgStars, SEARCH_WEIGHTS.stars
2. ✅ `src/services/data-collector.ts` - Calculate average stars
3. ✅ `src/utils/scoring.ts` - Include stars in score calculation
4. ✅ `README.md` - Updated documentation
5. ✅ `test-stars-weighting.ts` - Comprehensive test suite

## Summary

GitHub stars are now a **first-class quality signal** in search results, helping users discover charts deployed in well-maintained, high-quality repositories. The 0.1 weight provides meaningful but balanced influence on rankings.
