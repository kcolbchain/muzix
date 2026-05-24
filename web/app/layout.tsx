import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Muzix — Layer 0 for music finance',
  description:
    'On-chain settlement for music: tokenized catalogs, royalty splits, MUSD, AI provenance. Built on the OP Stack.',
  metadataBase: new URL('https://muzix.kcolbchain.com'),
  openGraph: {
    title: 'Muzix — Layer 0 for music finance',
    description:
      'Tokenize catalogs. Settle royalties on-chain. Attribute AI in music.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink antialiased">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-6 pb-32 pt-10 md:pt-14">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-3">
          <Mark />
          <span className="font-mono text-xs uppercase tracking-[0.32em] text-ink-100 group-hover:text-muzix-accent">
            Muzix
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 md:inline">
            / layer 0 for music
          </span>
        </Link>
        <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-300">
          <Link href="/catalog" className="hover:text-muzix-accent">
            Catalog
          </Link>
          <Link href="/contracts" className="hover:text-muzix-accent">
            Contracts
          </Link>
          <Link href="/about" className="hover:text-muzix-accent">
            About
          </Link>
          <a
            href="https://github.com/kcolbchain/muzix"
            target="_blank"
            rel="noreferrer"
            className="hover:text-muzix-accent"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-800">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 text-[11px] font-mono text-ink-400 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Mark small />
          <span className="uppercase tracking-[0.2em]">
            Muzix · kcolbchain · MIT
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 uppercase tracking-[0.2em]">
          <a
            href="https://docs.kcolbchain.com/muzix/"
            className="hover:text-muzix-accent"
          >
            Docs
          </a>
          <a
            href="https://github.com/kcolbchain/muzix"
            className="hover:text-muzix-accent"
          >
            Source
          </a>
          <a
            href="https://github.com/kcolbchain/muzix/blob/main/CONTRIBUTING.md"
            className="hover:text-muzix-accent"
          >
            Contribute
          </a>
        </div>
      </div>
    </footer>
  );
}

function Mark({ small }: { small?: boolean }) {
  const size = small ? 16 : 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muzix-accent"
      aria-hidden
    >
      <rect x="1" y="6" width="2" height="8" fill="currentColor" />
      <rect x="5" y="2" width="2" height="16" fill="currentColor" />
      <rect x="9" y="8" width="2" height="4" fill="currentColor" />
      <rect x="13" y="4" width="2" height="12" fill="currentColor" />
      <rect x="17" y="7" width="2" height="6" fill="currentColor" />
    </svg>
  );
}
