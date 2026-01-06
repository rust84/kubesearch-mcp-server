# KubeSearch MCP Server

An MCP (Model Context Protocol) server that provides tools to query [k8s-at-home-search](https://kubesearch.dev) for real-world Helm deployment examples from the Kubernetes homelab community.

## Features

- **Search Deployments** - Find real-world deployment examples from community repositories to learn how others configure charts
- **List Chart Sources** - Compare all available chart sources (official repos, mirrors, community forks) with deployment counts
- **Chart Details** - Get detailed information about specific charts including popular configuration values with all variations sorted by repository quality
- **Chart Index** - Explore available configuration paths in a chart to discover what can be configured
- **Chart Statistics** - Get metrics about chart adoption, version distribution, and top repositories using the chart
- **Image Search** - Find deployments using specific container images

## Data Source

This MCP server queries a local k8s-at-home-search SQLite database containing:
- 16,240+ Flux HelmReleases
- 4,708+ Helm Repositories
- 147+ Argo CD Applications
- Real-world configuration values from the k8s-at-home community

## Docker Usage (**Recommended**)

### Quick Start

Pull and run the pre-built image from GitHub Container Registry:

```bash
# Pull the latest image
docker pull ghcr.io/rust84/kubesearch-mcp-server:latest

# Run with database volumes (REQUIRED)
docker run --init -i \
  -v $(pwd)/repos.db:/data/repos.db:ro \
  -v $(pwd)/repos-extended.db:/data/repos-extended.db:ro \
  ghcr.io/rust84/kubesearch-mcp-server:latest
```

**Important:** The Docker image does NOT include databases. You must mount your database files at `/data/repos.db` and `/data/repos-extended.db`.

### Using with Claude Desktop

Add to your Claude Desktop configuration (`~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kubesearch": {
      "command": "docker",
      "args": [
        "run",
        "--init",
        "-i",
        "--rm",
        "-v", "/absolute/path/to/repos.db:/data/repos.db:ro",
        "-v", "/absolute/path/to/repos-extended.db:/data/repos-extended.db:ro",
        "ghcr.io/rust84/kubesearch-mcp-server:latest"
      ]
    }
  }
}
```

**Note:** Replace `/absolute/path/to/` with the actual absolute path to your database files.

### Building Locally

```bash
# Build the image
docker build -t kubesearch-mcp-server .

# Run your local build
docker run --init -i \
  -v $(pwd)/repos.db:/data/repos.db:ro \
  -v $(pwd)/repos-extended.db:/data/repos-extended.db:ro \
  kubesearch-mcp-server
```

### Database Requirements

The container requires two SQLite database files to be mounted:

- **repos.db** (~5.5 MB) - Main database
- **repos-extended.db** (~29 MB) - Extended data

**Mount location:** `/data/`

These files are NOT included in the Docker image. You must:
1. Download the databases (see Prerequisites section below)
2. Mount them as read-only volumes when running the container

### Environment Variables

Configure the server using environment variables:

- `KUBESEARCH_DB_PATH` - Path to main database (default: `/data/repos.db`)
- `KUBESEARCH_DB_EXTENDED_PATH` - Path to extended database (default: `/data/repos-extended.db`)
- `LOG_LEVEL` - Logging level: `debug`, `info`, `warn`, `error` (default: `info`)
- `AUTHOR_WEIGHTS` - JSON object for author scoring (default: `{"bjw-s": 1.5}`)

Example with custom environment:

```bash
docker run --init -i \
  -e LOG_LEVEL=debug \
  -e 'AUTHOR_WEIGHTS={"bjw-s": 1.5, "onedr0p": 1.2}' \
  -v $(pwd)/repos.db:/data/repos.db:ro \
  -v $(pwd)/repos-extended.db:/data/repos-extended.db:ro \
  kubesearch-mcp-server
```

### Multi-Platform Support

The image supports both AMD64 and ARM64 architectures:

```bash
# Pull specific platform
docker pull --platform linux/amd64 ghcr.io/rust84/kubesearch-mcp-server:latest
docker pull --platform linux/arm64 ghcr.io/rust84/kubesearch-mcp-server:latest
```

Works on:
- x86_64 Linux/Windows/macOS
- Apple Silicon (M1/M2/M3)
- ARM64 servers (AWS Graviton, etc.)

## Prerequisites

1. **Node.js 18+** installed on your system
2. **k8s-at-home-search databases** - You need local access to:
   - `repos.db` - Main database with release and repository metadata
   - `repos-extended.db` - Extended database with Helm values

### Getting the Databases

**Option 1: Download pre-built databases (Recommended)**

Use the included download script to fetch the latest databases from GitHub releases:

```bash
# Download to current directory
./download-databases.sh

# Or use npm script
npm run download-db

# Or specify custom directory
DOWNLOAD_DIR=/path/to/databases ./download-databases.sh
```

**Requirements:**
- `wget` or `curl` (usually pre-installed)
- `jq` - Install with: `sudo apt-get install jq` (Ubuntu/Debian) or `brew install jq` (macOS)

The script will download:
- `repos.db` (~5.7 MB) - Main database
- `repos-extended.db` (~29.8 MB) - Extended database

**Option 2: Build from source**

Clone and build the k8s-at-home-search project:

```bash
git clone https://github.com/whazor/k8s-at-home-search
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

### 1. `search_deployments`

Search for real-world **deployment examples** from community repositories. Returns individual deployments showing how users configure and deploy Helm charts, ranked by repository quality (stars) and author reputation. Use this to find example configurations to learn from.

**Parameters:**
- `query` (string, required) - Chart or release name (e.g., "plex", "traefik")
- `limit` (number, optional) - Max results to return (default: 10, max: 100)

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

### 2. `list_chart_sources`

List all available chart sources (helm repositories) for a given chart name with deployment counts. Compare official repos vs mirrors vs community forks to choose the most popular/reliable source.

**Parameters:**
- `query` (string, required) - Chart or release name to search for (e.g., "openebs", "plex")
- `minCount` (number, optional) - Minimum number of repositories required to include a chart (default: 3)

**Examples:**
```typescript
// Find all chart paths for "openebs"
{
  "query": "openebs",
  "minCount": 3
}

// Include even rarely-used charts
{
  "query": "plex",
  "minCount": 1
}
```

**Returns:**
```json
[
  {
    "name": "openebs",
    "chart": "openebs",
    "helmRepoURL": "oci://ghcr.io/home-operations/charts-mirror/openebs",
    "key": "ghcr.io-home-operations-charts-mirror-openebs-openebs",
    "count": 74,
    "icon": null
  },
  {
    "name": "openebs",
    "chart": "openebs",
    "helmRepoURL": "https://openebs.github.io/openebs",
    "key": "openebs.github.io-openebs-openebs-openebs",
    "count": 47,
    "icon": null
  }
]
```

**Use cases:**
- "Show me all the different sources for this chart" - Compare official vs mirror vs community repos
- "Which chart path is most popular?" - See deployment counts to choose the most reliable source
- "Are there multiple versions of this chart?" - Discover different helm repo sources
- Token-efficient overview before diving into specific chart details

### 3. `get_chart_details`

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

### 5. `get_chart_stats`

Get statistics and metrics about a specific Helm chart source including deployment count, repository quality metrics (stars), version distribution, and top repositories. Requires a chart key from `list_chart_sources` or `search_deployments`.

**Parameters:**
- `key` (string, required) - Chart key (e.g., "ghcr.io-home-operations-charts-mirror-openebs-openebs")

**Examples:**
```typescript
// Get stats for a specific chart source
{
  "key": "ghcr.io-bjw-s-helm-plex"
}

// Typical workflow: first list sources, then get stats
// 1. Use list_chart_sources to find: key = "ghcr.io-home-operations-charts-mirror-openebs-openebs"
// 2. Then get stats for that specific source:
{
  "key": "ghcr.io-home-operations-charts-mirror-openebs-openebs"
}
```

**Returns:**
```json
{
  "name": "plex",
  "chartName": "app-template",
  "helmRepoURL": "oci://ghcr.io/bjw-s-labs/helm/app-template",
  "helmRepoName": "app-template",
  "icon": "plex.png",
  "statistics": {
    "totalDeployments": 67,
    "minStars": 0,
    "maxStars": 2670,
    "latestVersion": "4.5.0"
  },
  "topRepositories": [
    {
      "repo": "onedr0p/home-ops",
      "repoUrl": "https://github.com/onedr0p/home-ops",
      "stars": 2670,
      "version": "4.5.0"
    },
    {
      "repo": "billimek/k8s-gitops",
      "repoUrl": "https://github.com/billimek/k8s-gitops",
      "stars": 748,
      "version": "4.5.0"
    }
  ],
  "versionDistribution": [
    {
      "version": "4.5.0",
      "count": 45
    },
    {
      "version": "3.2.0",
      "count": 12
    },
    {
      "version": "3.1.0",
      "count": 10
    }
  ]
}
```

**Use cases:**
- "How many people are using this chart?" - Check totalDeployments
- "What's the most popular version?" - See versionDistribution
- "Which high-quality repos use this?" - View topRepositories sorted by stars
- Quick overview before diving into detailed values

### 6. `search_container_images`

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

### Testing

The project uses [Vitest](https://vitest.dev/) for unit and integration testing.

**Run tests:**
```bash
# Run tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Open interactive test UI in browser
npm run test:ui
```

**Testing approach:**
- **Unit tests** - Pure functions, utilities, services (with mocked dependencies)
- **Integration tests** - MCP tools with mocked data collectors
- **Mocking** - Database interactions mocked to avoid external dependencies
- **Fixtures** - Reusable test data in `src/test/fixtures.ts`

**CI/CD:**
Tests run automatically on every push and pull request via GitHub Actions. Coverage reports are generated and enforced (80% minimum threshold).

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

## Releases

This project uses semantic versioning and automated releases via GitHub Actions.

### Using Released Versions

Every release produces multi-platform Docker images published to GitHub Container Registry:

```bash
# Pull specific version
docker pull ghcr.io/rust84/kubesearch-mcp-server:1.0.1

# Pull latest stable
docker pull ghcr.io/rust84/kubesearch-mcp-server:latest

# Pull by major version (gets latest 1.x.x)
docker pull ghcr.io/rust84/kubesearch-mcp-server:1

# Pull by major.minor version (gets latest 1.0.x)
docker pull ghcr.io/rust84/kubesearch-mcp-server:1.0
```

**Available tags:**
- `latest` - Latest stable release from main branch
- `1.2.3` - Specific version (semantic versioning)
- `1.2` - Latest patch version for minor release
- `1` - Latest minor/patch version for major release

**View all releases:** [GitHub Releases](https://github.com/rust84/kubesearch-mcp-server/releases)

### Creating a Release

Releases are automated when you create and push a version tag:

1. **Update version and create tag**:
   ```bash
   npm version patch  # or minor, or major
   ```

   This automatically:
   - Updates `package.json` and `package-lock.json`
   - Creates a git commit
   - Creates a git tag (e.g., `v0.0.2`)

2. **Push commit and tag**:
   ```bash
   git push --follow-tags
   ```

3. **GitHub Actions automatically**:
   - ✅ Validates tag format (must be `v*.*.*`)
   - ✅ Runs CI quality checks (type check, build, security scan)
   - ✅ Builds multi-platform Docker images (amd64, arm64)
   - ✅ Generates changelog from commits and PRs
   - ✅ Creates GitHub Release with changelog and Docker info
   - ✅ Publishes images to ghcr.io with appropriate tags

4. **Review and verify** (typically completes in 10-15 minutes):
   - Check [GitHub Actions](https://github.com/rust84/kubesearch-mcp-server/actions) workflow status
   - Review created release at [Releases](https://github.com/rust84/kubesearch-mcp-server/releases)
   - Test Docker image: `docker pull ghcr.io/rust84/kubesearch-mcp-server:0.0.2`

### Pre-releases

For beta or alpha releases:

```bash
# Set pre-release version
npm version 1.0.1-beta.1

# Push commit and tag
git push --follow-tags
```

Pre-release tags (with `-beta`, `-alpha`, etc.) create GitHub pre-releases that are not marked as "latest".

## Credits

- Data from [k8s-at-home-search](https://kubesearch.dev) by [@whazor](https://github.com/whazor)
- Indexes real-world Kubernetes configurations from the k8s-at-home community
