# Contributing to KubeSearch MCP Server

Thank you for your interest in contributing to KubeSearch MCP Server! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Git
- k8s-at-home-search databases (see README for download instructions)

### Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/kubesearch-mcp-server.git
   cd kubesearch-mcp-server
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Download the databases:
   ```bash
   npm run download-db
   ```

5. Build the project:
   ```bash
   npm run build
   ```

6. Run in development mode:
   ```bash
   npm run dev
   ```

## Development Workflow

### Creating a Branch

Create a feature branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### Making Changes

1. Make your changes in the `src/` directory
2. Build to verify TypeScript compilation:
   ```bash
   npm run build
   ```

3. Type check your changes:
   ```bash
   npm run typecheck
   ```

4. Test manually using Claude Desktop or another MCP client

### Commit Messages

Follow conventional commit format:

```
feat: add new feature
fix: fix a bug
docs: update documentation
chore: update dependencies
refactor: refactor code without changing functionality
test: add or update tests
```

Examples:
- `feat: add container image search tool`
- `fix: correct database connection error handling`
- `docs: update README with new tool examples`
- `chore: bump dependencies`

### Pull Requests

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a pull request on GitHub
3. Fill in the PR template with:
   - Description of changes
   - Related issues (if any)
   - Testing performed

4. Wait for CI checks to pass:
   - TypeScript type checking
   - Build verification
   - Security scanning

5. Address any review feedback

## Release Process

### Version Numbering

This project follows [Semantic Versioning](https://semver.org/):

- **Major version (X.0.0)**: Breaking changes that require users to update their configuration or code
- **Minor version (0.X.0)**: New features that are backward compatible
- **Patch version (0.0.X)**: Bug fixes and minor improvements that are backward compatible

### Creating a Release

Releases are created by project maintainers. If you're a maintainer:

1. **Ensure main branch is ready**:
   - All desired changes are merged
   - CI is passing
   - No open blockers

2. **Update version and create tag**:
   ```bash
   # For a patch release (0.0.1 → 0.0.2)
   npm version patch

   # For a minor release (0.0.2 → 0.1.0)
   npm version minor

   # For a major release (0.1.0 → 1.0.0)
   npm version major
   ```

   This command automatically:
   - ✅ Updates `package.json` and `package-lock.json`
   - ✅ Creates a git commit with message like "0.0.2"
   - ✅ Creates a git tag `v0.0.2`

3. **Push commit and tag**:
   ```bash
   git push --follow-tags
   ```

   The `--follow-tags` flag pushes both the commit and any tags that point to it.

4. **GitHub Actions automatically**:
   - Validates the tag format
   - Runs all CI quality checks
   - Builds multi-platform Docker images (linux/amd64, linux/arm64)
   - Generates changelog from commit messages and PRs
   - Creates GitHub Release
   - Publishes Docker images to ghcr.io

5. **Monitor the release workflow**:
   - Visit [GitHub Actions](https://github.com/rust84/kubesearch-mcp-server/actions)
   - Watch the "Release" workflow build and publish
   - Typical release takes 10-15 minutes

6. **Verify the release**:
   - Check [Releases page](https://github.com/rust84/kubesearch-mcp-server/releases)
   - Review the auto-generated changelog
   - Test the Docker image:
     ```bash
     docker pull ghcr.io/rust84/kubesearch-mcp-server:0.0.2
     ```

### Pre-releases (Beta/Alpha)

For testing or early access releases:

1. **Create a pre-release version**:
   ```bash
   npm version 1.1.0-beta.1
   git push --follow-tags
   ```

2. **GitHub Actions will**:
   - Build and publish with the beta tag
   - Create a GitHub pre-release (not marked as "latest")
   - Skip updating the `latest` Docker tag

3. **Test the pre-release**:
   ```bash
   docker pull ghcr.io/rust84/kubesearch-mcp-server:1.1.0-beta.1
   ```

4. **When ready for stable release**:
   ```bash
   npm version minor  # Creates v1.1.0
   git push && git push --tags
   ```

### Troubleshooting Releases

#### Failed CI Checks

If CI checks fail during release:

1. View the workflow logs in GitHub Actions
2. Fix the issues identified
3. Delete the failed tag:
   ```bash
   git tag -d v1.0.1
   git push origin :refs/tags/v1.0.1
   ```
4. Re-create the tag after fixing:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

#### Docker Build Failures

If the Docker build fails:

1. Check the Docker build logs in GitHub Actions
2. Test the build locally:
   ```bash
   docker build -t kubesearch-mcp-server .
   ```
3. Fix the Dockerfile or build context issues
4. Delete and re-create the tag (see above)

#### Version Mismatch Warning

If you see a warning about package.json version not matching the tag:

- **Non-blocking**: The release will continue
- **Fix**: Update package.json in the next commit or patch release
- **Avoid**: Always run `npm version` before creating tags

#### Release Already Exists

If a release already exists for a tag:

1. Delete the existing release on GitHub
2. Delete the tag:
   ```bash
   git tag -d v1.0.1
   git push origin :refs/tags/v1.0.1
   ```
3. Re-create and push the tag

## Code Style

### TypeScript

- Use strict TypeScript mode (already configured)
- Provide type annotations for function parameters and return values
- Avoid `any` types when possible
- Use interfaces for complex types

### Formatting

- 2 spaces for indentation
- Use semicolons
- Single quotes for strings
- Trailing commas in objects and arrays

### File Organization

```
src/
├── index.ts              # MCP server entry point
├── types/                # TypeScript type definitions
├── services/             # Business logic and data access
├── tools/                # MCP tool implementations
└── utils/                # Utility functions
```

## Testing

Currently, the project uses a placeholder test script. When contributing tests:

1. Add test files alongside source files with `.test.ts` extension
2. Use a testing framework (Vitest recommended)
3. Run tests before committing:
   ```bash
   npm test
   ```

## Security

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email the maintainers privately (see package.json for contact info)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Security Scanning

All PRs and releases are automatically scanned for:

- Dependency vulnerabilities (npm audit)
- Container vulnerabilities (Trivy)
- Results are uploaded to GitHub Security tab

## License

By contributing to KubeSearch MCP Server, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## Recognition

Contributors will be recognized in:

- GitHub's contributor graph
- Release changelogs (automatic)
- Project credits

Thank you for contributing! 🚀
