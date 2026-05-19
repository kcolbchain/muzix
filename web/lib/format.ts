export function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function fmtBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

/** USD with 6 decimals (MUSD) → human */
export function fmtMusd(value: bigint): string {
  const whole = value / 1_000_000n;
  const cents = Number(value % 1_000_000n) / 1_000_000;
  const n = Number(whole) + cents;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function fmtNum(n: bigint | number): string {
  return Number(n).toLocaleString('en-US');
}
