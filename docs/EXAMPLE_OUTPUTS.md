# KubeSearch MCP Server - Example Tool Outputs

This document shows example outputs for each of the six tools, derived from the
result types in `src/types/kubesearch.ts` (and `ChartSourceEntry` in
`src/tools/list-chart-sources.ts`). The sample data below is illustrative, not
captured from a live database run.

---

## 1. search_deployments

Search for real-world deployment examples from community repositories. Returns
individual deployments showing how users configure and deploy Helm charts,
scored by repository quality (stars) and author reputation.

**Query:** Search for "plex"

**Input:**

```json
{
  "query": "plex",
  "limit": 5
}
```

**Output:**

```json
[
  {
    "name": "plex",
    "chart": "app-template",
    "helmRepoURL": "oci://ghcr.io/bjw-s/helm",
    "repo": "anthr76/infra",
    "repoUrl": "https://github.com/anthr76/infra",
    "stars": 106,
    "version": "4.5.0",
    "deploymentUrl": "https://github.com/anthr76/infra/blob/main/k8s/base/media/plex/helm-release.yaml",
    "key": "ghcr.io-bjw-s-helm-plex",
    "score": 345.2
  },
  {
    "name": "plex",
    "chart": "app-template",
    "helmRepoURL": "oci://ghcr.io/bjw-s/helm",
    "repo": "bah-blip/home-k8s",
    "repoUrl": "https://github.com/bah-blip/home-k8s",
    "stars": 59,
    "version": "3.17.0",
    "deploymentUrl": "https://github.com/bah-blip/home-k8s/blob/main/kubernetes/apps/media/plex/app/helmrelease.yaml",
    "key": "ghcr.io-bjw-s-helm-plex",
    "score": 210.5
  },
  {
    "name": "plex",
    "chart": "plex",
    "helmRepoURL": "https://plex-helm.github.io/charts",
    "repo": "someone/k8s-cluster",
    "repoUrl": "https://github.com/someone/k8s-cluster",
    "stars": 19,
    "version": "1.2.0",
    "deploymentUrl": "https://github.com/someone/k8s-cluster/blob/main/apps/plex/helm-release.yaml",
    "key": "plex-helm.github.io-charts-plex",
    "score": 105.0
  },
  {
    "name": "plex-auto-languages",
    "chart": "app-template",
    "helmRepoURL": "oci://ghcr.io/bjw-s/helm",
    "repo": "journeydocker/homelab",
    "repoUrl": "https://github.com/journeydocker/homelab",
    "stars": 14,
    "version": "3.15.0",
    "deploymentUrl": "https://github.com/journeydocker/homelab/blob/main/apps/plex-auto-languages/helm-release.yaml",
    "key": "ghcr.io-bjw-s-helm-plex-auto-languages",
    "score": 55.0
  },
  {
    "name": "plex-image-cleanup",
    "chart": "plex-image-cleanup",
    "helmRepoURL": "https://meisnate12.github.io/Plex-Image-Cleanup",
    "repo": "meisnate12/homelab",
    "repoUrl": "https://github.com/meisnate12/homelab",
    "stars": 11,
    "version": "0.4.1",
    "deploymentUrl": "https://github.com/meisnate12/homelab/blob/main/apps/plex-image-cleanup/helm-release.yaml",
    "key": "meisnate12.github.io-plex-image-cleanup-plex-image-cleanup",
    "score": 41.0
  }
]
```

**Insights:**

- Each result is one deployment, not an aggregated chart — the same `key` can appear more than once (one row per repository using that chart source).
- `score` reflects deployment count, stars, and any `AUTHOR_WEIGHTS` boost applied to the repo's author.
- Use the `key` field with `get_chart_details`, `get_chart_index`, or `get_chart_stats` to dig into a specific chart source.

---

## 2. list_chart_sources

List all available chart sources (Helm repositories) for a given chart name,
showing how many deployments use each source. Compare official repos vs.
mirrors vs. community forks to choose the best one.

**Query:** Search for "plex" with at least 3 deployments per source

**Input:**

```json
{
  "query": "plex",
  "minCount": 3
}
```

**Output:**

```json
[
  {
    "name": "plex",
    "chart": "app-template",
    "helmRepoURL": "oci://ghcr.io/bjw-s/helm",
    "key": "ghcr.io-bjw-s-helm-plex",
    "count": 67,
    "icon": "sh-plex"
  },
  {
    "name": "plex",
    "chart": "plex",
    "helmRepoURL": "https://plex-helm.github.io/charts",
    "key": "plex-helm.github.io-charts-plex",
    "count": 19
  },
  {
    "name": "plex-auto-languages",
    "chart": "app-template",
    "helmRepoURL": "oci://ghcr.io/bjw-s/helm",
    "key": "ghcr.io-bjw-s-helm-plex-auto-languages",
    "count": 14
  }
]
```

**Insights:**

- Results are aggregated by `key` (one row per chart source) and sorted by deployment count, descending.
- `icon` is optional — omitted when no Hajimari icon was recorded for that source.
- Feed any `key` from this list into `get_chart_details`, `get_chart_index`, or `get_chart_stats`.

---

## 3. get_chart_details

Get detailed information about a specific Helm chart, including popular
configuration values with all variations sorted by repository quality
(stars + author reputation).

**Query:** Get details for the bjw-s Plex chart

**Input:**

```json
{
  "key": "ghcr.io-bjw-s-helm-plex",
  "includeValues": true,
  "valuesLimit": 2,
  "pathsLimit": 3
}
```

**Output:**

```json
{
  "name": "plex",
  "chartName": "app-template",
  "helmRepoURL": "oci://ghcr.io/bjw-s/helm",
  "helmRepoName": "bjw-s",
  "icon": "sh-plex",
  "popularValues": [
    {
      "path": "controllers.plex.containers.app.image.repository",
      "count": 63,
      "types": ["string"],
      "values": [
        {
          "value": "ghcr.io/home-operations/plex",
          "repo": "anthr76/infra",
          "repoUrl": "https://github.com/anthr76/infra",
          "score": 159.0
        },
        {
          "value": "ghcr.io/home-operations/plex",
          "repo": "bah-blip/home-k8s",
          "repoUrl": "https://github.com/bah-blip/home-k8s",
          "score": 59.0
        }
      ]
    },
    {
      "path": "service.app.ports.http.port",
      "count": 63,
      "types": ["number"],
      "values": [
        {
          "value": 32400,
          "repo": "anthr76/infra",
          "repoUrl": "https://github.com/anthr76/infra",
          "score": 159.0
        }
      ]
    },
    {
      "path": "persistence.config.existingClaim",
      "count": 60,
      "types": ["string"],
      "values": [
        {
          "value": "plex-config",
          "repo": "anthr76/infra",
          "repoUrl": "https://github.com/anthr76/infra",
          "score": 159.0
        }
      ]
    }
  ],
  "statistics": {
    "totalRepos": 67,
    "latestVersion": "4.5.0"
  }
}
```

**Insights:**

- `statistics.latestVersion` is computed with genuine semver comparison (`src/utils/semver.ts`), so it reflects the true highest released version, not just the most recently seen one.
- Each entry under a path's `values` array is sorted by `score` (stars x author weight), so the top entry represents the most "trustworthy" example of that setting.
- `count` on each path is the total number of deployments using that path; `values` may be truncated to `valuesLimit`.
- Pass `valuePath` (e.g., `"persistence"`) to filter to one configuration section; use `get_chart_index` first to discover what paths exist.

---

## 4. get_chart_index

List all configuration paths available in a chart to help explore what
settings can be configured, without pulling full value data.

**Query:** Explore persistence-related paths for the bjw-s Plex chart

**Input:**

```json
{
  "key": "ghcr.io-bjw-s-helm-plex",
  "searchPath": "persistence"
}
```

**Output:**

```json
{
  "name": "plex",
  "chartName": "app-template",
  "totalDeployments": 67,
  "paths": [
    { "path": "persistence.cache.existingClaim", "usageCount": 12 },
    { "path": "persistence.config.existingClaim", "usageCount": 60 },
    { "path": "persistence.config.size", "usageCount": 8 },
    { "path": "persistence.transcode.type", "usageCount": 21 }
  ]
}
```

**Insights:**

- `paths` is a flat, alphabetically sorted list of every leaf configuration path found across all deployments matching `searchPath`.
- `usageCount` shows how many of the `totalDeployments` set that specific path.
- Omit `searchPath` to see every top-level path in the chart.

---

## 5. get_chart_stats

Get statistics and metrics about a specific Helm chart source: deployment
count, repository quality metrics (stars), version distribution, and top
repositories.

**Query:** Get stats for the bjw-s Plex chart

**Input:**

```json
{
  "key": "ghcr.io-bjw-s-helm-plex"
}
```

**Output:**

```json
{
  "name": "plex",
  "chartName": "app-template",
  "helmRepoURL": "oci://ghcr.io/bjw-s/helm",
  "helmRepoName": "bjw-s",
  "icon": "sh-plex",
  "statistics": {
    "totalDeployments": 67,
    "minStars": 0,
    "maxStars": 106,
    "latestVersion": "4.5.0"
  },
  "topRepositories": [
    {
      "repo": "anthr76/infra",
      "repoUrl": "https://github.com/anthr76/infra",
      "stars": 106,
      "version": "4.5.0"
    },
    {
      "repo": "bah-blip/home-k8s",
      "repoUrl": "https://github.com/bah-blip/home-k8s",
      "stars": 59,
      "version": "3.17.0"
    }
  ],
  "versionDistribution": [
    { "version": "4.5.0", "count": 22 },
    { "version": "3.17.0", "count": 15 },
    { "version": "3.16.2", "count": 9 }
  ]
}
```

**Insights:**

- `latestVersion` is semver-aware, so pre-release or oddly-formatted version strings don't get incorrectly reported as "latest".
- `topRepositories` is sorted by stars, descending, and capped at 10 entries.
- `versionDistribution` is sorted by deployment count, descending, and capped at 10 entries — useful for seeing whether the community has mostly moved to a newer chart version.

---

## 6. search_container_images

Find Helm deployments using specific container images to see how images are
configured in real deployments.

**Query:** Search for "plex" container images

**Input:**

```json
{
  "image": "plex",
  "limit": 3
}
```

**Output:**

```json
[
  {
    "repository": "ghcr.io/home-operations/plex",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 91,
        "deployments": [
          {
            "repoName": "anthr76/infra",
            "repoUrl": "https://github.com/anthr76/infra/blob/main/k8s/base/media/plex/helm-release.yaml"
          },
          {
            "repoName": "bah-blip/home-k8s",
            "repoUrl": "https://github.com/bah-blip/home-k8s/blob/main/kubernetes/apps/media/plex/app/helmrelease.yaml"
          }
        ]
      }
    ]
  },
  {
    "repository": "docker.io/meisnate12/plex-image-cleanup",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 16,
        "deployments": [
          {
            "repoName": "meisnate12/homelab",
            "repoUrl": "https://github.com/meisnate12/homelab/blob/main/apps/plex-image-cleanup/helm-release.yaml"
          }
        ]
      }
    ]
  },
  {
    "repository": "ghcr.io/onedr0p/plex",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 11,
        "deployments": [
          {
            "repoName": "someone/k8s-cluster",
            "repoUrl": "https://github.com/someone/k8s-cluster/blob/main/apps/plex/helm-release.yaml"
          }
        ]
      }
    ]
  }
]
```

**Insights:**

- Results are sorted by total usage count across all tags, descending.
- `deployments` under each tag is capped at 5 example URLs, even if `usageCount` is higher.
- Useful for discovering alternative/community-maintained images for the same application.

---

## Error Cases

### Chart Key Not Found

Applies to `get_chart_details`, `get_chart_index`, and `get_chart_stats`.

**Input:**

```json
{
  "key": "invalid-key-12345"
}
```

**Output:** the tool call fails with an error such as:

```
Chart with key 'invalid-key-12345' not found
```

### No Results Found

Applies to `search_deployments`, `list_chart_sources`, and `search_container_images`.

**Input:**

```json
{
  "query": "xyznonexistent123"
}
```

**Output:**

```json
[]
```

---

## Use Cases

### Use Case 1: Discovering How to Deploy an App

1. Search for the app: `search_deployments({ query: "plex" })`
2. Or compare sources first: `list_chart_sources({ query: "plex" })`
3. Get detailed examples: `get_chart_details({ key: "ghcr.io-bjw-s-helm-plex" })`
4. Review popular values to see common configurations

### Use Case 2: Finding Container Images

1. Search for image: `search_container_images({ image: "plex" })`
2. See which images are most popular in the community
3. Review example deployments using each image

### Use Case 3: Learning Configuration Patterns

1. Explore available settings: `get_chart_index({ key: "ghcr.io-bjw-s-helm-plex", searchPath: "persistence" })`
2. Drill into a specific path: `get_chart_details({ key: "ghcr.io-bjw-s-helm-plex", valuePath: "persistence" })`
3. Review example values to understand common patterns

### Use Case 4: Checking Chart Health

1. Get stats for a chart source: `get_chart_stats({ key: "ghcr.io-bjw-s-helm-plex" })`
2. Check `versionDistribution` to see whether deployments have moved to the latest version
3. Check `topRepositories` for well-maintained reference implementations

---

## Notes

- All data comes from real k8s-at-home community repositories.
- Values reflect actual production deployments.
- GitHub stars indicate repository popularity.
- Deployment counts show community adoption.
- Examples provide links to actual YAML files for reference.
