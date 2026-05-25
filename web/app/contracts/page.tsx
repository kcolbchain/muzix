import Link from 'next/link';
import { TEMPLATES } from '@/lib/contract-templates';

export const metadata = {
  title: 'Contracts · Muzix',
  description: 'Visual builder for music contracts — splits, sync, AI licenses — deployed on-chain.',
};

export default function ContractsIndexPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="label">/ contract builder</p>
        <h1 className="font-sans text-4xl font-light tracking-tight text-ink-100 md:text-5xl">
          Music contracts,
          <br />
          <span className="text-muzix-accent">drafted visually, deployed on-chain.</span>
        </h1>
        <p className="max-w-2xl text-pretty text-ink-300">
          Pick a template. Fill in the parties, splits, and terms. Watch a
          plain-English draft assemble in real time. When everything looks
          right, deploy it — the builder emits the corresponding{' '}
          <code className="font-mono text-ink-200">MuzixCatalog</code> and{' '}
          <code className="font-mono text-ink-200">MuzixAIProvenance</code>{' '}
          calls and submits them from your wallet.
        </p>
      </header>

      <ul className="grid gap-px overflow-hidden border border-ink-800 bg-ink-800 md:grid-cols-2">
        {TEMPLATES.map((t) => (
          <li key={t.slug} className="bg-ink">
            <Link
              href={`/contracts/${t.slug}`}
              className="group flex h-full flex-col gap-4 p-6 transition-colors hover:bg-ink-900"
            >
              <div className="flex items-center justify-between">
                <span className="label">{t.category}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 group-hover:text-muzix-accent">
                  open builder →
                </span>
              </div>
              <h2 className="font-sans text-2xl font-light tracking-tight text-ink-100 group-hover:text-muzix-accent">
                {t.name}
              </h2>
              <p className="text-pretty text-sm text-ink-300">{t.blurb}</p>
              <div className="mt-auto flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                <span className="border border-ink-700 px-2 py-1">
                  {t.partiesAreCapTable ? 'cap-table' : 'no cap-table'}
                </span>
                <span className="border border-ink-700 px-2 py-1">
                  {t.defaultParties.length} default parties
                </span>
                <span className="border border-ink-700 px-2 py-1">
                  {t.fields.length} fields
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="space-y-3 border-t border-ink-800 pt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
        <p>// how it works</p>
        <ol className="grid gap-2 text-ink-300 normal-case tracking-normal">
          <li>
            <span className="text-muzix-accent">1.</span> Pick a template — each one maps to specific Muzix
            contract calls.
          </li>
          <li>
            <span className="text-muzix-accent">2.</span> Edit parties &amp; terms. The 100% gauge enforces a
            valid cap table; the draft updates in real time.
          </li>
          <li>
            <span className="text-muzix-accent">3.</span> Review the encoded on-chain plan, connect a wallet on
            chain {process.env.NEXT_PUBLIC_MUZIX_CHAIN_ID ?? '1338'}, and deploy.
          </li>
        </ol>
      </section>
    </div>
  );
}
