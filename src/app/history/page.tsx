import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

type PurchaseItem = {
  id: string;
  quantity: number;
  unit_price: number | null;
  final_price: number;
  products: { name: string }[] | null;
};

async function HistoryContent() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) redirect("/login");

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("id, purchase_date, total_amount, stores(chain_name, branch_name), purchase_items(id, quantity, unit_price, final_price, products(name))")
    .eq("processing_status", "confirmed")
    .order("purchase_date", { ascending: false });

  if (error) {
    throw new Error(`טעינת היסטוריית הקניות נכשלה: ${error.message}`);
  }

  return (
    <main className="min-h-screen px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-medium text-emerald-700">← חזרה לראשי</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">היסטוריית קניות</h1>
            <p className="mt-2 text-slate-600">רכישות שאושרו ונשמרו במסד הנתונים.</p>
          </div>
          <Link href="/catalog" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">
            הוספת רכישה ידנית
          </Link>
        </div>

        {receipts.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
            עדיין לא נשמרו רכישות.
          </section>
        ) : (
          <div className="mt-8 space-y-4">
            {receipts.map((receipt) => {
              const items = (receipt.purchase_items ?? []) as PurchaseItem[];
              const store = Array.isArray(receipt.stores) ? receipt.stores[0] : receipt.stores;

              return (
                <article key={receipt.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="font-bold text-slate-950">
                        {new Date(`${receipt.purchase_date}T00:00:00`).toLocaleDateString("he-IL")}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {store?.chain_name ?? "רכישה ידנית"}
                        {store?.branch_name ? ` · ${store.branch_name}` : ""}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-slate-950">
                      {Number(receipt.total_amount).toFixed(2)} ₪
                    </p>
                  </div>
                  <ul className="mt-4 divide-y divide-slate-100">
                    {items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                        <span>
                          {item.products?.[0]?.name ?? "מוצר שלא שויך"}
                          <span className="mr-2 text-slate-500">× {item.quantity}</span>
                        </span>
                        <span className="font-medium">{Number(item.final_price).toFixed(2)} ₪</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<main className="p-10 text-slate-600">טוען היסטוריה...</main>}>
      <HistoryContent />
    </Suspense>
  );
}
