/**
 * Deterministic pseudo-waveform — same seed → same pattern.
 * Used decoratively across the explorer.
 */
export function Bars({
  seed,
  count = 48,
  className = '',
}: {
  seed: string;
  count?: number;
  className?: string;
}) {
  const heights = waveform(seed, count);
  return (
    <div className={`bars ${className}`}>
      {heights.map((h, i) => (
        <span key={i} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function waveform(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const v = ((h >>> 0) % 100) / 100;
    // bell-shaped envelope
    const env = Math.sin((Math.PI * (i + 1)) / (count + 1));
    out.push(20 + Math.floor(v * 70 * env));
  }
  return out;
}
