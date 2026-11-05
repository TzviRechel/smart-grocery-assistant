import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CatalogManager } from "./CatalogManager";

async function CatalogContent() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) redirect("/login");

  const [productsResult, brandsResult, categoriesResult] = await Promise.all([
    supabase.from("products").select("id, name, barcode, package_size, package_unit, brand_id, category_id").order("name"),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  if (productsResult.error) throw new Error(`טעינת מוצרים נכשלה: ${productsResult.error.message}`);
  if (brandsResult.error) throw new Error(`טעינת מותגים נכשלה: ${brandsResult.error.message}`);
  if (categoriesResult.error) throw new Error(`טעינת קטגוריות נכשלה: ${categoriesResult.error.message}`);

  return (
    <main className="min-h-screen px-5 py-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="text-sm font-medium text-emerald-700">← חזרה לראשי</Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">מוצרים וקטגוריות</h1>
        <p className="mt-2 text-slate-600">ניהול המאגר האישי שלך. כל הנתונים נשמרים ב־Supabase.</p>
        <div className="mt-8">
          <CatalogManager
            initialProducts={productsResult.data ?? []}
            initialBrands={brandsResult.data ?? []}
            initialCategories={categoriesResult.data ?? []}
          />
        </div>
      </div>
    </main>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<main className="p-10 text-slate-600">טוען את הקטלוג...</main>}>
      <CatalogContent />
    </Suspense>
  );
}
