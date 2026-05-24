'use client';

import { useState } from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  encodeFunctionData,
  http,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  type Abi,
  type Address,
  type Hex,
  type TransactionReceipt,
} from 'viem';
import {
  MUZIX_AI_PROVENANCE_ABI,
  MUZIX_AI_PROVENANCE_ADDRESS,
  MUZIX_CATALOG_ABI,
  MUZIX_CATALOG_ADDRESS,
  MUZIX_CHAIN_ID,
  abiFor,
  addressFor,
} from '@/lib/contracts';
import type { OnchainCall, TemplateValues } from '@/lib/contract-templates';

type Status =
  | { kind: 'idle' }
  | { kind: 'connecting' }
  | { kind: 'sending'; step: number; total: number }
  | { kind: 'mined'; step: number; total: number; hash: Hex; tokenId?: bigint }
  | { kind: 'done'; hashes: Hex[]; tokenId?: bigint }
  | { kind: 'error'; message: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function DeployPanel({
  calls,
  disabled,
  catalogAddress,
  deployed,
  values,
}: {
  calls: OnchainCall[];
  disabled: boolean;
  catalogAddress: Address;
  deployed: boolean;
  values: TemplateValues;
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [account, setAccount] = useState<Address | null>(null);

  const hasWallet = typeof window !== 'undefined' && !!window.ethereum;

  async function connect() {
    if (!hasWallet) {
      setStatus({ kind: 'error', message: 'No browser wallet detected (window.ethereum is undefined).' });
      return;
    }
    setStatus({ kind: 'connecting' });
    try {
      const accts = (await window.ethereum!.request({ method: 'eth_requestAccounts' })) as Address[];
      setAccount(accts[0] ?? null);
      setStatus({ kind: 'idle' });
    } catch (e: unknown) {
      setStatus({ kind: 'error', message: errorMessage(e) });
    }
  }

  async function deploy() {
    if (!hasWallet) {
      setStatus({ kind: 'error', message: 'Connect a wallet first.' });
      return;
    }
    if (!deployed) {
      setStatus({
        kind: 'error',
        message: 'Muzix contracts are not configured for this build. Set NEXT_PUBLIC_MUZIX_CATALOG and NEXT_PUBLIC_MUZIX_AI_PROVENANCE.',
      });
      return;
    }

    try {
      const wallet = createWalletClient({ transport: custom(window.ethereum!) });
      const pub = createPublicClient({ transport: custom(window.ethereum!) });

      const [acct] = await wallet.getAddresses();
      if (!acct) throw new Error('No wallet account available.');
      setAccount(acct);

      const chainId = await pub.getChainId();
      if (chainId !== MUZIX_CHAIN_ID) {
        throw new Error(`Wrong network — wallet is on chain ${chainId}, expected ${MUZIX_CHAIN_ID}.`);
      }

      const hashes: Hex[] = [];
      let mintedTokenId: bigint | undefined;

      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        setStatus({ kind: 'sending', step: i + 1, total: calls.length });

        const resolved = resolveCall(call, { mintedTokenId, values, catalogAddress, forPreview: false });

        const hash = await wallet.writeContract({
          address: addressFor(resolved.contract),
          abi: abiFor(resolved.contract),
          functionName: resolved.fn,
          args: resolved.args as readonly unknown[],
          account: acct,
          chain: null,
          value: resolved.valueWei,
        });

        const receipt = (await pub.waitForTransactionReceipt({ hash })) as TransactionReceipt;
        hashes.push(hash);

        if (resolved.contract === 'MuzixCatalog' && resolved.fn === 'mintMusic') {
          mintedTokenId = extractMintedTokenId(receipt, acct);
        }

        setStatus({ kind: 'mined', step: i + 1, total: calls.length, hash, tokenId: mintedTokenId });
      }

      setStatus({ kind: 'done', hashes, tokenId: mintedTokenId });
    } catch (e: unknown) {
      setStatus({ kind: 'error', message: errorMessage(e) });
    }
  }

  function copyCalldata() {
    const blob = calls
      .map((c, i) => {
        const resolved = resolveCall(c, { mintedTokenId: undefined, values, catalogAddress, forPreview: true });
        const calldata = encodeFunctionData({
          abi: abiFor(resolved.contract),
          functionName: resolved.fn,
          args: resolved.args as readonly unknown[],
        });
        return [
          `# step ${i + 1} — ${resolved.contract}.${resolved.fn}`,
          `to:       ${addressFor(resolved.contract)}`,
          `function: ${resolved.fn}`,
          `calldata: ${calldata}`,
          c.description,
        ].join('\n');
      })
      .join('\n\n');
    void navigator.clipboard.writeText(blob);
  }

  return (
    <div className="card space-y-4 p-5">
      <p className="label">04 · deploy</p>

      {!deployed && (
        <p className="font-mono text-[11px] text-muzix-warn">
          ⚠ Live contracts aren&apos;t configured for this build — set
          <code className="ml-1 text-ink-100">NEXT_PUBLIC_MUZIX_CATALOG</code> +{' '}
          <code className="text-ink-100">NEXT_PUBLIC_MUZIX_AI_PROVENANCE</code>. You can still copy
          encoded calldata below.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {account ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muzix-accent">
            wallet · {shortAddr(account)}
          </span>
        ) : (
          <button onClick={connect} className="btn" disabled={!hasWallet}>
            connect wallet
          </button>
        )}
        <button
          onClick={deploy}
          disabled={disabled || !hasWallet || !deployed}
          className="btn-accent disabled:opacity-40"
        >
          deploy onchain →
        </button>
        <button onClick={copyCalldata} className="btn">
          copy calldata
        </button>
      </div>

      <StatusLine status={status} />

      <details className="border-t border-ink-800 pt-3">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 hover:text-muzix-accent">
          encoded calls preview
        </summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-ink-300">
          {calls
            .map((c, i) => {
              const resolved = resolveCall(c, { mintedTokenId: undefined, values, catalogAddress, forPreview: true });
              const calldata = encodeFunctionData({
                abi: abiFor(resolved.contract),
                functionName: resolved.fn,
                args: resolved.args as readonly unknown[],
              });
              return `step ${i + 1} → ${addressFor(resolved.contract)} :: ${resolved.contract}.${resolved.fn}\n${calldata}`;
            })
            .join('\n\n')}
        </pre>
      </details>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;
  if (status.kind === 'connecting')
    return <p className="font-mono text-[11px] text-ink-300">… connecting wallet</p>;
  if (status.kind === 'sending')
    return (
      <p className="font-mono text-[11px] text-muzix-signal">
        … sending step {status.step}/{status.total}, confirm in wallet
      </p>
    );
  if (status.kind === 'mined')
    return (
      <p className="font-mono text-[11px] text-muzix-accent">
        ✓ step {status.step}/{status.total} mined · {shortHex(status.hash)}
        {status.tokenId !== undefined && ` · tokenId ${status.tokenId.toString()}`}
      </p>
    );
  if (status.kind === 'done')
    return (
      <div className="space-y-1 font-mono text-[11px]">
        <p className="text-muzix-accent">✓ deployed</p>
        {status.tokenId !== undefined && (
          <p className="text-ink-300">tokenId · {status.tokenId.toString()}</p>
        )}
        {status.hashes.map((h, i) => (
          <p key={h} className="text-ink-300">
            tx {i + 1} · {h}
          </p>
        ))}
      </div>
    );
  return <p className="font-mono text-[11px] text-muzix-warn">✗ {status.message}</p>;
}

// ──────────────────────────────────────────────────────────────────────────
// Call resolution: handles late-bound placeholders ('__LAST_MINTED_TOKEN_ID__',
// '__CATALOG_ADDR__', provenance-hash zero) before the call is sent.

function resolveCall(
  call: OnchainCall,
  ctx: {
    mintedTokenId: bigint | undefined;
    values: TemplateValues;
    catalogAddress: Address;
    /** When true, unresolved placeholders fall back to safe defaults so the
     *  caller can encode a preview. Used by the calldata preview + copy
     *  buttons; the live deploy loop passes `false` and surfaces the error. */
    forPreview: boolean;
  },
): OnchainCall {
  const args = call.args.map((a) => {
    if (a === '__LAST_MINTED_TOKEN_ID__') {
      if (ctx.mintedTokenId !== undefined) return ctx.mintedTokenId;
      if (ctx.forPreview) return 0n;
      throw new Error('Cannot resolve token id before mint — make sure mintMusic runs first.');
    }
    if (a === '__CATALOG_ADDR__') return ctx.catalogAddress;
    return a;
  });

  // AI-provenance hash: if last arg is the zero hash AND fn is setProvenance, compute it from the prior args.
  if (call.contract === 'MuzixAIProvenance' && call.fn === 'setProvenance') {
    const last = args[args.length - 1];
    if (typeof last === 'string' && /^0x0+$/.test(last)) {
      const humanOnly = args[2] as boolean;
      const aiModels = args[3] as readonly Address[];
      const uris = args[4] as readonly string[];
      args[args.length - 1] = computeProvenanceHash(humanOnly, aiModels, uris);
    }
  }

  return { ...call, args };
}

function computeProvenanceHash(humanOnly: boolean, models: readonly Address[], uris: readonly string[]): Hex {
  // Mirrors `MuzixAIProvenance.computeProvenanceHash`:
  //   keccak256(abi.encode(humanOnly, aiModelTokens, ipLineageURIs))
  const encoded = encodeAbiParameters(parseAbiParameters('bool, address[], string[]'), [humanOnly, [...models], [...uris]]);
  return keccak256(encoded);
}

function extractMintedTokenId(receipt: TransactionReceipt, mintedTo: Address): bigint | undefined {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: MUZIX_CATALOG_ABI as unknown as Abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'Transfer') {
        const args = decoded.args as unknown as { from: Address; to: Address; tokenId: bigint };
        if (args.from.toLowerCase() === '0x0000000000000000000000000000000000000000' && args.to.toLowerCase() === mintedTo.toLowerCase()) {
          return args.tokenId;
        }
      }
    } catch {
      // not a Transfer log — skip
    }
  }
  return undefined;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Unknown error';
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortHex(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

// Re-export so the builder can compile-check the addresses are wired.
export { MUZIX_CATALOG_ADDRESS, MUZIX_AI_PROVENANCE_ADDRESS, MUZIX_CATALOG_ABI, MUZIX_AI_PROVENANCE_ABI };
