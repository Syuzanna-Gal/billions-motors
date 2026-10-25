import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { adminT, carFormOptions } from "@/lib/admin/lang";
import { CarForm } from "../CarForm";

export async function generateMetadata() {
  return { title: (await adminT()).carForm.newTitle };
}

export default async function NewCarPage() {
  await requireUser("FULL");
  const [t, options] = await Promise.all([adminT(), carFormOptions()]);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/admin/cars" className="text-sm text-mute hover:text-ivory">{t.carForm.allCars}</Link>
      <h1 className="font-serif text-4xl font-medium">{t.carForm.newTitle}</h1>
      <p className="-mt-3 text-mute">{t.carForm.newLead}</p>
      <CarForm t={t.carForm} options={options}
        car={{ year: new Date().getFullYear(), seats: 5, warranty_years: 3, warranty_km: 100000, published: true, stock: 1 }} />
    </div>
  );
}
