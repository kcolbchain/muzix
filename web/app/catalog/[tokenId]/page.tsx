import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bars } from '@/components/Bars';
import { SplitBar, SplitLegend } from '@/components/SplitBar';
import { fmtBps, fmtMusd, fmtNum, shortAddr } from '@/lib/format';
import { TRACKS, getTrack } from '@/lib/mock-data';

type Props = { params: Promise<{ tokenId: string }> };

export async function generateStaticParams() {
  return TRACKS.map((t) => ({ tokenId: t.tokenId.toString() }));
}

export async function generateMetadata({ params }: Props) {
  const { tokenId } = await params;
  const t = getTrack(tokenId);
  if (!t) return { title: 'Token not found · Muzix' };
  return { title: `${t.title} — ${t.artist} · Muzix` };
}

export default async function TrackPage({ params }: Props) {
  const { tokenId } = await params;
  const t = getTrack(tokenId);
  if (!t) notFound();

  const totalShare = t.splits.reduce((a, s) => a + s.shareBps, 0);

  return (
    <div className="space-y-12">
      <Link
        href="/catalog"
        className="inline-block font-mono text-xs uppercase tracking-[0.2em] text-ink-400 hover:text-muzix-accent"
      >
        ← back to catalog
      </Link>

      <header className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-12">
        <div className="space-y-5">
          <p className="label">/ token #{t.tokenId.toString()}</p>
          <h1 className="text-balance font-sans text-4xl font-light leading-[1.05] tracking-tight text-ink-100 md:text-6xl">
            {t.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-300">
            <span className="text-ink-100">{t.artist}</span>
            <span className="text-ink-400">·</span>
            <span>ISRC {t.isrc}</span>
            <span className="text-ink-400">·</span>
            <span>{formatDuration(t.durationSec)}</span>
            <span className="text-ink-400">·</span>
            <span>{t.releasedAt}</span>
          </div>
        </div>
        <div className="card relative aspect-[3/2] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center p-6 text-muzix-accent">
            <Bars seed={t.isrc + '-detail'} count={64} className="!h-2/3 !w-full" />
          </div>
          <div className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            // waveform · deterministic preview
          </div>
        </div>
      </header>

      <section className="grid gap-px overflow-hidden border border-ink-800 bg-ink-800 md:grid-cols-3">
        <Stat
          label="total streams"
          value={fmtNum(t.streaming.totalStreams)}
          sub={`oracle confidence · ${fmtBps(t.streaming.confidenceBps)}`}
        />
        <Stat
          label="revenue settled"
          value={fmtMusd(t.streaming.revenueUsd)}
          sub="paid in MUSD"
          accent
        />
        <Stat
          label="owner"
          value={shortAddr(t.owner)}
          sub="ERC-721 holder"
          mono
        />
      </section>

      <section className="grid gap-12 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <header className="space-y-2">
            <p className="label">/ royalty cap table</p>
            <h2 className="font-sans text-2xl font-light tracking-tight text-ink-100">
              {t.splits.length} recipients · sum {fmtBps(totalShare)}
            </h2>
            <p className="text-sm text-ink-400">
              Enforced by MuzixCatalog at mint time. Pull-payment distribution
              via MUSD — recipients withdraw, never push, so a bad address can
              never DoS the rest of the cap table.
            </p>
          </header>
          <SplitBar splits={t.splits} height={14} />
          <SplitLegend
            splits={t.splits.map((s) => ({
              role: s.role,
              shareBps: s.shareBps,
              recipient: s.recipient,
            }))}
          />
        </div>

        <aside className="space-y-6">
          <header className="space-y-2">
            <p className="label">/ ai provenance</p>
            <h2 className="font-sans text-2xl font-light tracking-tight text-ink-100">
              {t.provenance.humanOnly
                ? 'Human-only attestation'
                : 'AI-attributed'}
            </h2>
          </header>
          {t.provenance.humanOnly ? (
            <div className="card space-y-3 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muzix-accent">
                ✓ humanOnly = true
              </p>
              <p className="text-sm text-ink-300">
                On-chain attestation that no AI model contributed to this
                recording. Verified by MuzixAIProvenance with `aiModelTokens`
                empty.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {t.provenance.aiModelTokens.map((m, i) => (
                <div key={i} className="card space-y-2 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muzix-accent">
                    erc-721-ai · token #{m.tokenId.toString()}
                  </p>
                  <p className="text-sm text-ink-100">{m.label}</p>
                  <p className="font-mono text-[11px] text-ink-400">
                    {shortAddr(m.contract)}
                  </p>
                </div>
              ))}
              {t.provenance.ipLineageURIs.length > 0 && (
                <div className="card space-y-2 p-4">
                  <p className="label">/ lineage uris</p>
                  <ul className="space-y-1 font-mono text-[11px] text-ink-300">
                    {t.provenance.ipLineageURIs.map((u) => (
                      <li key={u} className="truncate" title={u}>
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </aside>
      </section>

      <section className="border-t border-ink-800 pt-10">
        <p className="label mb-3">/ on-chain references</p>
        <dl className="grid gap-x-8 gap-y-3 font-mono text-xs text-ink-300 md:grid-cols-2">
          <Row k="catalog contract" v="MuzixCatalog (ERC-721 + ERC-2981)" />
          <Row k="settlement asset" v="MUSD (ERC-20 + Permit, 6 decimals)" />
          <Row k="provenance registry" v="MuzixAIProvenance" />
          <Row k="streaming oracle" v="StreamingRevenueOracle (stake-weighted)" />
        </dl>
      </section>
    </div>
  );
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function Stat({
  label,
  value,
  sub,
  accent,
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2 bg-ink p-6">
      <p className="label">{label}</p>
      <p
        className={`font-${mono ? 'mono' : 'sans'} text-2xl ${
          mono ? '' : 'font-light tracking-tight'
        } md:text-3xl ${accent ? 'text-muzix-accent' : 'text-ink-100'}`}
      >
        {value}
      </p>
      {sub && (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
          {sub}
        </p>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-800 pb-2">
      <dt className="uppercase tracking-[0.18em] text-ink-400">{k}</dt>
      <dd className="text-ink-100">{v}</dd>
    </div>
  );
}
