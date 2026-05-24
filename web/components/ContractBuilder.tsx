'use client';

import { useMemo, useState } from 'react';
import {
  PARTY_ROLES,
  bpsTotalOf,
  defaultValues,
  getTemplate,
  type FieldDef,
  type OnchainCall,
  type Party,
  type PartyRole,
  type TemplateValues,
} from '@/lib/contract-templates';
import {
  MUZIX_CATALOG_ADDRESS,
  MUZIX_CHAIN_ID,
  isDeployed,
} from '@/lib/contracts';
import { DeployPanel } from '@/components/DeployPanel';

export function ContractBuilder({ slug }: { slug: string }) {
  const template = getTemplate(slug);
  const [values, setValues] = useState<TemplateValues>(() =>
    template ? defaultValues(template) : { parties: [], fields: {} },
  );

  if (!template) return null;

  const issues = template.validate(values);
  const bpsSum = bpsTotalOf(values.parties);
  const plan = template.onchain(values);
  const draftText = template.draft(values);

  function patchField(key: string, v: string | number) {
    setValues((cur) => ({ ...cur, fields: { ...cur.fields, [key]: v } }));
  }

  function patchParty(i: number, patch: Partial<Party>) {
    setValues((cur) => {
      const next = cur.parties.slice();
      next[i] = { ...next[i], ...patch };
      return { ...cur, parties: next };
    });
  }

  function addParty() {
    setValues((cur) => ({
      ...cur,
      parties: [
        ...cur.parties,
        { name: '', address: '', role: template.allowedRoles[0] ?? 'Other', shareBps: 0 },
      ],
    }));
  }

  function removeParty(i: number) {
    setValues((cur) => ({ ...cur, parties: cur.parties.filter((_, idx) => idx !== i) }));
  }

  function autoBalance() {
    // Distribute remainder to the last party so the cap table hits exactly 10000.
    setValues((cur) => {
      if (cur.parties.length === 0) return cur;
      const others = cur.parties.slice(0, -1).reduce((a, p) => a + p.shareBps, 0);
      const last = Math.max(0, 10000 - others);
      const next = cur.parties.slice();
      next[next.length - 1] = { ...next[next.length - 1], shareBps: last };
      return { ...cur, parties: next };
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
      <section className="space-y-8">
        {/* Parties */}
        <Card label="01 · parties">
          <div className="space-y-3">
            <PartiesEditor
              parties={values.parties}
              allowedRoles={template.allowedRoles}
              onChange={patchParty}
              onRemove={removeParty}
              capTable={template.partiesAreCapTable}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button onClick={addParty} className="btn">
                + add party
              </button>
              {template.partiesAreCapTable && (
                <div className="flex items-center gap-3">
                  <button onClick={autoBalance} className="btn">
                    auto-balance to 100%
                  </button>
                  <BpsGauge bps={bpsSum} />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Fields */}
        <Card label="02 · terms">
          <div className="grid gap-4 sm:grid-cols-2">
            {template.fields.map((f) => (
              <FieldRow
                key={f.key}
                def={f}
                value={values.fields[f.key]}
                onChange={(v) => patchField(f.key, v)}
              />
            ))}
          </div>
        </Card>

        {/* Validation */}
        <Card label="03 · validation">
          {issues.length === 0 ? (
            <p className="font-mono text-xs text-muzix-accent">
              ✓ All checks pass. Ready to deploy.
            </p>
          ) : (
            <ul className="space-y-1 font-mono text-xs text-muzix-warn">
              {issues.map((iss, idx) => (
                <li key={idx}>
                  ✗ {iss.field ? <code className="text-ink-300">{iss.field}</code> : null} {iss.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <aside className="space-y-8">
        {/* Plain-English draft */}
        <Card label="draft · plain english">
          <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-200">
            {draftText}
          </pre>
        </Card>

        {/* On-chain plan */}
        <Card label="onchain · plan">
          <div className="space-y-3 text-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
              mode · <span className={plan.mode === 'live' ? 'text-muzix-accent' : 'text-muzix-signal'}>{plan.mode}</span> · chain {MUZIX_CHAIN_ID}
            </p>
            {plan.notes.length > 0 && (
              <ul className="space-y-1 text-xs text-ink-300">
                {plan.notes.map((n, i) => (
                  <li key={i}>· {n}</li>
                ))}
              </ul>
            )}
            <ol className="space-y-2">
              {plan.calls.map((c, i) => (
                <li key={i} className="border border-ink-700 bg-ink-900/40 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                    step {i + 1} · {c.contract}.{c.fn}
                  </p>
                  <p className="mt-1 text-xs text-ink-200">{c.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </Card>

        {/* Deploy */}
        <DeployPanel
          calls={plan.calls as OnchainCall[]}
          disabled={issues.length > 0}
          catalogAddress={MUZIX_CATALOG_ADDRESS}
          deployed={isDeployed('MuzixCatalog') && isDeployed('MuzixAIProvenance')}
          values={values}
        />
      </aside>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-components

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="label mb-4">{label}</p>
      {children}
    </div>
  );
}

function BpsGauge({ bps }: { bps: number }) {
  const ok = bps === 10000;
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
      <span className={ok ? 'text-muzix-accent' : 'text-muzix-warn'}>
        {(bps / 100).toFixed(2)}%
      </span>
      <span className="text-ink-400">/ 100%</span>
      <span className={`h-2 w-24 ${ok ? 'bg-muzix-accent/30' : 'bg-muzix-warn/20'}`}>
        <span
          className={`block h-full ${ok ? 'bg-muzix-accent' : 'bg-muzix-warn'}`}
          style={{ width: `${Math.min(100, bps / 100)}%` }}
        />
      </span>
    </div>
  );
}

function PartiesEditor({
  parties,
  allowedRoles,
  onChange,
  onRemove,
  capTable,
}: {
  parties: Party[];
  allowedRoles: PartyRole[];
  onChange: (i: number, patch: Partial<Party>) => void;
  onRemove: (i: number) => void;
  capTable: boolean;
}) {
  const roleOptions = useMemo(
    () => PARTY_ROLES.filter((r) => allowedRoles.includes(r)),
    [allowedRoles],
  );

  if (parties.length === 0) {
    return <p className="font-mono text-xs text-ink-400">No parties yet — add one to get started.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-800 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            <th className="py-2 pr-2 text-left">name</th>
            <th className="py-2 pr-2 text-left">role</th>
            <th className="py-2 pr-2 text-left">address</th>
            {capTable && <th className="py-2 pr-2 text-right">share (bps)</th>}
            <th />
          </tr>
        </thead>
        <tbody>
          {parties.map((p, i) => (
            <tr key={i} className="border-b border-ink-800/60">
              <td className="py-2 pr-2">
                <input
                  className="w-full bg-transparent font-sans text-ink-100 outline-none placeholder:text-ink-500"
                  value={p.name}
                  onChange={(e) => onChange(i, { name: e.target.value })}
                  placeholder="Lavender Cassette"
                />
              </td>
              <td className="py-2 pr-2">
                <select
                  className="w-full bg-transparent font-mono text-xs text-ink-200 outline-none"
                  value={p.role}
                  onChange={(e) => onChange(i, { role: e.target.value as PartyRole })}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r} className="bg-ink">
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 pr-2">
                <input
                  className="w-full bg-transparent font-mono text-xs text-ink-200 outline-none placeholder:text-ink-500"
                  value={p.address}
                  onChange={(e) => onChange(i, { address: e.target.value as Party['address'] })}
                  placeholder="0x…"
                />
              </td>
              {capTable && (
                <td className="py-2 pr-2 text-right">
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    step={50}
                    className="w-24 bg-transparent text-right font-mono text-xs text-ink-100 outline-none"
                    value={p.shareBps}
                    onChange={(e) => onChange(i, { shareBps: Number(e.target.value) || 0 })}
                  />
                </td>
              )}
              <td className="py-2 pl-2 text-right">
                <button
                  onClick={() => onRemove(i)}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 hover:text-muzix-warn"
                  aria-label={`remove party ${i + 1}`}
                >
                  remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldRow({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: string | number | undefined;
  onChange: (v: string | number) => void;
}) {
  const v = value ?? '';
  const span = def.kind === 'multiline' || def.kind === 'uriList' ? 'sm:col-span-2' : '';

  return (
    <label className={`flex flex-col gap-1 ${span}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {def.label}
        {def.required && <span className="text-muzix-warn"> *</span>}
      </span>
      {def.kind === 'multiline' || def.kind === 'uriList' ? (
        <textarea
          rows={def.kind === 'uriList' ? 4 : 3}
          className="border border-ink-700 bg-ink-900/40 px-3 py-2 font-mono text-xs text-ink-100 outline-none focus:border-muzix-accent"
          value={String(v)}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : def.kind === 'select' ? (
        <select
          className="border border-ink-700 bg-ink-900/40 px-3 py-2 font-mono text-xs text-ink-100 outline-none focus:border-muzix-accent"
          value={String(v)}
          onChange={(e) => onChange(e.target.value)}
        >
          {(def.options ?? []).map((opt) => (
            <option key={opt} value={opt} className="bg-ink">
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={def.kind === 'integer' || def.kind === 'tokenId' ? 'number' : def.kind === 'date' ? 'date' : 'text'}
          className="border border-ink-700 bg-ink-900/40 px-3 py-2 font-mono text-xs text-ink-100 outline-none focus:border-muzix-accent"
          value={String(v)}
          placeholder={def.placeholder}
          onChange={(e) =>
            onChange(def.kind === 'integer' || def.kind === 'tokenId' ? Number(e.target.value) : e.target.value)
          }
        />
      )}
      {def.help && <span className="font-mono text-[10px] text-ink-500">{def.help}</span>}
    </label>
  );
}
