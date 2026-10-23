import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CarForm } from "../CarForm";

export const metadata = { title: "Add a car" };

export default async function NewCarPage() {
  await requireUser("FULL");
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/admin/cars" className="text-sm text-mute hover:text-ivory">← All cars</Link>
      <h1 className="font-serif text-4xl font-medium">Add a car</h1>
      <p className="-mt-3 text-mute">Fill in the details and create the car. Then you can add colours, photos and “You may also like”.</p>
      <CarForm car={{ year: new Date().getFullYear(), seats: 5, warranty_years: 3, warranty_km: 100000, published: true, stock: 1 }} />
    </div>
  );
}
