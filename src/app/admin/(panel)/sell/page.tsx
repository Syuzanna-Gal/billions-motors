import { requireUser } from "@/lib/auth";
import { listSales, listSellableCars } from "@/lib/admin/sales";
import { cancelSaleAction } from "../../actions";
import { SellForm } from "./SellForm";

export const metadata = { title: "Sell a car" };

const when = (d: Date | string) =>
  new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Yerevan" });

export default async function SellPage() {
  const user = await requireUser();
  const [cars, sales] = await Promise.all([listSellableCars(), listSales(user)]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <h1 className="font-serif text-4xl font-medium">Sell a car</h1>
        <p className="mt-2 text-mute">Choose the car and press the button. Stock updates on the site straight away.</p>
      </header>

      <SellForm cars={cars} />

      <section>
        <h2 className="mb-4 text-lg font-semibold">{user.role === "FULL" ? "Recent sales" : "My recent sales"}</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-mute">No sales yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-[20px] border border-line">
            {sales.map((s) => (
              <li key={s.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${s.cancelled_at ? "opacity-50" : ""}`}>
                <div className="min-w-0">
                  <p className="font-medium">
                    {s.vehicle_name}
                    {s.color_name && <span className="text-mute"> · {s.color_name}</span>}
                    {s.quantity > 1 && <span className="text-mute"> × {s.quantity}</span>}
                  </p>
                  <p className="mt-1 text-xs text-mute-2">
                    {when(s.created_at)} · {s.sold_by_name}
                    {s.customer_name && ` · ${s.customer_name}`}
                    {s.price_amd && ` · ${new Intl.NumberFormat("en-US").format(s.price_amd)} AMD`}
                    {s.cancelled_at && " · undone"}
                  </p>
                </div>
                {!s.cancelled_at && (user.role === "FULL" || s.sold_by === user.id) && (
                  <form action={cancelSaleAction}>
                    <input type="hidden" name="sale_id" value={s.id} />
                    <button type="submit" className="rounded-full border border-line px-4 py-2 text-xs text-mute hover:border-gold/50 hover:text-ivory">
                      Undo
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
