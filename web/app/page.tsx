import Link from 'next/link';
import { Bars } from '@/components/Bars';
import { fmtMusd, fmtNum } from '@/lib/format';
import { NETWORK, PROTOCOL_STATS, TRACKS } from '@/lib/mock-data';

export default function HomePage() {
  return (
    <div className="space-y-24">
      <Hero />
      <Stats />
      <Pillars />
      <FeaturedTracks />
    </div>
  );
}

function Hero() {
  return (
    <section className="grid gap-10 pt-8 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-16">
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="label">// {NETWORK.status}</p>
          <h1 className="text-balance font-sans text-5xl font-light leading-[0.95] tracking-tightest text-ink-100 md:text-7xl">
            Layer&nbsp;0
            <br />
            for the music
            <br />
            <span className="text-muzix-accent">industry.</span>
          </h1>
        </div>
        <p className="max-w-xl text-pretty text-base text-ink-300 md:text-lg">
          Muzix tokenizes catalogs, settles royalties on-chain, and gives every
          track a verifiable cap table — humans, labels, and AI models alike.
          Built on the OP Stack.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/contracts" className="btn-accent">
            Open contract builder →
          </Link>
          <Link href="/catalog" className="btn">
            Explore catalog
          </Link>
          <a
            href="https://github.com/kcolbchain/muzix"
            target="_blank"
            rel="noreferrer"
            className="btn"
          >
            View source ↗
          </a>
        </div>
      </div>
      <div className="space-y-4">
        <div className="card relative aspect-[4/5] overflow-hidden">
          <div className="absolute inset-0 flex items-end p-6 text-muzix-accent">
            <Bars seed="muzix-genesis" count={80} className="!h-3/4 !w-full" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 space-y-2">
            <p className="label text-muzix-accent">/ chain {NETWORK.chainId}</p>
            <p className="font-mono text-2xl text-ink-100">
              {NETWORK.name}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
              block time · {NETWORK.blockTime}s · OP Stack
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    { k: 'catalog tokens', v: fmtNum(PROTOCOL_STATS.catalogTokens) },
    { k: 'streams indexed', v: fmtNum(PROTOCOL_STATS.totalStreams) },
    {
      k: 'revenue settled',
      v: fmtMusd(PROTOCOL_STATS.totalRevenueUsd),
    },
    {
      k: 'MUSD circulating',
      v: fmtMusd(PROTOCOL_STATS.musdCirculating),
    },
  ];
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden border border-ink-800 bg-ink-800 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.k} className="bg-ink p-6">
          <p className="label">{it.k}</p>
          <p className="mt-3 font-sans text-2xl font-light tracking-tight text-ink-100 md:text-3xl">
            {it.v}
          </p>
        </div>
      ))}
    </section>
  );
}

function Pillars() {
  const pillars = [
    {
      tag: 'Tokenize',
      title: 'Catalogs become assets.',
      body: 'ERC-721 + ERC-2981 with ISRC metadata. Cap-table splits enforced to 100.00% on-chain. One token per recording.',
      href: '/catalog',
    },
    {
      tag: 'Finance',
      title: 'Royalty advances,\non-chain.',
      body: 'Catalog-backed lending, revenue swaps, royalty advances — all settled in MUSD against verifiable streaming oracles.',
      href: '/about#finance',
    },
    {
      tag: 'Settle',
      title: 'MUSD — the music\nstablecoin.',
      body: 'Pull-payment royalty distribution. DoS-resistant. Cross-border, instant. Fees in cents, not weeks.',
      href: '/about#musd',
    },
    {
      tag: 'Attribute',
      title: 'AI gets paid too.',
      body: 'MuzixAIProvenance binds catalog tokens to ERC-721-AI model weights. Royalties auto-route to model owners on every play.',
      href: '/about#provenance',
    },
  ];
  return (
    <section className="space-y-8">
      <header className="flex items-end justify-between">
        <h2 className="font-sans text-3xl font-light tracking-tight text-ink-100">
          Four primitives.
        </h2>
        <p className="hidden font-mono text-xs uppercase tracking-[0.2em] text-ink-400 md:block">
          // composable. open source. on-chain.
        </p>
      </header>
      <div className="grid gap-px overflow-hidden border border-ink-800 bg-ink-800 md:grid-cols-2">
        {pillars.map((p) => (
          <Link
            href={p.href}
            key={p.tag}
            className="group flex flex-col gap-4 bg-ink p-8 transition-colors hover:bg-ink-900"
          >
            <p className="label text-muzix-accent">/ {p.tag.toLowerCase()}</p>
            <h3 className="whitespace-pre-line font-sans text-2xl font-light tracking-tight text-ink-100">
              {p.title}
            </h3>
            <p className="text-sm text-ink-300">{p.body}</p>
            <span className="mt-auto font-mono text-xs uppercase tracking-[0.2em] text-ink-400 group-hover:text-muzix-accent">
              learn more →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedTracks() {
  const featured = TRACKS.slice(0, 3);
  return (
    <section className="space-y-8">
      <header className="flex items-end justify-between">
        <h2 className="font-sans text-3xl font-light tracking-tight text-ink-100">
          Recent issuances.
        </h2>
        <Link
          href="/catalog"
          className="font-mono text-xs uppercase tracking-[0.2em] text-ink-400 hover:text-muzix-accent"
        >
          all tokens →
        </Link>
      </header>
      <div className="grid gap-px overflow-hidden border border-ink-800 bg-ink-800 md:grid-cols-3">
        {featured.map((t) => (
          <Link
            key={t.tokenId.toString()}
            href={`/catalog/${t.tokenId}`}
            className="group flex flex-col gap-5 bg-ink p-6 transition-colors hover:bg-ink-900"
          >
            <div className="flex items-center justify-between">
              <span className="label">/ token #{t.tokenId.toString()}</span>
              <span className="label text-muzix-accent">
                {t.provenance.humanOnly ? 'human-only' : 'ai-attributed'}
              </span>
            </div>
            <Bars
              seed={t.isrc}
              count={48}
              className="!h-12 text-muzix-accent"
            />
            <div className="space-y-1">
              <p className="font-sans text-lg leading-tight text-ink-100">
                {t.title}
              </p>
              <p className="font-mono text-xs text-ink-300">{t.artist}</p>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
              ISRC · {t.isrc}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
