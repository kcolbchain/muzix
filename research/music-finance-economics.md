# Music Finance Economics: On-Chain Settlement, Stablecoins, and Catalog Tokenization

**Research Brief — Muzix Protocol**

---

## Abstract

The global music industry generated $28.6 billion in recorded music revenue in 2023 (IFPI Global Music Report 2024), yet artists typically receive only 12–20% of streaming revenue after intermediary cuts. Payment delays of 3–9 months, opaque royalty calculations, and cross-border friction compound the problem. This brief examines how on-chain settlement, stablecoin payments, and catalog tokenization can restructure music finance — reducing intermediaries, accelerating payments, and creating a new investable asset class backed by predictable cash flows.

---

## 1. Current Music Royalty Payment Flows and Their Inefficiencies

### 1.1 The Royalty Chain

A single stream on Spotify triggers a payment flow that passes through up to **seven intermediaries** before reaching the artist:

```
Listener → DSP (Spotify/Apple) → Distributor → Label → Publisher → PRO → Songwriter
                                                                    → Artist
```

Each intermediary extracts a fee:

| Intermediary | Typical Take | Function |
|---|---|---|
| DSP (Spotify, Apple Music) | 30% of subscription revenue | Streaming platform |
| Distributor (DistroKid, TuneCore) | 0–15% or flat fee | Delivery to DSPs |
| Record Label | 50–85% of artist share | Funding, marketing, catalog ownership |
| Publisher | 10–25% of songwriter share | Song registration, licensing |
| PRO (ASCAP, BMI, SESAC) | 10–15% admin fee | Performance royalty collection |
| Mechanical licensing (MLC in US) | Admin fee | Mechanical royalty collection |

**Net result**: An artist on a standard label deal receives $0.003–$0.005 per stream from a DSP that pays $0.006–$0.008 per stream. Independent artists using distributors retain more (60–100%) but sacrifice marketing reach.

### 1.2 Payment Delays

The most acute inefficiency is **timing**. The typical payment timeline:

1. **Month 0**: Listener streams a song
2. **Month 1–2**: DSP aggregates streaming data and calculates royalties
3. **Month 2–3**: DSP pays distributor/label
4. **Month 3–6**: Label reconciles advances, recoups, and cross-collateralizes
5. **Month 6–9**: Artist receives payment (if recoupment is satisfied)

For songwriters receiving performance royalties through PROs, the delay extends to **9–18 months**. ASCAP pays quarterly with a 6–9 month lag; BMI pays 5.5–8 months after the quarter ends.

**Data point**: A 2022 survey by the Music Business Research journal found that **73% of independent artists** reported cash flow problems directly attributable to royalty payment delays.

### 1.3 Opacity and Accounting Disputes

Royalty statements are notoriously opaque. Artists frequently report:

- **Unexplained deductions**: "Breakage" fees, packaging deductions (on digital releases), and cross-collateralization across albums
- **Black box revenue**: Mechanical royalties that cannot be matched to a songwriter end up in "black box" pools, distributed pro-rata to major publishers — estimated at **$400–600 million annually** (Music Business Worldwide, 2023)
- **Audit findings**: Major label audits consistently reveal underpayments of 10–40% (Jeff Price, former CEO of TuneCore)

### 1.4 Cross-Border Friction

Music is inherently global, but payments are not:

- **Currency conversion**: An artist in Nigeria earning from US streams loses 3–7% to conversion fees
- **Banking access**: 1.4 billion adults remain unbanked (World Bank, 2022); many artists in developing markets cannot receive international wire transfers
- **Withholding tax**: Cross-border royalties face withholding taxes (typically 10–30%), requiring tax treaties and reclaim processes that small artists cannot navigate

---

## 2. How On-Chain Settlement Reduces Intermediaries

### 2.1 Smart Contract Royalty Splits

On-chain settlement replaces manual reconciliation with **programmable, automatic splits**. A smart contract encoding the royalty agreement:

```solidity
// Simplified: revenue arrives, splits execute atomically
function distribute() external {
    uint256 revenue = address(this).balance;
    artist.transfer(revenue * 60 / 100);     // 60% to artist
    producer.transfer(revenue * 15 / 100);   // 15% to producer
    songwriter.transfer(revenue * 15 / 100); // 15% to songwriter
    label.transfer(revenue * 10 / 100);      // 10% to label
}
```

This eliminates:
- **Reconciliation delay**: Payment splits execute at the moment revenue arrives (seconds, not months)
- **Accounting opacity**: Every transaction is auditable on-chain
- **Trust requirements**: Splits are enforced by code, not by contractual relationships

### 2.2 Disintermediation Economics

On-chain settlement removes or reduces the role of several intermediaries:

| Traditional Role | On-Chain Replacement | Fee Reduction |
|---|---|---|
| Distributor (delivery) | IPFS/Arweave content addressing | 0–15% → near-zero |
| PRO (royalty collection) | Smart contract auto-split | 10–15% admin → gas fees only |
| Label (accounting/admin) | On-chain transparency | Reduced leverage for opaque deals |
| Payment processor | Direct blockchain transfer | 2.9% + $0.30 → $0.01–0.50 |

**Estimated savings**: For a $1 royalty payment, traditional intermediaries extract $0.40–0.70. On-chain settlement reduces this to $0.02–0.10 (gas fees + any platform fee), a **75–95% reduction** in intermediary costs.

### 2.3 Real-World Implementations

Several projects have demonstrated on-chain music royalty distribution:

- **Audius**: Decentralized streaming protocol with over 8 million monthly active users (2024). Artists receive 90% of streaming revenue via $AUDIO token.
- **Royal.io**: Allows fans to purchase "limited digital assets" representing ownership in song royalties. Over $10 million in artist payouts since 2021.
- **Stem**: Provides split-payment infrastructure — though centralized, their model validates the demand for automated royalty splitting (acquired by Splice in 2023).

### 2.4 Challenges

On-chain settlement is not without tradeoffs:

- **Oracles**: DSP streaming data must be brought on-chain via oracles, introducing a trust assumption at the data entry point
- **Gas costs**: On Ethereum mainnet, a split to 5 recipients costs $5–50. L2 solutions (like the Muzix chain) reduce this to $0.01–0.10
- **Legal recognition**: Smart contract splits must map to real-world legal agreements to be enforceable in disputes

---

## 3. Stablecoin Advantages for Cross-Border Artist Payments

### 3.1 The Cross-Border Payment Problem

Music streaming is global: Spotify operates in 184 markets, Apple Music in 167. Yet the payment infrastructure is fragmented:

- **SWIFT transfers**: $25–50 per transaction, 3–5 business days, often rejected for small amounts
- **PayPal**: 3.49% + fixed fee for cross-border, unavailable in many African and Southeast Asian markets
- **Publisher sub-publishing**: International songwriters route royalties through sub-publishers in each territory, losing 15–25% at each hop

### 3.2 Stablecoin Settlement Benefits

Dollar-denominated stablecoins (USDC, USDT, or a purpose-built stablecoin like MUSD) solve multiple problems simultaneously:

**Speed**: Settlement in seconds to minutes, regardless of geography

**Cost**: Transfer fees on L2 networks are $0.01–0.10, compared to $25–50 for wire transfers

**Access**: Any artist with a smartphone and internet connection can receive stablecoin payments — no bank account required. This is transformative for the 1.4 billion unbanked adults globally, many of whom are in music-rich regions (Sub-Saharan Africa, Southeast Asia, Latin America)

**Stability**: Unlike volatile cryptocurrencies, stablecoins maintain a 1:1 peg to the US dollar, eliminating the currency risk that plagues artists in high-inflation economies

**Data point**: According to Chainalysis (2024), Sub-Saharan Africa saw a **45% year-over-year increase** in stablecoin transaction volume, driven primarily by cross-border remittances and commerce — the exact use case for music royalty payments.

### 3.3 Comparative Cost Analysis

For a $100 royalty payment from a US DSP to an artist in Lagos, Nigeria:

| Method | Fees | Arrival Time | Requirements |
|---|---|---|---|
| SWIFT wire | $35–50 (35–50%) | 3–5 days | Bank account, SWIFT code |
| PayPal | $3.49 + conversion (5–8%) | 1–2 days | PayPal account (limited in Nigeria) |
| Western Union | $8–15 (8–15%) | Minutes–hours | Physical location visit |
| USDC on L2 | $0.01–0.10 (<0.1%) | Seconds | Smartphone + wallet |

The efficiency gap widens for small payments: a $10 micro-royalty is economically unviable via traditional rails (fees exceed the payment) but trivially cheap on-chain.

### 3.4 MUSD: A Purpose-Built Music Stablecoin

The Muzix protocol proposes MUSD, a stablecoin with **royalty split hooks** — native support for automatic revenue distribution embedded at the token level. Unlike general-purpose stablecoins where splits require external smart contracts, MUSD encodes split logic in the transfer function itself:

- Revenue arrives as MUSD → automatic split to all parties in the same transaction
- No additional gas overhead for splitting
- Native support for recurring payment streams (streaming revenue modeled as continuous flow)

---

## 4. Catalog Tokenization as a New Asset Class

### 4.1 Music Royalties as Predictable Cash Flows

Music catalogs generate **remarkably predictable revenue**. Unlike most creative works, hit songs exhibit long-tail streaming patterns:

- Top songs maintain 60–80% of peak monthly streams after 12 months (Spotify data analysis)
- Catalog music (songs older than 18 months) now represents **72.6% of all US music consumption** (Luminate Year-End Report 2023)
- The top 10,000 songs on Spotify are virtually guaranteed $1M+ in lifetime royalties

This predictability makes music royalties an ideal candidate for **securitization** — packaging cash flows into tradeable financial instruments.

### 4.2 The Traditional Catalog Market

Major catalog acquisitions have validated music as an asset class:

| Transaction | Year | Value | Multiple |
|---|---|---|---|
| Hipgnosis Fund (portfolio) | 2018–2023 | $2.2B+ | 15–18x annual royalties |
| Bob Dylan (full catalog) | 2020 | $400M | ~20x annual royalties |
| Bruce Springsteen (full catalog) | 2021 | $550M | ~17x annual royalties |
| Justin Bieber (publishing) | 2023 | $200M | ~25x annual royalties |

**Total market**: Music catalog transactions exceeded **$5 billion annually** by 2023 (MBW). However, this market is entirely inaccessible to small investors — minimum investment thresholds are typically $1M+.

### 4.3 On-Chain Tokenization

Tokenization democratizes access to music catalog investments by fractionating ownership into ERC-721 (individual catalog NFTs) or ERC-1155 (fractional shares) tokens:

**For artists**:
- Access to capital without surrendering full catalog ownership
- Tokenize 10–50% of a catalog's royalty stream while retaining creative control
- Immediate liquidity vs. the 6–12 month timeline for traditional catalog deals

**For investors**:
- Fractional ownership starting from $10–100 (vs. $1M+ traditional minimum)
- Transparent, on-chain yield from streaming royalties
- Liquid secondary market for trading catalog shares

**Projected yields**: Based on current catalog multiples (15–20x annual royalties), tokenized catalog shares would yield **5–7% annually** — competitive with real estate investment trusts (REITs) and significantly above Treasury yields.

### 4.4 Tokenization Standards

The Muzix protocol proposes an ERC-721 extension for catalog tokens with:

- **Royalty split hooks**: Streaming revenue automatically distributes to all token holders pro-rata
- **Metadata standard**: On-chain representation of ISRC codes, songwriter splits, and territory rights
- **Oracle integration**: Real-time streaming data feeds that update token valuations
- **Composability**: Catalog tokens can be used as collateral in DeFi lending protocols, creating new financial products (e.g., borrow against future royalties)

### 4.5 Market Opportunity

If even 1% of the global music catalog market ($50B+ in estimated total catalog value) were tokenized:

- **$500M in tokenized assets** available to retail and institutional investors
- At 5–7% yield, generating **$25–35M annually** in distributed royalty income
- Creating a liquid, 24/7 market for music catalog shares that currently exists only as illiquid, over-the-counter institutional deals

---

## Conclusion

The music industry's financial infrastructure was designed in the era of physical distribution and has not been fundamentally updated for digital streaming. The result is a system where artists wait months for payments, lose 40–70% to intermediaries, and have no access to the capital markets their catalogs could support.

On-chain settlement, stablecoin payments, and catalog tokenization offer a technical path to restructure this system:

1. **Smart contract splits** can reduce payment delays from months to seconds and cut intermediary costs by 75–95%
2. **Stablecoins** can reduce cross-border payment costs from 5–50% to under 0.1%, while extending financial access to unbanked artists
3. **Catalog tokenization** can create a new asset class with 5–7% yields, fractional ownership from $10, and 24/7 liquidity

The infrastructure to realize this vision — L2 chains with low gas costs, mature stablecoin ecosystems, and proven NFT standards — exists today. What remains is execution: building the oracles, smart contracts, and protocol standards that connect streaming platforms to on-chain settlement.

This is the mission of Muzix.

---

## References

1. IFPI Global Music Report 2024
2. Luminate Year-End Music Report 2023
3. Chainalysis Geographic Report on Cryptocurrency 2024
4. World Bank Global Findex Database 2022
5. Music Business Worldwide — Catalog Transaction Reports (2023–2024)
6. Citigroup "Putting the Band Back Together" Report (2018, updated figures)
7. Audius Protocol Documentation (2024)
8. Royal.io Transparency Reports
9. EIP-4844: Shard Blob Transactions specification
10. Jeff Price, "What Record Labels Don't Want Artists to Know" (2022)

---

*Word count: ~2,700*
*Prepared for: Muzix Protocol (kcolbchain)*
*Date: April 2026*
