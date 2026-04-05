# Muzix OP Stack Testnet

Complete OP Stack deployment for Muzix chain testnet.

## Overview

This deployment includes:
- **L1**: Local Ethereum node (Anvil) for testing
- **op-geth**: Execution layer client
- **op-node**: Consensus/rollup node
- **op-batcher**: Transaction batcher
- **op-proposer**: Output proposer
- **Blockscout**: Block explorer
- **Monitoring**: Prometheus + Grafana

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB+ RAM
- 50GB+ disk space

### Deploy

```bash
# Clone and enter directory
cd node

# Start testnet
./deploy.sh start

# Or manually with docker-compose
docker-compose up -d
```

### Access Services

| Service | URL | Notes |
|---------|-----|-------|
| L2 RPC | http://localhost:8545 | Main JSON-RPC endpoint |
| L2 WS | ws://localhost:8546 | WebSocket endpoint |
| Block Explorer | http://localhost:4000 | Blockscout UI |
| Grafana | http://localhost:3000 | admin/admin |
| Prometheus | http://localhost:9090 | Metrics |

### Chain Configuration

- **Chain ID**: 1338
- **Block Time**: 2 seconds
- **Gas Limit**: 30,000,000
- **Network Name**: Muzix Testnet

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        L1 (Ethereum)                         │
│                    (Anvil local node)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    op-node (Consensus)                       │
│              - Sequencer, Batcher, Proposer                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    op-geth (Execution)                       │
│              - EVM execution, state storage                  │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Rollup Config (`config/rollup.json`)

Key parameters:
- `block_time`: 2 seconds
- `max_sequencer_drift`: 600 seconds
- `seq_window_size`: 3600 blocks
- `channel_timeout`: 300 seconds

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CHAIN_ID` | L2 chain ID | 1338 |
| `EXTERNAL_IP` | Node external IP | auto-detect |
| `BOOTNODES` | P2P bootstrap nodes | "" |
| `L1_RPC_URL` | L1 RPC endpoint | goerli |
| `L2_OUTPUT_ORACLE` | L2 output oracle address | 0x00... |

## Management Commands

```bash
# Start
./deploy.sh start

# Stop
./deploy.sh stop

# Restart
./deploy.sh restart

# View logs
./deploy.sh logs

# Check status
./deploy.sh status

# Clean all data
./deploy.sh clean
```

## Docker Compose Services

### op-geth
Execution layer client handling:
- Transaction execution
- State management
- EVM compatibility

### op-node
Consensus layer handling:
- Sequencing
- Derivation
- P2P networking

### batcher
Submits L2 transaction batches to L1 for:
- Data availability
- Finality

### proposer
Proposes L2 output roots to L1 for:
- Withdrawals
- Fraud proofs

### blockscout
Block explorer for:
- Transaction viewing
- Contract verification
- Token tracking

## Monitoring

### Prometheus
Collects metrics from:
- op-geth
- op-node
- System resources

Access: http://localhost:9090

### Grafana
Pre-configured dashboards for:
- Node health
- Block production
- Transaction throughput
- Resource usage

Access: http://localhost:3000 (admin/admin)

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs -f [service-name]

# Check disk space
df -h

# Restart
docker-compose restart
```

### Can't connect to RPC
```bash
# Check if service is running
docker-compose ps

# Check logs
docker-compose logs op-geth

# Verify port availability
netstat -tlnp | grep 8545
```

### Low peer count
- Check external IP is accessible
- Verify firewall rules
- Check P2P key is valid

## Security Notes

⚠️ **This is a testnet configuration. Do not use for production.**

- Default mnemonics are for testing only
- No encryption on keys
- Open RPC ports (restrict in production)
- No rate limiting

## Production Deployment

For production:
1. Use real L1 (Ethereum mainnet or Goerli)
2. Deploy L1 contracts via `op-deployer`
3. Use proper secret management
4. Enable firewalls and authentication
5. Set up monitoring and alerting
6. Run multiple nodes for redundancy

## Resources

- [OP Stack Docs](https://stack.optimism.io/)
- [op-geth](https://github.com/ethereum-optimism/op-geth)
- [op-node](https://github.com/ethereum-optimism/optimism/tree/develop/op-node)

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md)

## License

MIT
