import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-page flex min-h-[50vh] flex-col items-start justify-center gap-6 py-20">
      <p className="eyebrow">404</p>
      <h1 className="font-serif text-5xl font-medium">Page not found · Էջը չի գտնվել</h1>
      <Link href="/" className="btn-gold">Billions</Link>
    </section>
  );
}
