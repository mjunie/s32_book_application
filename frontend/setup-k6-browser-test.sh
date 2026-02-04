# In your project root
#!/bin/bash

# run-angular-perf-tests.sh - Angular Performance Testing Suite

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Angular Performance Testing Suite${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Configuration
APP_URL=${APP_URL:-"http://localhost:4200"}
API_URL=${API_URL:-"http://localhost:8080"}
RESULTS_DIR="./performance-results"

# Create results directory
mkdir -p "$RESULTS_DIR"
mkdir -p "$RESULTS_DIR/screenshots"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if Angular app is running
echo -e "${YELLOW} Checking if Angular app is running at ${APP_URL}...${NC}"
if curl -sf "${APP_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN} Angular app is running${NC}"
else
    echo -e "${RED} Angular app is not running at ${APP_URL}${NC}"
    echo -e "${YELLOW} Start your Angular app:${NC}"
    echo "   cd frontend"
    echo "   npm start"
    echo ""
    exit 1
fi

# Check if API is running
echo -e "${YELLOW} Checking if API is running at ${API_URL}...${NC}"
if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN} API is running and healthy${NC}"
else
    echo -e "${YELLOW}  API is not responding - some tests may fail${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Select Performance Test Type${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1) Browser Tests (K6 - Real browser automation)"
# echo "2) Lighthouse (Google's performance audit)"
# echo "3) Bundle Size Analysis"
# echo "4) Run All Tests"
# echo "5) Quick Smoke Test"
echo ""
read -p "Enter your choice (1-5): " choice

run_k6_browser_test() {
    echo ""
    echo -e "${YELLOW}🎭 Running K6 Browser Tests...${NC}"
    echo ""
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED} k6 is not installed!${NC}"
        echo ""
        echo -e "${YELLOW}To install k6:${NC}"
        echo "  macOS: brew install k6"
        echo "  Or visit: https://k6.io/docs/getting-started/installation/"
        return 1
    fi
    
    # Run K6 browser test
    k6 run \
        --out json="${RESULTS_DIR}/k6-browser-results.json" \
        -e APP_URL="${APP_URL}" \
        k6-tests/browser-test.js
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}K6 Browser tests completed${NC}"
        echo -e "${BLUE} Results: ${RESULTS_DIR}/k6-browser-results.json${NC}"
        echo -e "${BLUE} Screenshots: ${RESULTS_DIR}/screenshots/${NC}"
    else
        echo -e "${RED} K6 Browser tests failed${NC}"
    fi
    
    return $exit_code
}

# run_lighthouse_test() {
#     echo ""
#     echo -e "${YELLOW}💡 Running Lighthouse Performance Audit...${NC}"
#     echo ""
    
#     # Check if lighthouse is installed
#     if ! command -v lighthouse &> /dev/null; then
#         echo -e "${YELLOW}📦 Installing lighthouse...${NC}"
#         npm install -g lighthouse
#     fi
    
#     # Run Lighthouse
#     lighthouse "${APP_URL}" \
#         --output html \
#         --output json \
#         --output-path "${RESULTS_DIR}/lighthouse-report" \
#         --chrome-flags="--headless --no-sandbox" \
#         --only-categories=performance,accessibility,best-practices,seo \
#         --throttling-method=simulate \
#         --quiet
    
#     local exit_code=$?
    
#     if [ $exit_code -eq 0 ]; then
#         echo -e "${GREEN}✅ Lighthouse audit completed${NC}"
#         echo -e "${BLUE}📊 HTML Report: ${RESULTS_DIR}/lighthouse-report.report.html${NC}"
#         echo -e "${BLUE}📊 JSON Report: ${RESULTS_DIR}/lighthouse-report.report.json${NC}"
        
#         # Extract and display key metrics
#         if command -v jq &> /dev/null; then
#             echo ""
#             echo -e "${CYAN}📊 Key Metrics:${NC}"
#             jq -r '.categories | to_entries[] | "\(.key): \(.value.score * 100 | floor)%"' \
#                 "${RESULTS_DIR}/lighthouse-report.report.json"
#         fi
#     else
#         echo -e "${RED}❌ Lighthouse audit failed${NC}"
#     fi
    
#     return $exit_code
# }

# run_bundle_analysis() {
#     echo ""
#     echo -e "${YELLOW}📦 Analyzing Bundle Size...${NC}"
#     echo ""
    
#     # Navigate to Angular project
#     if [ ! -d "books-frontend-angular21" ]; then
#         echo -e "${RED}❌ Angular project directory not found${NC}"
#         return 1
#     fi
    
#     cd books-frontend-angular21
    
#     echo "Building production bundle with stats..."
#     npm run build -- --stats-json
    
#     # Check if webpack-bundle-analyzer is available
#     if ! command -v webpack-bundle-analyzer &> /dev/null; then
#         echo -e "${YELLOW}📦 Installing webpack-bundle-analyzer...${NC}"
#         npm install -g webpack-bundle-analyzer
#     fi
    
#     # Analyze the bundle
#     webpack-bundle-analyzer dist/books-frontend-angular21/browser/stats.json \
#         --mode static \
#         --report "../${RESULTS_DIR}/bundle-analysis.html" \
#         --no-open
    
#     echo ""
#     echo -e "${GREEN}✅ Bundle analysis complete${NC}"
#     echo -e "${BLUE}📊 Report: ${RESULTS_DIR}/bundle-analysis.html${NC}"
    
#     # Display bundle sizes
#     echo ""
#     echo -e "${CYAN}📊 Bundle Sizes:${NC}"
#     du -h dist/books-frontend-angular21/browser/*.js 2>/dev/null | sort -h || echo "No JS files found"
    
#     cd ..
# }

# run_quick_smoke_test() {
#     echo ""
#     echo -e "${YELLOW}🔥 Running Quick Smoke Test...${NC}"
#     echo ""
    
#     # Test basic page load
#     echo "Testing page load..."
#     time curl -s "${APP_URL}" > /dev/null
    
#     # Test API endpoints
#     echo "Testing API health..."
#     curl -sf "${API_URL}/health" || echo "API health check failed"
    
#     echo "Testing books endpoint..."
#     curl -sf "${API_URL}/books" > /dev/null || echo "Books endpoint failed"
    
#     # Quick lighthouse test
#     echo ""
#     echo "Running quick Lighthouse test (performance only)..."
    
#     if command -v lighthouse &> /dev/null; then
#         lighthouse "${APP_URL}" \
#             --output json \
#             --output-path "${RESULTS_DIR}/smoke-lighthouse.json" \
#             --chrome-flags="--headless --no-sandbox" \
#             --only-categories=performance \
#             --quiet \
#             --max-wait-for-load=15000
        
#         if [ $? -eq 0 ]; then
#             if command -v jq &> /dev/null; then
#                 score=$(jq -r '.categories.performance.score * 100 | floor' \
#                     "${RESULTS_DIR}/smoke-lighthouse.json" 2>/dev/null)
#                 if [ ! -z "$score" ]; then
#                     echo ""
#                     echo -e "${CYAN}Performance Score: ${score}/100${NC}"
#                 fi
#             fi
#         fi
#     else
#         echo "Lighthouse not installed, skipping..."
#     fi
    
#     echo ""
#     echo -e "${GREEN}✅ Smoke test complete${NC}"
# }

# Execute based on choice
case $choice in
    1)
        run_k6_browser_test
        ;;
    # 2)
    #     run_lighthouse_test
    #     ;;
    # 3)
    #     run_bundle_analysis
    #     ;;
    # 4)
    #     echo -e "${YELLOW}Running all tests...${NC}"
    #     run_quick_smoke_test
    #     run_lighthouse_test
    #     run_k6_browser_test
    #     run_bundle_analysis
    #     ;;
    # 5)
    #     run_quick_smoke_test
        # ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} Performance Testing Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW} Results saved in: ${RESULTS_DIR}${NC}"
echo -e "${YELLOW} View traces in Jaeger: http://localhost:16686${NC}"
echo ""


