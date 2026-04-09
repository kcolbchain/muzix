# On-Chain Music Finance: Tokenization, Settlement, and the Future of Artist Economics

> A research brief on how blockchain infrastructure can transform the $28B+ music royalty ecosystem.

## Abstract

The global music industry generates over $28 billion annually in recorded music revenue, yet artists typically receive 12–20% of streaming income after intermediary cuts. Payment delays of 6–18 months, opaque accounting, and cross-border friction compound the problem. This paper examines how on-chain settlement, music-specific stablecoins, and catalog tokenization can reduce intermediaries, accelerate payments, and create new financial instruments for the music industry.

---

## 1. Current Music Royalty Payment Flows and Their Inefficiencies

### 1.1 The Royalty Value Chain

A single stream on Spotify or Apple Music generates revenue that passes through up to seven intermediaries before reaching the artist:

```
Listener → DSP → Distributor → Label → Publisher → PRO → Sub-Publisher → Artist
```

Each node extracts fees (10–50%), introduces delays (30–180 days), and operates on independent accounting systems. The result:

| Metric | Current State |
|--------|---------------|
| Average artist share of $1 stream revenue | $0.003–$0.005 |
| Payment delay (stream → artist bank account) | 6–18 months |
| Cross-border payment fees | 3–8% |
| Revenue reconciliation accuracy | ~85% (CISAC 2023) |
| Unmatched royalties (annually) | $2.5B+ (Music Business Worldwide, 2023) |

### 1.2 Structural Problems

**Opacity:** Artists cannot independently verify streaming counts or royalty calculations. Labels and distributors use proprietary systems with quarterly or semi-annual reporting.

**Fragmentation:** A single song may generate revenue across 400+ DSPs in 200+ territories, each with different reporting formats, payment schedules, and currency denominations.

**Float Economics:** Intermediaries benefit from holding artist funds. A 12-month delay on $10M in royalties at 5% interest yields $500K — revenue that never reaches creators.

**Cross-Border Friction:** International royalty payments face currency conversion losses (1–5%), SWIFT fees ($15–50 per transaction), and correspondent banking delays (3–7 business days).

### 1.3 The Scale of the Problem

According to IFPI's *Global Music Report 2024*:
- Global recorded music revenue: $28.6B (2023)
- Streaming accounts for 67% ($19.3B)
- Subscription streaming grew 11.2% YoY
- Yet artist satisfaction with payment transparency remains below 40% (MIDiA Research, 2023)

---

## 2. How On-Chain Settlement Reduces Intermediaries

### 2.1 Smart Contract Royalty Splits

On-chain settlement replaces manual royalty accounting with deterministic smart contracts. When revenue enters the system, splits execute atomically:

```solidity
// Simplified royalty split
function distribute(uint256 revenue) external {
    artist.transfer(revenue * 70 / 100);    // 70% to artist
    producer.transfer(revenue * 15 / 100);  // 15% to producer
    label.transfer(revenue * 15 / 100);     // 15% to label
}
```

**Key advantages:**
- **Atomic execution:** All parties receive funds in the same transaction — no sequential delays
- **Immutable terms:** Split percentages are encoded on-chain and auditable by all parties
- **Real-time settlement:** Revenue flows to artists within minutes, not months
- **Composability:** Splits can chain — a label's 15% can automatically sub-split to investors

### 2.2 Disintermediation Analysis

| Traditional Flow | On-Chain Flow | Intermediaries Removed |
|-----------------|---------------|----------------------|
| DSP → Distributor → Label → Artist | DSP → Smart Contract → All Parties | Distributor back-office, label accounting |
| Publisher → PRO → Sub-Publisher → Songwriter | Publisher → Smart Contract → Songwriters | PRO reconciliation, sub-publisher |
| Sync License → Music Supervisor → Label → Artist | Sync → NFT License → Automatic Split | Manual licensing negotiation |

### 2.3 Case Studies

**Royal.io (2021–2024):** Enabled fans to purchase music royalty shares as tokens. Artists like Nas and 3LAU tokenized song rights, demonstrating demand for on-chain music assets. Peak TVL: $25M.

**Audius (2020–present):** Decentralized streaming protocol with direct artist payments. 8M+ monthly active users. Demonstrates that DSP-to-artist direct payment is technically feasible, though adoption challenges remain.

**Opulous (2022–present):** Music-backed DeFi lending. Artists collateralize future royalty streams for immediate capital. Bridges traditional music finance with on-chain liquidity.

---

## 3. Stablecoin Advantages for Cross-Border Artist Payments

### 3.1 The Cross-Border Problem

Music is inherently global — a song streams in 200+ countries simultaneously. Current payment infrastructure fails this reality:

- **Currency conversion:** An artist in Nigeria paid in GBP through a UK distributor loses 3–8% to FX spreads
- **Banking access:** 1.4B adults globally are unbanked (World Bank, 2022); many artists in emerging markets cannot receive wire transfers
- **Remittance costs:** Sub-Saharan Africa averages 7.9% for incoming remittances (World Bank, 2023)

### 3.2 Music-Specific Stablecoins (MUSD)

A music-industry stablecoin like MUSD offers:

| Feature | MUSD Advantage | Traditional Wire |
|---------|---------------|-----------------|
| Settlement time | < 5 minutes | 3–7 business days |
| Cross-border fee | < 0.1% | 3–8% |
| Minimum transfer | $0.01 | $15–50 (fees make micro-payments unviable) |
| Banking requirement | Crypto wallet only | Full bank account |
| Royalty split hooks | Atomic on transfer | Manual post-receipt |

### 3.3 Royalty-Aware Transfers

Unlike generic stablecoins (USDC, USDT), a purpose-built MUSD can embed royalty split logic at the protocol level:

```
When MUSD transfers as a royalty payment:
1. Identify the associated song/catalog token
2. Look up the on-chain split table
3. Execute all sub-splits atomically
4. Emit events for accounting/reporting
```

This eliminates the need for intermediary accounting — the money *itself* knows how to split.

### 3.4 Micro-Payment Enablement

At $0.003–$0.005 per stream, traditional payment rails cannot process individual stream payments (fees exceed revenue). Stablecoins enable:

- **Per-stream settlement:** Batch or individual stream payments with negligible fees
- **Real-time dashboards:** Artists see earnings as they accumulate, not quarterly
- **Instant withdrawals:** No minimum payout thresholds ($50–100 on most platforms)

---

## 4. Catalog Tokenization as a New Asset Class

### 4.1 What is Catalog Tokenization?

Catalog tokenization represents music rights (recordings, compositions, or both) as blockchain tokens. Each token encodes:

- **Ownership metadata:** Artist, label, publisher, ISRC/ISWC codes
- **Royalty configuration:** Split percentages, territory restrictions, license types
- **Revenue claims:** Holder rights to streaming income, sync fees, mechanical royalties
- **Fractional ownership:** Divisible tokens enabling partial catalog investment

### 4.2 Market Size and Opportunity

The music rights market has attracted significant institutional capital:

| Transaction | Year | Value | Buyer |
|------------|------|-------|-------|
| Bruce Springsteen catalog | 2021 | $550M | Sony |
| Bob Dylan catalog | 2022 | $400M | Universal |
| Justin Timberlake catalog | 2022 | $100M | Hipgnosis |
| Music rights funds (total AUM) | 2023 | $40B+ | Various |

These transactions are OTC, illiquid, and accessible only to institutional buyers. Tokenization democratizes access:

- **Fractional investment:** Own 0.01% of a catalog for $100 instead of $100M for the whole thing
- **Liquid secondary market:** Trade catalog tokens 24/7 on DEXs
- **Transparent valuation:** On-chain revenue data enables real-time pricing
- **Programmable yields:** Royalty income auto-distributes to token holders

### 4.3 Token Standard Design (ERC-721 + Extensions)

A music catalog token standard should include:

```
MuzixCatalogToken (ERC-721)
├── Ownership: standard NFT ownership + transfer
├── EIP-2981: Royalty info (on-chain royalty percentage)
├── Metadata: ISRC, ISWC, territory, license type
├── Revenue claim: streaming + sync + mechanical
├── Fractional: ERC-1155 sub-tokens for partial ownership
└── Governance: voting on licensing decisions
```

### 4.4 Revenue Projections

Assuming 5% of the $40B music rights market tokenizes over 5 years:

| Year | Tokenized Catalog Value | Annual Yield (avg 5%) | Protocol Fees (0.5%) |
|------|------------------------|-----------------------|---------------------|
| 1 | $200M | $10M | $1M |
| 2 | $600M | $30M | $3M |
| 3 | $1.2B | $60M | $6M |
| 4 | $1.6B | $80M | $8M |
| 5 | $2.0B | $100M | $10M |

---

## 5. Challenges and Mitigations

### 5.1 Regulatory Uncertainty

Music royalty tokens may be classified as securities in some jurisdictions. **Mitigation:** Structure tokens as utility tokens with revenue-sharing rights rather than equity; pursue regulatory sandbox programs (e.g., UK FCA, Singapore MAS).

### 5.2 Rights Data Quality

On-chain settlement is only as good as the underlying rights data. **Mitigation:** Integrate with existing rights databases (ISRC, ISWC, IPI); build oracle systems that validate ownership claims before tokenization.

### 5.3 Industry Adoption

Labels and DSPs have limited incentive to disintermediate themselves. **Mitigation:** Start with independent artists (60%+ of new releases); demonstrate efficiency gains that benefit all parties; partner with forward-thinking distributors.

### 5.4 Technical Scalability

High-frequency micro-payments require throughput that L1 chains cannot provide. **Mitigation:** Build on L2/L3 rollups (e.g., OP Stack) with batch settlement to L1 for security.

---

## 6. Conclusion

The music industry's payment infrastructure is decades behind its digital distribution reality. On-chain settlement, purpose-built stablecoins, and catalog tokenization offer a path to:

1. **Reduce payment delays** from months to minutes
2. **Cut intermediary fees** from 40–80% to under 5%
3. **Enable micro-payments** that current rails cannot process
4. **Create liquid markets** for music rights as an investable asset class
5. **Increase transparency** through auditable on-chain accounting

The technology exists today. The challenge is adoption — bridging the gap between crypto infrastructure and an industry built on legacy contracts and institutional inertia. Projects building music-specific L2s and settlement layers are positioned to capture this $28B+ opportunity.

---

## References

1. IFPI. *Global Music Report 2024*. International Federation of the Phonographic Industry, 2024.
2. CISAC. *Global Collections Report 2023*. Confédération Internationale des Sociétés d'Auteurs et Compositeurs, 2023.
3. MIDiA Research. *Artist Direct-to-Fan Revenue Report*. 2023.
4. World Bank. *Remittance Prices Worldwide Quarterly*. Issue 48, December 2023.
5. World Bank. *Global Findex Database 2022*.
6. Music Business Worldwide. "Unmatched Royalties Report." 2023.
7. Citigroup. *Putting the Band Back Together: Remastering the World of Music*. 2018.
8. Goldman Sachs. *Music in the Air: The Next $100 Billion Opportunity*. 2023.
