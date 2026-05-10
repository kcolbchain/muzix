import Link from 'next/link';

export const metadata = {
  title: 'About · Muzix',
};

export default function AboutPage() {
  return (
    <article className="prose-muzix space-y-16">
      <header className="space-y-4">
        <p className="label">/ architecture</p>
        <h1 className="font-sans text-4xl font-light tracking-tight text-ink-100 md:text-5xl">
          A music industry that
          <br />
          settles like the internet.
        </h1>
        <p className="max-w-2xl text-ink-300">
          Muzix is the shared settlement, identity, and value layer for music.
          It is not a music app — it&rsquo;s the layer music apps, labels,
          distributors, and financial products plug into.
        </p>
      </header>

      <Section
        id="catalog"
        tag="catalog"
        title="MuzixCatalog — every track, an asset."
        body="ERC-721 + ERC-2981 with ISRC metadata baked in at mint time. The royalty cap table sums to exactly 10,000 basis points — checked in the constructor; the contract refuses any other split. Mints are gated by the catalog operator; revenue claims are pull-based."
        code={`mintMusic(metadata, splits) → tokenId
sum(splits) === 10000  // enforced
ownerOf(tokenId) → address
royaltyInfo(tokenId, salePrice) → (receiver, amount)`}
      />

      <Section
        id="musd"
        tag="musd"
        title="MUSD — the music stablecoin."
        body="ERC-20 with EIP-2612 Permit. Distribution is pull-payment — recipients withdraw their balance, the contract never pushes — which means a single bad address in a 12-way split can&rsquo;t DoS the rest of the cap table. Batched payouts amortize gas across thousands of streams per oracle update."
        code={`claimStreamingRevenue(tokenId)
balanceOf(recipient) → MUSD owed
withdraw(amount)  // pull, not push
permit(...)       // gasless approvals`}
      />

      <Section
        id="provenance"
        tag="provenance"
        title="MuzixAIProvenance — AI gets paid too."
        body="Standalone registry keyed by (catalog, tokenId). Either humanOnly = true (an on-chain attestation no AI was used) or a list of ERC-721-AI model tokens with off-chain lineage URIs and a commit hash. Royalty auto-routing reads this registry at claim time so model owners earn alongside humans."
        code={`setProvenance(tokenId, {
  humanOnly: false,
  aiModelTokens: [erc721ai],
  ipLineageURIs: [...],
  provenanceHash: keccak256(...)
})`}
      />

      <Section
        id="oracle"
        tag="oracle"
        title="StreamingRevenueOracle — stake-weighted truth."
        body="Spotify, Apple Music, YouTube Music → on-chain via a stake-weighted reporter consensus. Each report carries a confidence score (0-10000 bps) and a data-source hash. Payouts only release once a configurable confidence threshold clears."
        code={`report(catalog, dsp, period, streams, revenue, confidence)
totalStreams · revenueUsd · confidenceScore
threshold + slashing for griefing reporters`}
      />

      <Section
        id="finance"
        tag="finance"
        title="Royalty advances, on-chain."
        body="Catalog tokens are productive assets. They can be collateralized for advances, swapped for forward streams of revenue, or fractionalized into share-classes. All quoted, settled, and routed in MUSD."
        code={`borrowAgainst(tokenId, ltv) → MUSD
sellForwardRevenue(tokenId, period, discount)
buyShare(tokenId, shareBps) → fraction-NFT`}
      />

      <footer className="space-y-4 border-t border-ink-800 pt-10">
        <p className="label">/ contribute</p>
        <p className="text-pretty text-ink-300">
          The protocol is open source under MIT. Three follow-up issues are
          open right now:{' '}
          <a
            className="accent-link"
            href="https://github.com/kcolbchain/muzix/issues/30"
          >
            royalty auto-routing
          </a>
          ,{' '}
          <a
            className="accent-link"
            href="https://github.com/kcolbchain/muzix/issues/31"
          >
            ERC-2981 AI-share
          </a>
          , and a{' '}
          <a
            className="accent-link"
            href="https://github.com/kcolbchain/muzix/issues/33"
          >
            provenance subgraph
          </a>
          .
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/catalog" className="btn">
            Browse catalog
          </Link>
          <a
            href="https://github.com/kcolbchain/muzix/blob/main/CONTRIBUTING.md"
            className="btn-accent"
          >
            Start contributing →
          </a>
        </div>
      </footer>
    </article>
  );
}

function Section({
  id,
  tag,
  title,
  body,
  code,
}: {
  id: string;
  tag: string;
  title: string;
  body: string;
  code: string;
}) {
  return (
    <section id={id} className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:gap-12">
      <div className="space-y-4">
        <p className="label">/ {tag}</p>
        <h2 className="font-sans text-3xl font-light leading-tight tracking-tight text-ink-100 md:text-4xl">
          {title}
        </h2>
        <p className="text-pretty text-ink-300">{body}</p>
      </div>
      <pre className="card overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-ink-200">
        <code>{code}</code>
      </pre>
    </section>
  );
}
