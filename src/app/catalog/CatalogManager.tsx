"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  barcode: string | null;
  package_size: number | null;
  package_unit: string | null;
  brand_id: string | null;
  category_id: string | null;
};

type CatalogManagerProps = {
  initialProducts: Product[];
  initialBrands: Option[];
  initialCategories: Option[];
};

export function CatalogManager({
  initialProducts,
  initialBrands,
  initialCategories,
}: CatalogManagerProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [brands, setBrands] = useState(initialBrands);
  const [categories, setCategories] = useState(initialCategories);
  const [productName, setProductName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [packageUnit, setPackageUnit] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function getUserId() {
    const supabase = createClient();
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      throw new Error("פג תוקף ההתחברות. יש להתחבר מחדש.");
    }
    return { supabase, userId: data.user.id };
  }

  async function addBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveReference("brands", newBrand.trim(), setNewBrand, setBrands);
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveReference("categories", newCategory.trim(), setNewCategory, setCategories);
  }

  async function saveReference(
    table: "brands" | "categories",
    name: string,
    clear: (value: string) => void,
    setOptions: (options: Option[]) => void,
  ) {
    if (!name) {
      setError("יש להזין שם.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const { supabase, userId } = await getUserId();
      const { data, error: insertError } = await supabase
        .from(table)
        .insert({ name, owner_id: userId })
        .select("id, name")
        .single();

      if (insertError) throw insertError;
      setOptions([...((table === "brands" ? brands : categories)), data].sort((a, b) => a.name.localeCompare(b.name)));
      clear("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "שמירת הנתון נכשלה.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productName.trim() || !categoryId) {
      setError("שם מוצר וקטגוריה הם שדות חובה.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const { supabase, userId } = await getUserId();
      const { data, error: insertError } = await supabase
        .from("products")
        .insert({
          owner_id: userId,
          name: productName.trim(),
          brand_id: brandId || null,
          category_id: categoryId,
          barcode: barcode.trim() || null,
          package_size: packageSize ? Number(packageSize) : null,
          package_unit: packageUnit || null,
        })
        .select("id, name, barcode, package_size, package_unit, brand_id, category_id")
        .single();

      if (insertError) throw insertError;
      setProducts([data, ...products]);
      setProductName("");
      setBarcode("");
      setPackageSize("");
      setPackageUnit("");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "שמירת המוצר נכשלה.");
    } finally {
      setIsSaving(false);
    }
  }

  const brandName = new Map(brands.map((brand) => [brand.id, brand.name]));
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="space-y-8">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={addProduct} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-950">מוצר חדש</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input required value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="שם מוצר *" className="field" />
            <input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="ברקוד" className="field" dir="ltr" />
            <select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="field">
              <option value="">בחירת קטגוריה *</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={brandId} onChange={(event) => setBrandId(event.target.value)} className="field">
              <option value="">ללא מותג</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
            <input type="number" min="0" step="0.001" value={packageSize} onChange={(event) => setPackageSize(event.target.value)} placeholder="גודל אריזה" className="field" />
            <select value={packageUnit} onChange={(event) => setPackageUnit(event.target.value)} className="field">
              <option value="">יחידת מידה</option>
              <option value="g">גרם</option>
              <option value="kg">ק״ג</option>
              <option value="ml">מ״ל</option>
              <option value="l">ליטר</option>
              <option value="unit">יחידה</option>
            </select>
          </div>
          <button disabled={isSaving} className="mt-5 rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-60">
            {isSaving ? "שומר..." : "שמירת מוצר"}
          </button>
        </form>

        <div className="space-y-6">
          <form onSubmit={addCategory} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-950">קטגוריה חדשה</h2>
            <div className="mt-4 flex gap-3">
              <input required value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="למשל: מוצרי מזווה" className="field flex-1" />
              <button disabled={isSaving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">הוספה</button>
            </div>
          </form>
          <form onSubmit={addBrand} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-950">מותג חדש</h2>
            <div className="mt-4 flex gap-3">
              <input required value={newBrand} onChange={(event) => setNewBrand(event.target.value)} placeholder="למשל: אחווה" className="field flex-1" />
              <button disabled={isSaving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">הוספה</button>
            </div>
          </form>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">המוצרים שלך</h2>
        {products.length === 0 ? (
          <p className="mt-4 text-slate-500">עדיין לא נשמרו מוצרים.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-200 text-slate-500"><tr><th className="px-3 py-3">מוצר</th><th className="px-3 py-3">מותג</th><th className="px-3 py-3">קטגוריה</th><th className="px-3 py-3">אריזה</th></tr></thead>
              <tbody>{products.map((product) => <tr key={product.id} className="border-b border-slate-100"><td className="px-3 py-3 font-medium">{product.name}</td><td className="px-3 py-3">{product.brand_id ? brandName.get(product.brand_id) : "—"}</td><td className="px-3 py-3">{categoryName.get(product.category_id ?? "") ?? "—"}</td><td className="px-3 py-3">{product.package_size ? `${product.package_size} ${product.package_unit ?? ""}` : "—"}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
