import { fmtBps } from '@/lib/format';

const PALETTE = [
  '#f5c451',
  '#7dd3fc',
  '#a78bfa',
  '#fb923c',
  '#34d399',
  '#f472b6',
  '#facc15',
];

export type Split = { role: string; shareBps: number; recipient?: string };

export function SplitBar({
  splits,
  height = 8,
}: {
  splits: Split[];
  height?: number;
}) {
  return (
    <div
      className="flex w-full overflow-hidden border border-ink-700"
      style={{ height }}
      aria-label="royalty split bar"
    >
      {splits.map((s, i) => (
        <div
          key={`${s.role}-${i}`}
          style={{
            width: `${s.shareBps / 100}%`,
            background: PALETTE[i % PALETTE.length],
          }}
          title={`${s.role} — ${fmtBps(s.shareBps)}`}
        />
      ))}
    </div>
  );
}

export function SplitLegend({ splits }: { splits: Split[] }) {
  return (
    <ul className="space-y-2 font-mono text-xs">
      {splits.map((s, i) => (
        <li key={`${s.role}-${i}`} className="flex items-center gap-3">
          <span
            className="inline-block h-2 w-2"
            style={{ background: PALETTE[i % PALETTE.length] }}
            aria-hidden
          />
          <span className="flex-1 text-ink-100">{s.role}</span>
          {s.recipient && (
            <span className="hidden text-[11px] text-ink-400 md:inline">
              {s.recipient.slice(0, 6)}…{s.recipient.slice(-4)}
            </span>
          )}
          <span className="w-14 text-right text-muzix-accent">
            {fmtBps(s.shareBps)}
          </span>
        </li>
      ))}
    </ul>
  );
}
