#!/usr/bin/env bash

# Download the latest k8s-at-home-search databases from GitHub releases
#
# This script downloads the SQLite database files from the latest release
# of whazor/k8s-at-home-search for use with the kubesearch-mcp-server.
#
# Usage: ./download-databases.sh [DOWNLOAD_DIR]
#
# Environment Variables:
#   DOWNLOAD_DIR - Directory to download databases to (default: current directory)
#
# Examples:
#   ./download-databases.sh
#   DOWNLOAD_DIR=/path/to/databases ./download-databases.sh

set -euo pipefail

# Configuration
GITHUB_REPO="whazor/k8s-at-home-search"
API_URL="https://api.github.com/repos/${GITHUB_REPO}/releases"

# Use DOWNLOAD_DIR from environment, command line arg, or default to current directory
if [ $# -gt 0 ]; then
    DOWNLOAD_DIR="$1"
elif [ -z "${DOWNLOAD_DIR:-}" ]; then
    DOWNLOAD_DIR="."
fi

# Get latest release tag
LATEST_TAG=""

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    local missing=0

    if ! command -v wget &> /dev/null && ! command -v curl &> /dev/null; then
        log_error "Neither wget nor curl is installed. Please install one of them."
        missing=1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it:"
        echo "  - Ubuntu/Debian: sudo apt-get install jq"
        echo "  - macOS: brew install jq"
        echo "  - Fedora/RHEL: sudo dnf install jq"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 1
    fi
}

# Get the latest release tag from GitHub API
get_latest_release() {
    log_info "Fetching latest release information..."

    local response
    if command -v curl &> /dev/null; then
        response=$(curl -s "$API_URL")
    elif command -v wget &> /dev/null; then
        response=$(wget -qO- "$API_URL")
    fi

    if [ -z "$response" ]; then
        log_error "Failed to fetch release information from GitHub API"
        return 1
    fi

    # Get the first (most recent) release tag, including prereleases
    LATEST_TAG=$(echo "$response" | jq -r '.[0].tag_name')

    if [ -z "$LATEST_TAG" ] || [ "$LATEST_TAG" = "null" ]; then
        log_error "Failed to parse release tag from GitHub API response"
        return 1
    fi

    log_info "Latest release: ${LATEST_TAG}"
    return 0
}

# Download file using wget or curl
download_file() {
    local url=$1
    local output=$2

    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "$output" "$url"
    elif command -v curl &> /dev/null; then
        curl -L --progress-bar -o "$output" "$url"
    fi
}

# Download a database file
download_database() {
    local filename=$1
    local url="https://github.com/${GITHUB_REPO}/releases/download/${LATEST_TAG}/${filename}"

    log_info "Downloading ${filename}..."

    # Download file
    if ! download_file "$url" "${DOWNLOAD_DIR}/${filename}"; then
        log_error "Failed to download ${filename}"
        return 1
    fi

    # Display file size
    local size=$(du -h "${DOWNLOAD_DIR}/${filename}" | cut -f1)
    log_info "Downloaded ${filename} (${size})"

    return 0
}

# Main execution
main() {
    log_info "K8s-at-home-search Database Downloader"
    log_info "Repository: ${GITHUB_REPO}"
    log_info "Download directory: ${DOWNLOAD_DIR}"
    echo

    # Check dependencies
    check_dependencies

    # Get latest release tag
    if ! get_latest_release; then
        exit 1
    fi

    echo

    # Create download directory if it doesn't exist
    mkdir -p "${DOWNLOAD_DIR}"

    # Download databases
    log_info "Starting database downloads..."
    echo

    if ! download_database "repos.db"; then
        log_error "Failed to download repos.db"
        exit 1
    fi

    echo

    if ! download_database "repos-extended.db"; then
        log_error "Failed to download repos-extended.db"
        exit 1
    fi

    echo
    log_info "✓ All databases downloaded successfully!"
    echo
    log_info "Database files are ready at:"
    echo "  - ${DOWNLOAD_DIR}/repos.db"
    echo "  - ${DOWNLOAD_DIR}/repos-extended.db"
    echo
    log_info "You can now use these databases with kubesearch-mcp-server"
}

main "$@"
