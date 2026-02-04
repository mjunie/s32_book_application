#!/bin/bash

# run-k6-tests.sh - Script to run k6 performance tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  K6 Performance Testing Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed!${NC}"
    echo ""
    echo -e "${YELLOW}To install k6:${NC}"
    echo ""
    echo -e "${GREEN}macOS:${NC}"
    echo "  brew install k6"
    echo ""
    echo -e "${GREEN}Windows (using chocolatey):${NC}"
    echo "  choco install k6"
    echo ""
    echo -e "${GREEN}Linux (Debian/Ubuntu):${NC}"
    echo "  sudo gpg -k"
    echo "  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
    echo "  echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' | sudo tee /etc/apt/sources.list.d/k6.list"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install k6"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ k6 is installed${NC}"
k6 version
echo ""

# Configuration
API_URL=${API_URL:-"http://localhost:8080"}
RESULTS_DIR="./k6-results"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check if API is running
echo -e "${YELLOW}🔍 Checking if API is running at ${API_URL}...${NC}"
if curl -sf "${API_URL}/health" > /dev/null; then
    echo -e "${GREEN}✅ API is running and healthy${NC}"
else
    echo -e "${RED}❌ API is not responding at ${API_URL}${NC}"
    echo -e "${YELLOW}💡 Make sure your Express API is running:${NC}"
    echo "   cd backend"
    echo "   npm run dev"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Select Test Type${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1) Load Test (Recommended - gradual ramp-up)"
echo "2) Spike Test (Sudden traffic spikes)"
echo "3) Soak Test (Long-duration stability)"
echo "4 Smoke Test (Quick validation)"
echo "5) Run All Tests"
echo ""
read -p "Enter your choice (1-6): " choice

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

run_test() {
    local test_file=$1
    local test_name=$2
    local output_file="${RESULTS_DIR}/${test_name}_${TIMESTAMP}"
    
    echo ""
    echo -e "${YELLOW}🚀 Running ${test_name}...${NC}"
    echo ""
    
    k6 run \
        --out json="${output_file}.json" \
        --summary-export="${output_file}_summary.json" \
        -e API_URL="${API_URL}" \
        "$test_file"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ ${test_name} completed successfully${NC}"
        echo -e "${BLUE}📊 Results saved to: ${output_file}.json${NC}"
    else
        echo -e "${RED}❌ ${test_name} failed${NC}"
    fi
    
    echo ""
    return $exit_code
}

smoke_test() {
    echo ""
    echo -e "${YELLOW}🔥 Running Smoke Test (Quick validation)${NC}"
    
    k6 run \
        --vus 1 \
        --duration 30s \
        -e API_URL="${API_URL}" \
        - <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';

export default function() {
    const res = http.get(\`\${BASE_URL}/books\`);
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(1);
}
EOF
}

case $choice in
    1)
        run_test "load-test.js" "load_test"
        ;;
    2)
        run_test "spike-test.js" "spike_test"
        ;;
    3)
        run_test "stress-test.js" "stress_test"
        ;;
    4)
        run_test "soak-test.js" "soak_test"
        ;;
    5)
        smoke_test
        ;;
    6)
        echo -e "${YELLOW}Running all tests sequentially...${NC}"
        smoke_test
        run_test "load-test.js" "load_test"
        run_test "spike-test.js" "spike_test"
        run_test "stress-test.js" "stress_test"
        echo -e "${YELLOW}⏭️  Skipping soak test (too long for batch run)${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Testing Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📊 View detailed results in: ${RESULTS_DIR}${NC}"
echo -e "${YELLOW}🔍 View traces in Jaeger: http://localhost:16686${NC}"
echo ""