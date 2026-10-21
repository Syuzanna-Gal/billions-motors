import { reveal } from "@/lib/reveal";

export function PageHeader({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <section className="container-page pb-10 pt-14 sm:pt-20">
      {eyebrow && (
        <p className="eyebrow mb-4" {...reveal(0)}>
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-5xl font-medium leading-[1.05] sm:text-6xl" {...reveal(80)}>
        {title}
      </h1>
      {lead && (
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-mute" {...reveal(160)}>
          {lead}
        </p>
      )}
    </section>
  );
}
