import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-start justify-center space-y-5 py-20">
      <p className="label">/ 404 · token not found</p>
      <h1 className="font-sans text-5xl font-light tracking-tight text-ink-100">
        Off-chain.
      </h1>
      <p className="max-w-md text-ink-300">
        That token doesn&rsquo;t exist on this catalog. Either the ISRC is
        wrong, or it hasn&rsquo;t been minted yet.
      </p>
      <Link href="/catalog" className="btn-accent">
        Back to catalog
      </Link>
    </div>
  );
}
