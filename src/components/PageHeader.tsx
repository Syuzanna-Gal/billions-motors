export function PageHeader({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <section className="container-page pb-10 pt-14 sm:pt-20">
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h1 className="font-serif text-5xl font-medium leading-[1.05] sm:text-6xl">{title}</h1>
      {lead && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-mute">{lead}</p>}
    </section>
  );
}
