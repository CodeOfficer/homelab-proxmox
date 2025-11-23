#!/usr/bin/env bash
# =============================================================================
# Application Deployment Script
# =============================================================================
# This script deploys applications to the K3s cluster using Helm
# Usage: ./scripts/deploy-app.sh <app-name>
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Application name
APP_NAME="$1"

if [ -z "$APP_NAME" ]; then
    echo -e "${RED}Error: Application name not specified${NC}"
    echo "Usage: $0 <app-name>"
    exit 1
fi

APP_DIR="applications/${APP_NAME}"

if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Application directory not found: ${APP_DIR}${NC}"
    exit 1
fi

echo -e "${BLUE}Deploying application: ${APP_NAME}${NC}"

# Check if deploy.sh exists in app directory
if [ -f "${APP_DIR}/deploy.sh" ]; then
    echo -e "${YELLOW}Found custom deploy script${NC}"
    cd "${APP_DIR}"
    ./deploy.sh
else
    echo -e "${RED}Error: No deploy.sh found in ${APP_DIR}${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully deployed ${APP_NAME}!${NC}"
