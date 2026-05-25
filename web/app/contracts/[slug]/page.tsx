import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TEMPLATES, getTemplate } from '@/lib/contract-templates';
import { ContractBuilder } from '@/components/ContractBuilder';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = getTemplate(slug);
  if (!t) return { title: 'Contract · Muzix' };
  return {
    title: `${t.name} · Muzix builder`,
    description: t.blurb,
  };
}

export default async function ContractBuilderPage({ params }: Props) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
          <Link href="/contracts" className="hover:text-muzix-accent">
            ← all templates
          </Link>
          <span>/</span>
          <span className="text-ink-300">{template.category}</span>
        </div>
        <h1 className="font-sans text-3xl font-light tracking-tight text-ink-100 md:text-4xl">
          {template.name}
        </h1>
        <p className="max-w-3xl text-pretty text-ink-300">{template.blurb}</p>
      </header>

      <ContractBuilder slug={template.slug} />
    </div>
  );
}
