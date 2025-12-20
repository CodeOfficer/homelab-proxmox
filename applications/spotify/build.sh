#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REGISTRY="${DOCKER_REGISTRY:-ghcr.io/codeofficer}"
TAG="${DOCKER_TAG:-latest}"

echo "Building Spotify Docker images..."
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo ""

# Build web UI
echo "Building spotify-web..."
docker build -t "$REGISTRY/spotify-web:$TAG" -f web/Dockerfile .
echo "✓ Built spotify-web"
echo ""

# TODO: Build MCP server
# echo "Building spotify-mcp..."
# docker build -t "$REGISTRY/spotify-mcp:$TAG" -f mcp/Dockerfile .

# TODO: Build sync job
# echo "Building spotify-sync..."
# docker build -t "$REGISTRY/spotify-sync:$TAG" -f sync/Dockerfile .

echo "================================================"
echo "Build complete!"
echo "================================================"
echo ""
echo "To push images to registry:"
echo "  docker push $REGISTRY/spotify-web:$TAG"
echo ""
echo "Or push all:"
echo "  docker push $REGISTRY/spotify-web:$TAG"
# echo "  docker push $REGISTRY/spotify-mcp:$TAG"
# echo "  docker push $REGISTRY/spotify-sync:$TAG"
echo ""
