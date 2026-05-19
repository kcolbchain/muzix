import Link from 'next/link';
import { Bars } from '@/components/Bars';
import { SplitBar } from '@/components/SplitBar';
import { fmtMusd, fmtNum } from '@/lib/format';
import { TRACKS } from '@/lib/mock-data';

export const metadata = {
  title: 'Catalog · Muzix',
};

export default function CatalogPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="label">/ catalog explorer</p>
        <h1 className="font-sans text-4xl font-light tracking-tight text-ink-100 md:text-5xl">
          {TRACKS.length} tokens · {fmtNum(totalStreams())} streams indexed
        </h1>
        <p className="max-w-2xl text-ink-300">
          Every entry is a MuzixCatalog ERC-721 with ISRC metadata, an enforced
          royalty cap table, and an optional AI-provenance binding.
        </p>
      </header>

      <Toolbar />

      <ul className="grid gap-px overflow-hidden border border-ink-800 bg-ink-800">
        {TRACKS.map((t) => (
          <li key={t.tokenId.toString()} className="bg-ink">
            <Link
              href={`/catalog/${t.tokenId}`}
              className="grid gap-4 p-6 transition-colors hover:bg-ink-900 md:grid-cols-[80px_1.4fr_1fr_1fr_120px] md:items-center"
            >
              <div className="flex items-center gap-3">
                <span className="label">#{t.tokenId.toString().padStart(3, '0')}</span>
              </div>

              <div className="space-y-1">
                <p className="font-sans text-base text-ink-100">{t.title}</p>
                <p className="font-mono text-xs text-ink-300">{t.artist}</p>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                <p className="uppercase tracking-[0.18em] text-ink-400">
                  ISRC · {t.isrc}
                </p>
                <p className="text-ink-300">
                  {fmtNum(t.streaming.totalStreams)} streams ·{' '}
                  <span className="text-muzix-accent">
                    {fmtMusd(t.streaming.revenueUsd)}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <SplitBar splits={t.splits} height={6} />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                  {t.splits.length} recipients
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                    t.provenance.humanOnly
                      ? 'text-ink-300'
                      : 'text-muzix-accent'
                  }`}
                >
                  {t.provenance.humanOnly ? 'human-only' : 'ai-attributed'}
                </span>
                <Bars
                  seed={t.isrc}
                  count={28}
                  className={`!h-6 ${
                    t.provenance.humanOnly ? 'text-ink-400' : 'text-muzix-accent'
                  }`}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
        // showing demo data — chain-id 1338 (devnet). live mode lights up once
        the canonical deploy lands.
      </p>
    </div>
  );
}

function totalStreams(): bigint {
  return TRACKS.reduce((a, t) => a + t.streaming.totalStreams, 0n);
}

function Toolbar() {
  return (
    <div className="flex flex-wrap items-center gap-3 border border-ink-800 bg-ink-900/40 p-3 font-mono text-[11px] uppercase tracking-[0.18em]">
      <span className="rounded-none border border-muzix-accent px-3 py-1 text-muzix-accent">
        all
      </span>
      <span className="border border-ink-700 px-3 py-1 text-ink-300">
        human-only
      </span>
      <span className="border border-ink-700 px-3 py-1 text-ink-300">
        ai-attributed
      </span>
      <span className="ml-auto text-ink-400">
        sort · most-recent ↓
      </span>
    </div>
  );
}
