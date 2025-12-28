# KubeSearch MCP Server

An MCP (Model Context Protocol) server that provides tools to query [k8s-at-home-search](https://kubesearch.dev) for real-world Helm deployment examples from the Kubernetes homelab community.

## Features

- **Search Helm Charts** - Find charts by name and see individual deployment examples from community members
- **Chart Details** - Get detailed information about specific charts including popular configuration values with all variations sorted by repository quality
- **Chart Index** - Explore available configuration paths in a chart to discover what can be configured
- **Image Search** - Find deployments using specific container images

## Data Source

This MCP server queries a local k8s-at-home-search SQLite database containing:
- 16,240+ Flux HelmReleases
- 4,708+ Helm Repositories
- 147+ Argo CD Applications
- Real-world configuration values from the k8s-at-home community

## Prerequisites

1. **Node.js 18+** installed on your system
2. **k8s-at-home-search databases** - You need local access to:
   - `repos.db` - Main database with release and repository metadata
   - `repos-extended.db` - Extended database with Helm values

### Getting the Databases

Clone and build the k8s-at-home-search project:

```bash
git clone https://github.com/onedr0p/k8s-at-home-search
cd k8s-at-home-search

# Follow their build instructions to generate the databases
# The databases will be created at:
#   repos.db (5.7 MB)
#   repos-extended.db (29.8 MB)
```

## Installation

```bash
# Clone this repository
git clone <repository-url>
cd kubesearch-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

The server requires two environment variables to point to your local k8s-at-home-search databases:

```bash
export KUBESEARCH_DB_PATH=/path/to/k8s-at-home-search/repos.db
export KUBESEARCH_DB_EXTENDED_PATH=/path/to/k8s-at-home-search/repos-extended.db
```

### Optional Environment Variables

- `LOG_LEVEL` - Logging level (default: info)
- `AUTHOR_WEIGHTS` - JSON object with author boost multipliers (see below)

### Author Weights Configuration

You can customize which chart authors get boosted in search results by setting the `AUTHOR_WEIGHTS` environment variable with a JSON object:

**Default weights** (if not specified):
```json
{
  "bjw-s": 1.1,
  "onedr0p": 1.1
}
```

**Examples:**
```bash
# Boost bjw-s charts by 100%
AUTHOR_WEIGHTS='{"bjw-s": 2.0}'

# Boost multiple authors
AUTHOR_WEIGHTS='{"bjw-s": 1.1, "ondr0p": 1.1}'

# Disable all author boosts
AUTHOR_WEIGHTS='{}'

# Custom weights
AUTHOR_WEIGHTS='{"my-favorite-author": 1.5}'
```

## Usage with MCP Clients

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Basic configuration:**
```json
{
  "mcpServers": {
    "kubesearch": {
      "command": "node",
      "args": ["/absolute/path/to/kubesearch-mcp-server/dist/index.js"],
      "env": {
        "KUBESEARCH_DB_PATH": "/home/russell/repos/k8s-at-home-search/repos.db",
        "KUBESEARCH_DB_EXTENDED_PATH": "/home/russell/repos/k8s-at-home-search/repos-extended.db"
      }
    }
  }
}
```

**With custom author weights:**
```json
{
  "mcpServers": {
    "kubesearch": {
      "command": "node",
      "args": ["/absolute/path/to/kubesearch-mcp-server/dist/index.js"],
      "env": {
        "KUBESEARCH_DB_PATH": "/home/russell/repos/k8s-at-home-search/repos.db",
        "KUBESEARCH_DB_EXTENDED_PATH": "/home/russell/repos/k8s-at-home-search/repos-extended.db",
        "AUTHOR_WEIGHTS": "{\"bjw-s\": 1.1, \"onedr0p\": 1.1, \"billimek\": 1.1}"
      }
    }
  }
}
```

**Note:** In JSON, you must escape quotes with `\"`. The value `"AUTHOR_WEIGHTS": "{\"bjw-s\": 1.5}"` becomes `{"bjw-s": 1.5}` when parsed.

### Other MCP Clients

For other MCP-compatible clients, use the stdio transport with the compiled server:

```bash
node /path/to/kubesearch-mcp-server/dist/index.js
```

## Available Tools

### 1. `search_helm_charts`

Search for Helm charts by name and get **individual deployment examples** from community members, ranked by repository quality (stars) and author reputation.

**Parameters:**
- `query` (string, required) - Chart or release name (e.g., "plex", "traefik")
- `limit` (number, optional) - Max results to return (default: 10)

**Example:**
```typescript
{
  "query": "radarr",
  "limit": 3
}
```

**Returns individual deployments:**
```json
[
  {
    "name": "radarr",
    "chart": "radarr",
    "helmRepoURL": "oci://ghcr.io/bjw-s-labs/helm/app-template",
    "repo": "onedr0p/home-ops",
    "repoUrl": "https://github.com/onedr0p/home-ops",
    "stars": 2670,
    "version": "4.5.0",
    "deploymentUrl": "https://github.com/onedr0p/home-ops/.../radarr.yaml",
    "key": "ghcr.io-bjw-s-labs-helm-app-template-radarr",
    "score": 304.7
  }
]
```

### 2. `get_chart_details`

Get detailed information about a specific Helm chart including repositories using it and popular configuration values.

**Parameters:**
- `key` (string, required) - Chart key from search results
- `includeValues` (boolean, optional) - Include values analysis (default: true)
- `valuesLimit` (number, optional) - Max value variations per path (default: 5, max: 10)
- `pathsLimit` (number, optional) - Max configuration paths to return (default: 10, max: 20)
- `valuePath` (string, optional) - Filter to specific configuration path prefix (e.g., "persistence")

**Examples:**
```typescript
// Get all chart details
{
  "key": "ghcr.io-bjw-s-helm-plex",
  "includeValues": true
}

// Filter to only persistence-related configurations
{
  "key": "ghcr.io-bjw-s-helm-plex",
  "valuePath": "persistence",
  "valuesLimit": 5
}

// Focus on ingress settings
{
  "key": "ghcr.io-bjw-s-helm-traefik",
  "valuePath": "ingress"
}

// Get more paths and values (within limits)
{
  "key": "ghcr.io-bjw-s-helm-plex",
  "pathsLimit": 20,
  "valuesLimit": 10
}
```

**Important - Avoiding Token Limits:**
- Broad searches (e.g., `valuePath: "persistence"`) can return large results
- Use `get_chart_index` first to explore available paths
- Then target specific paths (e.g., `valuePath: "persistence.incomplete"`)
- Keep `valuesLimit` low (5 or less) for exploratory queries
- Upper bounds are enforced: `valuesLimit` max 10, `pathsLimit` max 20

**Returns:**
- Chart metadata (name, helm repo URL)
- Popular Helm values with all variations sorted by repository quality
- Statistics (total repos, avg stars, latest version)

### 3. `get_chart_index`

Explore what configuration paths are available in a chart by listing all paths found across real-world deployments. This helps discover what settings can be configured before diving into the actual values.

**Parameters:**
- `key` (string, required) - Chart key from search results
- `searchPath` (string, optional) - Filter to paths starting with this prefix (e.g., "persistence")

**Examples:**
```typescript
// List all available configuration paths
{
  "key": "ghcr.io-bjw-s-helm-plex"
}

// Explore only persistence-related paths
{
  "key": "ghcr.io-bjw-s-helm-plex",
  "searchPath": "persistence"
}

// See what ingress configurations are available
{
  "key": "ghcr.io-bjw-s-helm-traefik",
  "searchPath": "ingress"
}
```

**Returns:**
```json
{
  "name": "plex",
  "chartName": "plex",
  "totalDeployments": 25,
  "paths": [
    {
      "path": "persistence.config.enabled",
      "usageCount": 25
    },
    {
      "path": "persistence.config.existingClaim",
      "usageCount": 24
    },
    {
      "path": "persistence.media.enabled",
      "usageCount": 23
    },
    {
      "path": "persistence.media.type",
      "usageCount": 20
    }
  ]
}
```

**Use cases:**
- "What can I configure in this chart?" - Get the full index
- "What persistence options exist?" - Filter with `searchPath: "persistence"`
- "How is ingress typically configured?" - Filter with `searchPath: "ingress"`
- Token-efficient exploration before requesting full values with `get_chart_details`

### 4. `search_container_images`

Find deployments using specific container images.

**Parameters:**
- `image` (string, required) - Image repository to search for
- `limit` (number, optional) - Max results (default: 20)

**Example:**
```typescript
{
  "image": "ghcr.io/linuxserver/plex",
  "limit": 5
}
```

**Returns:**
```json
[
  {
    "repository": "ghcr.io/linuxserver/plex",
    "tags": [
      {
        "tag": "latest",
        "usageCount": 45,
        "deployments": [
          {
            "repoName": "user/k8s-cluster",
            "repoUrl": "https://github.com/..."
          }
        ]
      }
    ]
  }
]
```

## Development

### Run in Development Mode

```bash
# With tsx watch mode
npm run watch

# Or with tsx dev mode
npm run dev
```

### Project Structure

```
kubesearch-mcp-server/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── types/
│   │   └── kubesearch.ts          # Type definitions
│   ├── services/
│   │   ├── database.ts            # SQLite connection manager
│   │   └── data-collector.ts     # SQL queries and data aggregation
│   ├── tools/
│   │   ├── search-helm-charts.ts
│   │   ├── get-chart-details.ts
│   │   └── search-container-images.ts
│   └── utils/
│       └── scoring.ts             # Search scoring algorithm
├── dist/                          # Compiled JavaScript (generated)
├── package.json
└── tsconfig.json
```

## How It Works

1. **Database Access** - Opens read-only connections to both SQLite databases
2. **Data Collection** - Executes SQL queries to aggregate releases, repositories, and values
3. **Search Scoring** - Uses weighted scoring algorithm (exact match: 10pts, usage count: 5pts/use)
4. **Value Flattening** - Walks YAML value trees to create searchable paths
5. **MCP Protocol** - Exposes tools via stdio transport for MCP clients

## Technical Details

### Search Algorithm

The search scoring algorithm ranks **individual deployments** based on repository quality and author reputation:

```typescript
baseScore = fullMatchScore - lengthScore + starsScore
finalScore = baseScore * authorMultiplier

// fullMatchScore: 10 if exact match
// lengthScore: (name.length - query.length) * 1
// starsScore: stars * 0.1 (individual repository quality)
// authorMultiplier: configurable per repository owner (default: bjw-s 1.1, onedr0p 1.1)
```

**Scoring Components:**

1. **Exact Match** (+10 points): Perfect name matches get a bonus
2. **GitHub Stars** (+0.1 points per star): Individual repository quality indicator
3. **Name Length** (-1 point per extra character): Concise names preferred
4. **Author Boost** (×1.1 default): Preferred community members' deployments get multiplier

**Important:** Author boost applies to the **repository owner** (e.g., onedr0p, bjw-s), not the chart maintainer.

**Example: "radarr" search results**

1. **onedr0p/home-ops** (2670 stars):
   - Base: 10 (exact) + 267 (2670×0.1) = 277
   - Final: 277 × 1.1 (onedr0p author boost) = **304.7**

2. **billimek/k8s-gitops** (748 stars):
   - Base: 10 + 74.8 = 84.8
   - Final: **84.8** (no author boost)

3. **bjw-s/home-ops** (395 stars):
   - Base: 10 + 39.5 = 49.5
   - Final: 49.5 × 1.1 (bjw-s author boost) = **54.5**

**Stars Impact:**
- 100 stars = +10 points
- Uses individual repository stars (not averaged)
- Directly rewards high-quality, well-maintained repositories

**Author Weighting:**
- Boosts deployments from preferred community members
- Configured via `AUTHOR_WEIGHTS` environment variable
- Default: `{"bjw-s": 1.1, "onedr0p": 1.1}`

## Troubleshooting

### "Database not found" error

Ensure the database paths are correct and the files exist:

```bash
ls -lh /path/to/repos.db
ls -lh /path/to/repos-extended.db
```

### "Failed to open databases" error

Check file permissions - the server needs read access to both database files.

### No results returned

The databases may be empty or out of date. Rebuild the k8s-at-home-search databases following their documentation.

## License

MIT

## Credits

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Data from [k8s-at-home-search](https://kubesearch.dev) by [@onedr0p](https://github.com/onedr0p)
- Indexes real-world Kubernetes configurations from the k8s-at-home community
