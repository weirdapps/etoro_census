#!/bin/bash
# Monitor GitHub Actions workflow and Vercel deployment

RUN_ID=${1:-""}

if [ -z "$RUN_ID" ]; then
    echo "Usage: $0 <run-id>"
    echo "Example: $0 20511952942"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Deployment Monitor - Run ID: $RUN_ID${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# Get workflow info
WORKFLOW_DATA=$(gh run view $RUN_ID --repo weirdapps/etoro_census --json status,conclusion,startedAt,updatedAt,displayTitle 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to fetch workflow data${NC}"
    exit 1
fi

STATUS=$(echo "$WORKFLOW_DATA" | jq -r '.status')
CONCLUSION=$(echo "$WORKFLOW_DATA" | jq -r '.conclusion')
STARTED=$(echo "$WORKFLOW_DATA" | jq -r '.startedAt')
UPDATED=$(echo "$WORKFLOW_DATA" | jq -r '.updatedAt')

# Calculate runtime
START_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$STARTED" "+%s" 2>/dev/null)
CURRENT_EPOCH=$(date +%s)
RUNTIME=$((CURRENT_EPOCH - START_EPOCH))
RUNTIME_MIN=$((RUNTIME / 60))

echo -e "${YELLOW}GitHub Actions Workflow:${NC}"
echo -e "  Status: ${YELLOW}$STATUS${NC}"
echo -e "  Runtime: ${RUNTIME_MIN} minutes"
echo -e "  Started: $STARTED"

if [ "$STATUS" = "completed" ]; then
    if [ "$CONCLUSION" = "success" ]; then
        echo -e "  Result: ${GREEN}✓ SUCCESS${NC}\n"
    else
        echo -e "  Result: ${RED}✗ $CONCLUSION${NC}\n"
    fi
else
    echo -e "  Expected completion: ~$(($START_EPOCH + 4200)) (in $((70 - RUNTIME_MIN)) minutes)\n"
fi

# Check Vercel deployments
echo -e "${YELLOW}Recent Vercel Deployments:${NC}"
vercel ls etoro-census 2>&1 | head -8 | tail -5

echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Next check in 5 minutes...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
