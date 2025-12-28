# Author Weighting Feature

## Overview

The search algorithm includes **author boost multipliers** that prioritize deployments from preferred community members. This ensures that configurations from well-known, high-quality repository owners rank higher in search results.

**Important:** Author weighting applies to the **repository owner** (who deployed the chart), NOT the chart maintainer.

## How It Works

### Scoring Formula

```typescript
baseScore = fullMatchScore - lengthScore + starsScore
finalScore = baseScore × authorMultiplier
```

Where:
- **baseScore**: Standard search score (exact match, length, individual repo stars)
- **authorMultiplier**: Boost multiplier for recognized repository owners (default: 1.0)

### Repository Owner Detection

The system extracts the owner from the repository name:
- `onedr0p/home-ops` → owner: `onedr0p`
- `bjw-s/home-ops` → owner: `bjw-s`
- `billimek/k8s-gitops` → owner: `billimek`

If the owner matches a configured author weight, their deployment gets boosted.

### Default Author Multipliers

| Repository Owner | Multiplier | Boost | Notes |
|-----------------|-----------|-------|-------|
| **onedr0p** | 1.1x | +10% | Prominent k8s-at-home community member |
| **bjw-s** | 1.1x | +10% | app-template creator, active contributor |
| Other owners | 1.0x | 0% | No boost (neutral) |

## Configuration

### Via Environment Variable (Recommended)

Author weights can be configured via the `AUTHOR_WEIGHTS` environment variable in your MCP client configuration. **No rebuild required!**

**Default weights** (if not set):
```json
{
  "bjw-s": 1.1,
  "onedr0p": 1.1
}
```

**Examples in Claude Desktop config:**

```json
{
  "mcpServers": {
    "kubesearch": {
      "command": "node",
      "args": ["/path/to/kubesearch-mcp-server/dist/index.js"],
      "env": {
        "KUBESEARCH_DB_PATH": "/path/to/repos.db",
        "KUBESEARCH_DB_EXTENDED_PATH": "/path/to/repos-extended.db",
        "AUTHOR_WEIGHTS": "{\"onedr0p\": 1.1, \"bjw-s\": 1.1, \"billimek\": 1.1}"
      }
    }
  }
}
```

**Note:** JSON strings in environment variables require escaped quotes (`\"`)

**Common configurations:**

```bash
# Boost preferred community members by 10%
AUTHOR_WEIGHTS='{"onedr0p": 1.1, "bjw-s": 1.1}'

# Boost multiple community members
AUTHOR_WEIGHTS='{"onedr0p": 1.1, "bjw-s": 1.1, "billimek": 1.1, "buroa": 1.1}'

# Disable all author boosts
AUTHOR_WEIGHTS='{}'

# Custom repository owners
AUTHOR_WEIGHTS='{"my-github-username": 1.1}'
```

### Via Code (Advanced)

You can also modify the default weights in `src/types/kubesearch.ts`:

```typescript
export const DEFAULT_AUTHOR_WEIGHTS: Record<string, number> = {
  'bjw-s': 1.1,
  'onedr0p': 1.1,
  'billimek': 1.05,  // Add another preferred community member
};
```

Then rebuild: `npm run build`

**Note:** Environment variables override code defaults, so prefer using `AUTHOR_WEIGHTS` env var for flexibility.

## Real-World Impact

### Example: "radarr" Search

With default weights (`{"bjw-s": 1.1, "onedr0p": 1.1}`):

**Results:**

1. **radarr (onedr0p/home-ops)** - 2670 stars
   - Base score: 10 + 267 = 277
   - With 1.1x boost: **304.7**
   - ✅ **Boosted** (onedr0p is in author weights)

2. **radarr (billimek/k8s-gitops)** - 748 stars
   - Base score: 10 + 74.8 = 84.8
   - No boost: **84.8**
   - ❌ Not boosted (billimek not in weights)

3. **radarr (bjw-s/home-ops)** - 395 stars
   - Base score: 10 + 39.5 = 49.5
   - With 1.1x boost: **54.5**
   - ✅ **Boosted** (bjw-s is in author weights)

**Key Insight:** bjw-s's deployment (395 stars) scores higher than it would without the boost (49.5 → 54.5), prioritizing preferred community members' configurations.

### Without Author Weighting

Set `AUTHOR_WEIGHTS='{}'` to disable:

1. **radarr (onedr0p/home-ops)** - 277.0 (no boost)
2. **radarr (billimek/k8s-gitops)** - 84.8 (no boost)
3. **radarr (bjw-s/home-ops)** - 49.5 (no boost)

Results are sorted purely by stars.

## Use Cases

### 1. Trust Your Favorite Community Members

```bash
# Prioritize deployments from your favorite k8s-at-home contributors
AUTHOR_WEIGHTS='{"onedr0p": 1.1, "bjw-s": 1.1, "buroa": 1.1}'
```

### 2. Prioritize Your Own Deployments

```bash
# Boost your own repository's deployments
AUTHOR_WEIGHTS='{"yourusername": 1.1}'
```

### 3. Community-Curated Quality

```bash
# Boost well-known, high-quality homelab maintainers
AUTHOR_WEIGHTS='{
  "onedr0p": 1.1,
  "bjw-s": 1.1,
  "billimek": 1.1,
  "buroa": 1.1,
  "carpenike": 1.1
}'
```

## How Author Detection Works

### Technical Details

The author detection happens in `src/utils/scoring.ts`:

```typescript
function detectAuthor(repo: string, authorWeights: Record<string, number>): string | null {
  // Extract owner from "owner/repo" format
  const owner = repo.split('/')[0]?.toLowerCase() || '';

  // Check each configured author pattern
  for (const author of Object.keys(authorWeights)) {
    if (owner === author.toLowerCase()) {
      return author;
    }
  }

  return null;
}
```

**Matching is case-insensitive:**
- `OnedrOp/cluster` matches `onedr0p` in weights
- `BJW-S/home-ops` matches `bjw-s` in weights

## Affected Tools

Author weighting applies to:

1. **search_helm_charts** - Individual deployments ranked by owner + stars
2. **get_chart_details** - Repositories sorted by owner + stars
3. **grep_helm_values** - Examples prioritized by owner + stars

## FAQ

### Q: Why repository owner instead of chart maintainer?

**A:** Most charts are the same (e.g., bjw-s's app-template). What matters is **who is deploying it** and maintaining those configurations, not who created the chart. A deployment from onedr0p's repository carries more weight because they're a well-known community member with proven configurations.

### Q: Can I boost multiple authors?

**A:** Yes! Add multiple authors to the JSON object:

```bash
AUTHOR_WEIGHTS='{"onedr0p": 1.1, "bjw-s": 1.1, "billimek": 1.1}'
```

### Q: What's a good multiplier value?

**A:**
- **1.05-1.1** (5-10%): Subtle boost for preferred sources
- **1.1-1.3** (10-30%): Moderate boost for high-quality maintainers
- **1.3-2.0** (30-100%): Strong boost for your favorites
- **2.0+** (100%+): Very aggressive boost (use sparingly)

### Q: How do I find repository owners to boost?

**A:** Run searches and look at the `repo` field in results:

```bash
npx tsx test-radarr.ts
```

You'll see results like `onedr0p/home-ops`, `bjw-s/home-ops`, etc. The first part is the owner.

### Q: Does this work with grep_helm_values?

**A:** Yes! When you search for value patterns, examples from weighted authors appear first.

## Summary

- ✅ Author weights boost **repository owners**, not chart maintainers
- ✅ Configurable via `AUTHOR_WEIGHTS` environment variable
- ✅ Applies to search results, chart details, and value examples
- ✅ Default: `{"bjw-s": 1.1, "onedr0p": 1.1}`
- ✅ Case-insensitive matching
- ✅ No rebuild required for changes
