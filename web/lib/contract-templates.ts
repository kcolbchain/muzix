/**
 * Music contract templates for the Muzix visual builder.
 *
 * Each template carries:
 *   - a typed input schema (parties, terms, metadata)
 *   - a `draft()` that renders a plain-English agreement
 *   - an `onchain()` that maps the form values to concrete contract calls
 *     against the existing Muzix protocol (MuzixCatalog, MuzixAIProvenance).
 *
 * Templates intentionally lean on primitives that already ship in
 * `muzix/src/*.sol` — no new Solidity is required to deploy a v1 builder.
 * Where industry contracts have no on-chain primitive yet (e.g. sync
 * licensing windows), the template is honest about it: the prose
 * agreement is hashed and the hash is the on-chain footprint.
 */

import type { Address, Hex } from 'viem';

// ──────────────────────────────────────────────────────────────────────────
// Field schema

export type PartyRole =
  | 'Artist'
  | 'Featured Artist'
  | 'Producer'
  | 'Songwriter'
  | 'Publisher'
  | 'Label'
  | 'Licensee'
  | 'AI Model Owner'
  | 'Other';

export const PARTY_ROLES: PartyRole[] = [
  'Artist',
  'Featured Artist',
  'Producer',
  'Songwriter',
  'Publisher',
  'Label',
  'Licensee',
  'AI Model Owner',
  'Other',
];

export type Party = {
  name: string;
  address: Address | '';
  role: PartyRole;
  shareBps: number; // basis points, 0-10000
};

export type FieldKind =
  | 'text'
  | 'multiline'
  | 'address'
  | 'isrc'
  | 'integer'
  | 'date'
  | 'select'
  | 'tokenId'
  | 'uriList';

export type FieldDef = {
  key: string;
  label: string;
  help?: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[]; // for `select`
  placeholder?: string;
  defaultValue?: string | number;
};

export type TemplateValues = {
  parties: Party[];
  fields: Record<string, string | number>;
};

// ──────────────────────────────────────────────────────────────────────────
// Onchain action descriptor

export type OnchainCall = {
  /** Which deployed contract instance to call. */
  contract: 'MuzixCatalog' | 'MuzixAIProvenance';
  /** Function name (must exist on the ABI in `lib/contracts.ts`). */
  fn: string;
  /** Concrete args, ready to pass to viem `writeContract`. */
  args: readonly unknown[];
  /** Human-readable one-liner displayed in the deploy preview. */
  description: string;
  /** ETH/MUSD wei to send with this call (optional). */
  valueWei?: bigint;
};

export type OnchainPlan = {
  /**
   * `live` = every step is a real contract call.
   * `hybrid` = some terms live off-chain; only an attestation/hash goes onchain.
   */
  mode: 'live' | 'hybrid';
  calls: OnchainCall[];
  /** Notes shown above the call list (e.g. "sync windows live in the JSON"). */
  notes: string[];
};

export type ValidationIssue = { field?: string; message: string };

export type Template = {
  slug: string;
  name: string;
  blurb: string;
  category: 'Recording' | 'Publishing' | 'Licensing' | 'AI';
  /** Whether parties drive an on-chain bps cap-table. */
  partiesAreCapTable: boolean;
  /** Allowed roles in this template (UI filter on the party-role dropdown). */
  allowedRoles: PartyRole[];
  defaultParties: Party[];
  fields: FieldDef[];
  validate: (v: TemplateValues) => ValidationIssue[];
  draft: (v: TemplateValues) => string;
  onchain: (v: TemplateValues) => OnchainPlan;
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function bpsTotal(parties: Party[]): number {
  return parties.reduce((acc, p) => acc + (Number.isFinite(p.shareBps) ? p.shareBps : 0), 0);
}

function pct(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function partyLine(p: Party): string {
  const addr = p.address ? p.address : '[address pending]';
  return `${p.name || '[unnamed party]'} (${p.role}) — ${addr} — ${pct(p.shareBps)}`;
}

function isAddressLike(v: string): v is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

function validateParties(parties: Party[], requireCapTable: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (parties.length === 0) {
    issues.push({ message: 'Add at least one party.' });
    return issues;
  }
  parties.forEach((p, i) => {
    if (!p.name) issues.push({ field: `parties.${i}.name`, message: `Party #${i + 1}: name required.` });
    if (!p.address || !isAddressLike(p.address)) {
      issues.push({ field: `parties.${i}.address`, message: `Party #${i + 1}: needs a valid 0x address.` });
    }
    if (!Number.isFinite(p.shareBps) || p.shareBps < 0 || p.shareBps > 10000) {
      issues.push({ field: `parties.${i}.shareBps`, message: `Party #${i + 1}: share must be 0-10000 bps.` });
    }
  });
  if (requireCapTable) {
    const total = bpsTotal(parties);
    if (total !== 10000) {
      issues.push({ message: `Shares must total 100% (10000 bps). Currently ${(total / 100).toFixed(2)}%.` });
    }
  }
  return issues;
}

function metadataURI(values: Record<string, string | number>, parties: Party[]): string {
  // The UI shows this as a placeholder for the IPFS/HTTPS metadata pin.
  // SDK/oracle will replace this with a real pin during deploy.
  const seed = `${values.isrc || 'NO-ISRC'}:${values.title || 'untitled'}:${parties.length}`;
  return `ipfs://muzix/${seed.replace(/[^a-z0-9:_-]/gi, '').toLowerCase()}`;
}

// ──────────────────────────────────────────────────────────────────────────
// Templates

const recordingSplit: Template = {
  slug: 'recording-split',
  name: 'Recording royalty split',
  blurb:
    'Mint a Muzix catalog token for a recording and lock the cap table on-chain. Artist + producer + label + publisher style.',
  category: 'Recording',
  partiesAreCapTable: true,
  allowedRoles: ['Artist', 'Featured Artist', 'Producer', 'Label', 'Publisher', 'Other'],
  defaultParties: [
    { name: '', address: '', role: 'Artist', shareBps: 6000 },
    { name: '', address: '', role: 'Producer', shareBps: 2000 },
    { name: '', address: '', role: 'Label', shareBps: 1500 },
    { name: '', address: '', role: 'Publisher', shareBps: 500 },
  ],
  fields: [
    { key: 'title', label: 'Track title', kind: 'text', required: true, placeholder: 'Slow Light, Falling Brass' },
    { key: 'artist', label: 'Artist (display)', kind: 'text', required: true, placeholder: 'Lavender Cassette' },
    { key: 'isrc', label: 'ISRC', kind: 'isrc', required: true, placeholder: 'USRC17607839' },
    { key: 'releaseDate', label: 'Release date', kind: 'date', defaultValue: todayISO() },
    {
      key: 'territory',
      label: 'Territory',
      kind: 'select',
      options: ['Worldwide', 'North America', 'Europe', 'Asia-Pacific', 'Custom (see notes)'],
      defaultValue: 'Worldwide',
    },
    { key: 'notes', label: 'Special terms / notes', kind: 'multiline' },
  ],
  validate: (v) => validateParties(v.parties, true),
  draft: (v) => {
    const f = v.fields;
    return [
      `# Recording Royalty Agreement`,
      ``,
      `**Title:** ${f.title || '[title]'}`,
      `**Performing artist:** ${f.artist || '[artist]'}`,
      `**ISRC:** ${f.isrc || '[ISRC]'}`,
      `**Release date:** ${f.releaseDate || todayISO()}`,
      `**Territory:** ${f.territory || 'Worldwide'}`,
      ``,
      `## 1. Parties & cap table`,
      `The parties below agree to the proportional split of net recording revenue, enforced on-chain by the MuzixCatalog royalty-split mechanism (basis points, 10000 = 100%):`,
      ``,
      ...v.parties.map((p) => `- ${partyLine(p)}`),
      ``,
      `## 2. Revenue settlement`,
      `Streaming platforms and licensees deposit revenue into the token's on-chain balance via \`depositRevenue(tokenId)\`. Each party withdraws their pro-rata share via \`claimStreamingRevenue(tokenId)\`. No party shall be entitled to a distribution exceeding their share above.`,
      ``,
      `## 3. Provenance`,
      `The parties attest that this recording is human-authored unless an AI-provenance record is subsequently attached via the MuzixAIProvenance registry by the catalog token owner.`,
      ``,
      `## 4. Governing protocol`,
      `Settlement is governed by the MuzixCatalog contract on chain ${'${chainId}'}. The signed token URI is the canonical metadata reference.`,
      ``,
      f.notes ? `## 5. Notes\n${f.notes}` : ``,
    ]
      .filter(Boolean)
      .join('\n');
  },
  onchain: (v) => {
    const tokenURI = metadataURI(v.fields, v.parties);
    const isrc = String(v.fields.isrc || '');
    const artistName = String(v.fields.artist || '');
    const recipients = v.parties.map((p) => (p.address || ZERO_ADDRESS) as Address);
    const shares = v.parties.map((p) => p.shareBps);
    return {
      mode: 'live',
      notes: [
        'Step 1 mints the catalog token to your connected wallet.',
        'Step 2 is sent from the same wallet; the token owner is the only address allowed to set the split.',
      ],
      calls: [
        {
          contract: 'MuzixCatalog',
          fn: 'mintMusic',
          args: [tokenURI, { isrc, artist: artistName }],
          description: `mintMusic(tokenURI, {isrc:"${isrc}", artist:"${artistName}"})`,
        },
        {
          contract: 'MuzixCatalog',
          fn: 'setRoyaltySplit',
          args: ['__LAST_MINTED_TOKEN_ID__', recipients, shares],
          description: `setRoyaltySplit(<newTokenId>, ${recipients.length} recipients, shares totaling ${pct(bpsTotal(v.parties))})`,
        },
      ],
    };
  },
};

const featuredAdd: Template = {
  slug: 'featured-add',
  name: 'Add a featured artist',
  blurb:
    'Re-split an existing Muzix catalog token to include a featured artist or new collaborator. Token owner only.',
  category: 'Recording',
  partiesAreCapTable: true,
  allowedRoles: ['Artist', 'Featured Artist', 'Producer', 'Label', 'Publisher', 'Other'],
  defaultParties: [
    { name: '', address: '', role: 'Artist', shareBps: 5500 },
    { name: '', address: '', role: 'Featured Artist', shareBps: 1500 },
    { name: '', address: '', role: 'Producer', shareBps: 2000 },
    { name: '', address: '', role: 'Label', shareBps: 1000 },
  ],
  fields: [
    {
      key: 'tokenId',
      label: 'Existing Muzix tokenId',
      kind: 'tokenId',
      required: true,
      placeholder: '1',
      help: 'The token you already minted with the Recording split template.',
    },
    {
      key: 'reason',
      label: 'Reason for re-split',
      kind: 'multiline',
      placeholder: 'Adding a featured artist on the remix release; consideration agreed off-platform.',
    },
  ],
  validate: (v) => {
    const issues = validateParties(v.parties, true);
    const tid = String(v.fields.tokenId || '');
    if (!/^\d+$/.test(tid)) issues.push({ field: 'tokenId', message: 'tokenId must be a non-negative integer.' });
    return issues;
  },
  draft: (v) => {
    const f = v.fields;
    return [
      `# Re-Split Amendment — Featured Artist Addition`,
      ``,
      `**Catalog tokenId:** ${f.tokenId || '[tokenId]'}`,
      `**Effective date:** ${todayISO()}`,
      ``,
      `## 1. Updated cap table`,
      `The current token owner amends the on-chain royalty split to:`,
      ``,
      ...v.parties.map((p) => `- ${partyLine(p)}`),
      ``,
      `## 2. Accrued balance`,
      `Any revenue deposited prior to this amendment has already accrued under the previous split and remains claimable under the prior terms. New deposits are split under the new cap table.`,
      ``,
      f.reason ? `## 3. Reason\n${f.reason}` : ``,
    ]
      .filter(Boolean)
      .join('\n');
  },
  onchain: (v) => {
    const tokenId = BigInt(String(v.fields.tokenId || '0'));
    const recipients = v.parties.map((p) => (p.address || ZERO_ADDRESS) as Address);
    const shares = v.parties.map((p) => p.shareBps);
    return {
      mode: 'live',
      notes: [
        'Only the current token owner can call setRoyaltySplit — connect with the owner wallet.',
      ],
      calls: [
        {
          contract: 'MuzixCatalog',
          fn: 'setRoyaltySplit',
          args: [tokenId, recipients, shares],
          description: `setRoyaltySplit(tokenId=${tokenId}, ${recipients.length} recipients, totaling ${pct(bpsTotal(v.parties))})`,
        },
      ],
    };
  },
};

const aiTrainingLicense: Template = {
  slug: 'ai-training-license',
  name: 'AI training license',
  blurb:
    'Opt a recording into AI training under recorded terms. Binds the catalog token to AI-model token contracts via MuzixAIProvenance.',
  category: 'AI',
  partiesAreCapTable: false,
  allowedRoles: ['Artist', 'AI Model Owner', 'Licensee', 'Other'],
  defaultParties: [
    { name: '', address: '', role: 'Artist', shareBps: 0 },
    { name: '', address: '', role: 'AI Model Owner', shareBps: 0 },
  ],
  fields: [
    { key: 'tokenId', label: 'Muzix tokenId being licensed', kind: 'tokenId', required: true },
    {
      key: 'humanOnly',
      label: 'Human-only attestation?',
      kind: 'select',
      options: ['No — AI was involved', 'Yes — fully human'],
      defaultValue: 'No — AI was involved',
      help: 'A "human-only" record forbids attaching AI model tokens. Use this to certify a track is AI-free.',
    },
    {
      key: 'aiModelTokens',
      label: 'AI model token contracts (one per line)',
      kind: 'uriList',
      placeholder: '0xabc...\n0xdef...',
      help: 'Addresses of ERC-721-AI (or compatible) model contracts that contributed.',
    },
    {
      key: 'ipLineageURIs',
      label: 'IP lineage URIs (one per line)',
      kind: 'uriList',
      placeholder: 'ipfs://bafy.../model-card.json',
      help: 'Pointers to training-set manifests, model cards, or licensing receipts.',
    },
    {
      key: 'revenueShareBps',
      label: 'Model-owner revenue share (bps)',
      kind: 'integer',
      defaultValue: 0,
      help: 'Informational only at this layer — the cap table itself lives on MuzixCatalog and is set separately.',
    },
    { key: 'termMonths', label: 'License term (months)', kind: 'integer', defaultValue: 12 },
    { key: 'notes', label: 'Notes / restrictions', kind: 'multiline' },
  ],
  validate: (v) => {
    const issues: ValidationIssue[] = [];
    const tid = String(v.fields.tokenId || '');
    if (!/^\d+$/.test(tid)) issues.push({ field: 'tokenId', message: 'tokenId must be a non-negative integer.' });
    const humanOnly = String(v.fields.humanOnly || '').startsWith('Yes');
    const models = String(v.fields.aiModelTokens || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (humanOnly && models.length > 0) {
      issues.push({ field: 'aiModelTokens', message: 'Human-only attestation cannot list AI model tokens.' });
    }
    models.forEach((m, i) => {
      if (!isAddressLike(m)) {
        issues.push({ field: 'aiModelTokens', message: `Model #${i + 1} is not a valid 0x address.` });
      }
    });
    if (models.length > 16) issues.push({ field: 'aiModelTokens', message: 'Max 16 model tokens (contract limit).' });
    return issues;
  },
  draft: (v) => {
    const f = v.fields;
    const humanOnly = String(f.humanOnly || '').startsWith('Yes');
    const models = String(f.aiModelTokens || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const uris = String(f.ipLineageURIs || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    return [
      `# AI ${humanOnly ? 'Provenance Attestation' : 'Training License'}`,
      ``,
      `**Catalog tokenId:** ${f.tokenId || '[tokenId]'}`,
      `**Effective date:** ${todayISO()}`,
      `**Term:** ${f.termMonths || 12} months`,
      ``,
      humanOnly
        ? `## 1. Attestation\nThe parties attest that no AI model contributed to the master recording referenced above. The Muzix AI-provenance record will be set with \`humanOnly = true\`.`
        : `## 1. Grant\nThe rights holder grants the listed AI model owners a non-exclusive license to use the recording referenced above for the purpose of model training and inference, subject to the lineage references below.`,
      ``,
      `## 2. AI model contracts`,
      models.length ? models.map((m, i) => `- Model ${i + 1}: ${m}`).join('\n') : '_(none)_',
      ``,
      `## 3. IP lineage`,
      uris.length ? uris.map((u, i) => `- ${i + 1}. ${u}`).join('\n') : '_(none)_',
      ``,
      `## 4. Revenue share`,
      `Model-owner share: ${pct(Number(f.revenueShareBps) || 0)} (informational; settled via MuzixCatalog cap-table updates if/when applicable).`,
      ``,
      f.notes ? `## 5. Restrictions\n${f.notes}` : ``,
    ]
      .filter(Boolean)
      .join('\n');
  },
  onchain: (v) => {
    const tokenId = BigInt(String(v.fields.tokenId || '0'));
    const humanOnly = String(v.fields.humanOnly || '').startsWith('Yes');
    const models = String(v.fields.aiModelTokens || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean) as Address[];
    const uris = String(v.fields.ipLineageURIs || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    // provenanceHash = keccak256(abi.encode(humanOnly, models, uris)) — UI shows a placeholder; the SDK computes the real hash at submit time.
    const provenanceHash = ('0x' + '00'.repeat(32)) as Hex;
    return {
      mode: 'live',
      notes: [
        'The provenanceHash is computed at submit time via MuzixAIProvenance.computeProvenanceHash and replaced before sending.',
        'Caller must be the current owner of the catalog tokenId.',
      ],
      calls: [
        {
          contract: 'MuzixAIProvenance',
          fn: 'setProvenance',
          args: ['__CATALOG_ADDR__', tokenId, humanOnly, models, uris, provenanceHash],
          description: `setProvenance(tokenId=${tokenId}, humanOnly=${humanOnly}, ${models.length} models, ${uris.length} lineage URIs)`,
        },
      ],
    };
  },
};

const syncLicense: Template = {
  slug: 'sync-license',
  name: 'Sync license (film/TV/ad)',
  blurb:
    'One-shot synchronization license for placement. Terms live in the metadata JSON; on-chain footprint is the metadata hash + revenue split.',
  category: 'Licensing',
  partiesAreCapTable: true,
  allowedRoles: ['Artist', 'Publisher', 'Label', 'Licensee', 'Other'],
  defaultParties: [
    { name: '', address: '', role: 'Artist', shareBps: 5000 },
    { name: '', address: '', role: 'Publisher', shareBps: 3000 },
    { name: '', address: '', role: 'Label', shareBps: 2000 },
  ],
  fields: [
    { key: 'title', label: 'Track title', kind: 'text', required: true },
    { key: 'isrc', label: 'ISRC', kind: 'isrc', required: true },
    { key: 'licensee', label: 'Licensee (display)', kind: 'text', required: true, placeholder: 'Acme Pictures, LLC' },
    {
      key: 'usage',
      label: 'Usage',
      kind: 'select',
      options: ['Feature film', 'TV series', 'Advertisement', 'Trailer', 'Video game', 'Other'],
      defaultValue: 'Feature film',
    },
    { key: 'territory', label: 'Territory', kind: 'select', options: ['Worldwide', 'North America', 'Europe', 'Asia-Pacific'], defaultValue: 'Worldwide' },
    { key: 'termMonths', label: 'Term (months)', kind: 'integer', defaultValue: 60 },
    { key: 'feeMusd', label: 'Up-front fee (MUSD)', kind: 'integer', defaultValue: 5000 },
    { key: 'exclusivity', label: 'Exclusivity', kind: 'select', options: ['Non-exclusive', 'Exclusive within usage'], defaultValue: 'Non-exclusive' },
    { key: 'project', label: 'Project / production name', kind: 'text' },
    { key: 'restrictions', label: 'Restrictions', kind: 'multiline' },
  ],
  validate: (v) => validateParties(v.parties, true),
  draft: (v) => {
    const f = v.fields;
    return [
      `# Synchronization License Agreement`,
      ``,
      `**Track:** ${f.title || '[title]'} (ISRC ${f.isrc || '[ISRC]'})`,
      `**Licensee:** ${f.licensee || '[licensee]'}`,
      `**Project:** ${f.project || '[project]'}`,
      `**Usage:** ${f.usage}`,
      `**Territory:** ${f.territory}`,
      `**Term:** ${f.termMonths || 60} months from ${todayISO()}`,
      `**Exclusivity:** ${f.exclusivity}`,
      `**Up-front fee:** ${f.feeMusd || 0} MUSD`,
      ``,
      `## 1. Grant`,
      `Licensor grants Licensee a ${String(f.exclusivity).toLowerCase()} synchronization right to use the recording above in the ${String(f.usage).toLowerCase()} identified, within the territory and term stated.`,
      ``,
      `## 2. Consideration & split`,
      `The up-front fee is paid into the MuzixCatalog token balance and distributed to the parties below per the on-chain royalty split (basis points, 10000 = 100%):`,
      ``,
      ...v.parties.map((p) => `- ${partyLine(p)}`),
      ``,
      `## 3. Off-chain enforcement`,
      `Usage scope and restrictions are off-chain obligations of the Licensee. The keccak256 hash of this JSON metadata is recorded as the canonical agreement reference on the catalog token.`,
      ``,
      f.restrictions ? `## 4. Restrictions\n${f.restrictions}` : ``,
    ]
      .filter(Boolean)
      .join('\n');
  },
  onchain: (v) => {
    const tokenURI = metadataURI(v.fields, v.parties);
    const isrc = String(v.fields.isrc || '');
    const artistName = String(v.fields.title || ''); // sync deals are referenced by track, not artist
    const recipients = v.parties.map((p) => (p.address || ZERO_ADDRESS) as Address);
    const shares = v.parties.map((p) => p.shareBps);
    return {
      mode: 'hybrid',
      notes: [
        'Sync windows and usage scope are off-chain — they live in the metadata JSON pinned to tokenURI.',
        'On-chain we mint a catalog token holding the agreement hash and the revenue split. Settlement of the up-front fee is a separate deposit transaction.',
      ],
      calls: [
        {
          contract: 'MuzixCatalog',
          fn: 'mintMusic',
          args: [tokenURI, { isrc, artist: artistName }],
          description: `mintMusic(tokenURI=${tokenURI}, {isrc:"${isrc}"}) — token represents the sync agreement`,
        },
        {
          contract: 'MuzixCatalog',
          fn: 'setRoyaltySplit',
          args: ['__LAST_MINTED_TOKEN_ID__', recipients, shares],
          description: `setRoyaltySplit on the sync token (${recipients.length} recipients, totaling ${pct(bpsTotal(v.parties))})`,
        },
      ],
    };
  },
};

export const TEMPLATES: Template[] = [
  recordingSplit,
  featuredAdd,
  aiTrainingLicense,
  syncLicense,
];

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

export function bpsTotalOf(parties: Party[]): number {
  return bpsTotal(parties);
}

export function defaultValues(t: Template): TemplateValues {
  const fields: Record<string, string | number> = {};
  for (const f of t.fields) {
    if (f.defaultValue !== undefined) fields[f.key] = f.defaultValue;
    else fields[f.key] = '';
  }
  return { parties: t.defaultParties.map((p) => ({ ...p })), fields };
}
