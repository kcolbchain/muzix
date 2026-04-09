#!/bin/bash

# Muzix OP Stack Testnet Deployment Script
# This script sets up a complete OP Stack testnet for Muzix chain

set -e

echo "🎵 Muzix OP Stack Testnet Deployment"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CHAIN_ID="1338"
L1_CHAIN_ID="1337"
NETWORK_NAME="muzix-testnet"
EXTERNAL_IP=$(curl -s ifconfig.me || echo "127.0.0.1")

# Check dependencies
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All dependencies satisfied${NC}"
}

# Generate secrets
generate_secrets() {
    echo -e "${YELLOW}Generating secrets...${NC}"
    
    # Generate JWT secret
    if [ ! -f config/jwt-secret.txt ]; then
        openssl rand -hex 32 > config/jwt-secret.txt
        echo -e "${GREEN}✓ JWT secret generated${NC}"
    fi
    
    # Generate P2P key
    if [ ! -f config/p2p-key.txt ]; then
        openssl rand -hex 32 > config/p2p-key.txt
        echo -e "${GREEN}✓ P2P key generated${NC}"
    fi
    
    # Create placeholder mnemonic files (user should update with real keys)
    if [ ! -f config/batcher-mnemonic.txt ]; then
        echo "test test test test test test test test test test test junk" > config/batcher-mnemonic.txt
        echo -e "${YELLOW}⚠ Created placeholder batcher mnemonic - UPDATE THIS!${NC}"
    fi
    
    if [ ! -f config/proposer-mnemonic.txt ]; then
        echo "test test test test test test test test test test test junk" > config/proposer-mnemonic.txt
        echo -e "${YELLOW}⚠ Created placeholder proposer mnemonic - UPDATE THIS!${NC}"
    fi
}

# Create directories
setup_directories() {
    echo -e "${YELLOW}Setting up directories...${NC}"
    
    mkdir -p config
    mkdir -p data/op-geth
    mkdir -p data/op-node
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    
    echo -e "${GREEN}✓ Directories created${NC}"
}

# Start services
start_services() {
    echo -e "${YELLOW}Starting Muzix testnet services...${NC}"
    
    export CHAIN_ID=$CHAIN_ID
    export L1_CHAIN_ID=$L1_CHAIN_ID
    export EXTERNAL_IP=$EXTERNAL_IP
    export BOOTNODES=""
    export L2_OUTPUT_ORACLE="0x0000000000000000000000000000000000000000"
    export L1_RPC_URL="https://goerli.infura.io/v3/YOUR_INFURA_KEY"
    
    docker-compose up -d
    
    echo -e "${GREEN}✓ Services started${NC}"
}

# Wait for services
wait_for_services() {
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    
    sleep 5
    
    # Check L1
    echo "Checking L1..."
    until curl -s -X POST http://localhost:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q "result"; do
        echo "Waiting for L1..."
        sleep 2
    done
    echo -e "${GREEN}✓ L1 ready${NC}"
    
    # Check L2
    echo "Checking L2..."
    until curl -s -X POST http://localhost:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q "result"; do
        echo "Waiting for L2..."
        sleep 2
    done
    echo -e "${GREEN}✓ L2 ready${NC}"
}

# Print status
print_status() {
    echo ""
    echo -e "${GREEN}🎵 Muzix Testnet is running!${NC}"
    echo "================================"
    echo "L1 RPC:     http://localhost:8545"
    echo "L2 RPC:     http://localhost:8545"
    echo "L2 WS:      ws://localhost:8546"
    echo "Explorer:   http://localhost:4000"
    echo "Grafana:    http://localhost:3000 (admin/admin)"
    echo "Prometheus: http://localhost:9090"
    echo ""
    echo "Chain ID:   $CHAIN_ID"
    echo "External IP: $EXTERNAL_IP"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  docker-compose logs -f op-geth    # View execution layer logs"
    echo "  docker-compose logs -f op-node    # View consensus layer logs"
    echo "  docker-compose down               # Stop all services"
    echo ""
}

# Main execution
main() {
    check_dependencies
    setup_directories
    generate_secrets
    start_services
    wait_for_services
    print_status
}

# Handle commands
case "${1:-}" in
    start)
        main
        ;;
    stop)
        echo -e "${YELLOW}Stopping Muzix testnet...${NC}"
        docker-compose down
        echo -e "${GREEN}✓ Testnet stopped${NC}"
        ;;
    restart)
        echo -e "${YELLOW}Restarting Muzix testnet...${NC}"
        docker-compose restart
        echo -e "${GREEN}✓ Testnet restarted${NC}"
        ;;
    logs)
        docker-compose logs -f
        ;;
    status)
        docker-compose ps
        ;;
    clean)
        echo -e "${YELLOW}Cleaning up...${NC}"
        docker-compose down -v
        rm -rf data/
        echo -e "${GREEN}✓ Cleanup complete${NC}"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|status|clean}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the Muzix testnet"
        echo "  stop    - Stop the Muzix testnet"
        echo "  restart - Restart all services"
        echo "  logs    - View logs"
        echo "  status  - Check service status"
        echo "  clean   - Stop and remove all data"
        exit 1
        ;;
esac
