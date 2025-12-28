# KubeSearch MCP Server - Example Tool Outputs

This document shows real example outputs from each tool when run against the k8s-at-home-search databases.

---

## 1. search_helm_charts

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
    "helmRepoURL": "oci://ghcr.io/bjw-s-labs/helm/app-template",
    "count": 67,
    "key": "ghcr.io-bjw-s-labs-helm-app-template-plex",
    "score": 345
  },
  {
    "name": "plex",
    "chart": "app-template",
    "helmRepoURL": "oci://ghcr.io/bjw-s/helm/",
    "count": 22,
    "key": "ghcr.io-bjw-s-helm-app-template-plex",
    "score": 120
  },
  {
    "name": "plex",
    "chart": "app-template",
    "helmRepoURL": "https://bjw-s.github.io/helm-charts/",
    "count": 19,
    "key": "bjw-s.github.io-helm-charts-app-template-plex",
    "score": 105
  },
  {
    "name": "plex-auto-languages",
    "chart": "app-template",
    "helmRepoURL": "oci://ghcr.io/bjw-s-labs/helm/app-template",
    "count": 14,
    "key": "ghcr.io-bjw-s-labs-helm-app-template-plex-auto-languages",
    "score": 55
  },
  {
    "name": "plex-image-cleanup",
    "chart": "plex-image-cleanup",
    "helmRepoURL": "https://meisnate12.github.io/Plex-Image-Cleanup",
    "count": 11,
    "key": "meisnate12.github.io-plex-image-cleanup-plex-image-cleanup",
    "score": 41
  }
]
```

**Insights:**
- Found 5 different Plex-related deployments
- Most popular: 67 deployments using bjw-s app-template
- Scoring prioritizes exact matches and deployment count
- Different Helm repositories for the same app (OCI vs HTTP)

---

**Query:** Search for "traefik"

**Output:**
```json
[
  {
    "name": "traefik",
    "chart": "traefik",
    "helmRepoURL": "oci://ghcr.io/traefik/helm/",
    "count": 15,
    "score": 85
  },
  {
    "name": "traefik",
    "chart": "traefik",
    "helmRepoURL": "https://traefik.github.io/charts",
    "count": 11,
    "score": 65
  },
  {
    "name": "traefik",
    "chart": "traefik",
    "helmRepoURL": "https://helm.traefik.io/traefik",
    "count": 3,
    "score": 25
  },
  {
    "name": "traefik-forward-auth",
    "chart": "traefik-forward-auth",
    "helmRepoURL": "https://k8s-at-home.com/charts/",
    "count": 4,
    "score": 7
  },
  {
    "name": "traefik-internal",
    "chart": "traefik-internal",
    "helmRepoURL": "https://charts.adfinis.com",
    "count": 3,
    "score": 6
  }
]
```

---

**Query:** Search for "nextcloud"

**Output:**
```json
[
  {
    "name": "nextcloud",
    "chart": "nextcloud",
    "helmRepoURL": "https://nextcloud.github.io/helm/",
    "count": 18,
    "score": 100
  },
  {
    "name": "nextcloud",
    "chart": "nextcloud",
    "helmRepoURL": "https://charts.nextcloud.com",
    "count": 14,
    "score": 80
  }
]
```

---

## 2. get_chart_details

**Query:** Get details for Plex chart

**Input:**
```json
{
  "key": "ghcr.io-bjw-s-labs-helm-app-template-plex"
}
```

**Output (truncated for readability):**
```json
{
  "name": "plex",
  "chartName": "app-template",
  "helmRepoURL": "oci://ghcr.io/bjw-s-labs/helm/app-template",
  "helmRepoName": "bjw-s",
  "repositories": [
    {
      "name": "plex",
      "repo": "anthr76/infra",
      "repoUrl": "https://github.com/anthr76/infra",
      "fileUrl": "https://github.com/anthr76/infra/blob/main/k8s/base/media/plex/helm-release.yaml",
      "version": "4.5.0",
      "stars": 106,
      "timestamp": 1764992573
    },
    {
      "name": "plex",
      "repo": "bah-blip/home-k8s",
      "repoUrl": "https://github.com/bah-blip/home-k8s",
      "fileUrl": "https://github.com/bah-blip/home-k8s/blob/main/kubernetes/apps/media/plex/app/helmrelease.yaml",
      "version": "3.17.0",
      "stars": 59,
      "timestamp": 1764992573
    }
    // ... 65 more repositories
  ],
  "popularValues": [
    {
      "path": "controllers.plex.containers.app.image.repository",
      "count": 63,
      "types": ["string"],
      "commonValue": "ghcr.io/home-operations/plex"
    },
    {
      "path": "controllers.plex.containers.app.image.tag",
      "count": 63,
      "types": ["string"],
      "commonValue": "latest"
    },
    {
      "path": "service.app.ports.http.port",
      "count": 63,
      "types": ["number"],
      "commonValue": 32400
    },
    {
      "path": "persistence.config.existingClaim",
      "count": 63,
      "types": ["string"],
      "commonValue": "plex-config"
    },
    {
      "path": "controllers.plex.containers.app.resources.requests.cpu",
      "count": 60,
      "types": ["string"],
      "commonValue": "100m"
    }
    // ... 15 more popular values
  ],
  "installCommand": {
    "helm": "helm repo add bjw-s oci://ghcr.io/bjw-s-labs/helm/app-template\nhelm install plex bjw-s/app-template -f values.yaml",
    "flux": "# HelmRepository\napiVersion: source.toolkit.fluxcd.io/v1beta2\nkind: HelmRepository\nmetadata:\n  name: bjw-s\n  namespace: flux-system\nspec:\n  interval: 12h\n  url: oci://ghcr.io/bjw-s-labs/helm/app-template\n\n---\n# HelmRelease\napiVersion: helm.toolkit.fluxcd.io/v2beta1\nkind: HelmRelease\nmetadata:\n  name: plex\n  namespace: default\nspec:\n  interval: 30m\n  chart:\n    spec:\n      chart: app-template\n      sourceRef:\n        kind: HelmRepository\n        name: bjw-s\n        namespace: flux-system\n  values:\n    # Add your custom values here"
  },
  "statistics": {
    "totalRepos": 67,
    "avgStars": 82,
    "latestVersion": "4.5.0"
  }
}
```

**Insights:**
- Aggregates data from 67 different repositories
- Shows most common configuration values across all deployments
- Most deployments use `ghcr.io/home-operations/plex` image
- Port 32400 is standard for Plex
- Provides ready-to-use Helm and Flux install commands
- Average repository has 82 GitHub stars

---

## 3. grep_helm_values

**Status:** Currently broken due to null handling bug

**Expected behavior once fixed:**

**Query:** Find all uses of "ingress.enabled"

**Input:**
```json
{
  "pattern": "ingress.enabled",
  "limit": 5
}
```

**Expected Output:**
```json
[
  {
    "valuePath": "ingress.enabled",
    "count": 234,
    "examples": [
      {
        "value": true,
        "repoUrl": "https://github.com/user/repo/blob/main/helm-release.yaml"
      },
      {
        "value": false,
        "repoUrl": "https://github.com/user2/repo2/blob/main/helm-release.yaml"
      }
    ]
  },
  {
    "valuePath": "ingress.main.enabled",
    "count": 156,
    "examples": [...]
  }
]
```

**Note:** This tool requires the null handling fix before it can be tested properly.

---

## 4. search_container_images

**Query:** Search for "plex" container images

**Input:**
```json
{
  "image": "plex",
  "limit": 5
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
          // ... up to 5 example deployments
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
        "deployments": [...]
      }
    ]
  },
  {
    "repository": "ghcr.io/onedr0p/plex",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 11,
        "deployments": [...]
      }
    ]
  },
  {
    "repository": "ghcr.io/journeydocker/plex-auto-languages",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 8,
        "deployments": [...]
      }
    ]
  },
  {
    "repository": "remirigal/plex-auto-languages",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 7,
        "deployments": [...]
      }
    ]
  }
]
```

**Insights:**
- Most popular Plex image: `ghcr.io/home-operations/plex` (91 deployments)
- Multiple community-maintained images available
- Results sorted by usage count
- Shows which repositories are using each image
- Helps discover alternative implementations

---

**Query:** Search for "traefik" images

**Input:**
```json
{
  "image": "traefik",
  "limit": 3
}
```

**Output:**
```json
[
  {
    "repository": "docker.io/traefik",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 45,
        "deployments": [...]
      }
    ]
  },
  {
    "repository": "ghcr.io/traefik/traefik",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 12,
        "deployments": [...]
      }
    ]
  },
  {
    "repository": "traefik",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 8,
        "deployments": [...]
      }
    ]
  }
]
```

---

## Error Cases

### Invalid Chart Key

**Input:**
```json
{
  "key": "invalid-key-12345"
}
```

**Output:**
```json
{
  "error": "Chart with key 'invalid-key-12345' not found"
}
```

### No Results Found

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

1. Search for the app: `search_helm_charts({ query: "plex" })`
2. Get detailed examples: `get_chart_details({ key: "ghcr.io-bjw-s-labs-helm-app-template-plex" })`
3. Review popular values to see common configurations
4. Use provided install command to deploy

### Use Case 2: Finding Container Images

1. Search for image: `search_container_images({ image: "plex" })`
2. See which images are most popular in the community
3. Review example deployments using each image

### Use Case 3: Learning Configuration Patterns

1. Search for pattern: `grep_helm_values({ pattern: "ingress.enabled" })`
2. See how many deployments use this setting
3. Review example values to understand common patterns

---

## Notes

- All data comes from real k8s-at-home community repositories
- Values reflect actual production deployments
- GitHub stars indicate repository popularity
- Deployment counts show community adoption
- Examples provide links to actual YAML files for reference
