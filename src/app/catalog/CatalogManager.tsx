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
  const [purchaseProductId, setPurchaseProductId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("1");
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

  async function addManualPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(purchasePrice);
    const quantity = Number(purchaseQuantity);

    if (!purchaseProductId || !purchaseDate || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity <= 0) {
      setError("יש לבחור מוצר ולהזין תאריך, מחיר וכמות תקינים.");
      return;
    }

    setIsSaving(true);
    setError("");
    let receiptId: string | null = null;

    try {
      const { supabase, userId } = await getUserId();
      const { data: receipt, error: receiptError } = await supabase
        .from("receipts")
        .insert({
          owner_id: userId,
          purchase_date: purchaseDate,
          total_amount: price * quantity,
          processing_status: "confirmed",
        })
        .select("id")
        .single();

      if (receiptError) throw receiptError;
      receiptId = receipt.id;

      const { error: itemError } = await supabase.from("purchase_items").insert({
        receipt_id: receipt.id,
        product_id: purchaseProductId,
        original_item_name: products.find((product) => product.id === purchaseProductId)?.name ?? "רכישה ידנית",
        quantity,
        unit_price: price,
        original_total_price: price * quantity,
        discount_amount: 0,
        final_price: price * quantity,
        is_promotion: false,
        ocr_confidence: null,
      });

      if (itemError) throw itemError;
      setPurchasePrice("");
      setPurchaseQuantity("1");
      setPurchaseProductId("");
      router.refresh();
    } catch (saveError) {
      if (receiptId) {
        const { supabase } = await getUserId();
        await supabase.from("receipts").delete().eq("id", receiptId);
      }
      setError(saveError instanceof Error ? saveError.message : "שמירת הרכישה נכשלה.");
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

  async function addStarterCatalog() {
    setIsSaving(true);
    setError("");

    try {
      const { supabase, userId } = await getUserId();
      const categoryNames = ["מוצרי מזווה", "מוצרי חלב", "שמנים", "מוצרי ניקיון"];
      const brandNames = ["אחווה", "תנובה", "טרה", "שמן זית הגליל", "סנו"];
      const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
      const brandIds = new Map(brands.map((brand) => [brand.name, brand.id]));

      for (const name of categoryNames) {
        if (categoryIds.has(name)) continue;
        const { data, error: insertError } = await supabase.from("categories").insert({ name, owner_id: userId }).select("id, name").single();
        if (insertError) throw insertError;
        categoryIds.set(data.name, data.id);
      }

      for (const name of brandNames) {
        if (brandIds.has(name)) continue;
        const { data, error: insertError } = await supabase.from("brands").insert({ name, owner_id: userId }).select("id, name").single();
        if (insertError) throw insertError;
        brandIds.set(data.name, data.id);
      }

      const starterProducts = [
        { name: "טחינה אחווה 500 גרם", brand: "אחווה", category: "מוצרי מזווה", size: 500, unit: "g" },
        { name: "חלב תנובה 3% 1 ליטר", brand: "תנובה", category: "מוצרי חלב", size: 1, unit: "l" },
        { name: "גבינה לבנה 5% 250 גרם", brand: "תנובה", category: "מוצרי חלב", size: 250, unit: "g" },
        { name: "קוטג׳ 5% 250 גרם", brand: "תנובה", category: "מוצרי חלב", size: 250, unit: "g" },
        { name: "חלב טרה 3% 1 ליטר", brand: "טרה", category: "מוצרי חלב", size: 1, unit: "l" },
        { name: "שמן זית כתית מעולה 750 מ״ל", brand: "שמן זית הגליל", category: "שמנים", size: 750, unit: "ml" },
        { name: "שמן קנולה 1 ליטר", brand: null, category: "שמנים", size: 1, unit: "l" },
        { name: "נוזל כלים 750 מ״ל", brand: "סנו", category: "מוצרי ניקיון", size: 750, unit: "ml" },
      ];

      for (const product of starterProducts) {
        const { data: existing, error: findError } = await supabase.from("products").select("id").eq("owner_id", userId).eq("name", product.name).maybeSingle();
        if (findError) throw findError;
        if (existing) continue;

        const { error: insertError } = await supabase.from("products").insert({
          owner_id: userId,
          name: product.name,
          brand_id: product.brand ? brandIds.get(product.brand) : null,
          category_id: categoryIds.get(product.category),
          package_size: product.size,
          package_unit: product.unit,
        });
        if (insertError) throw insertError;
      }

      const [productsResult, brandsResult, categoriesResult] = await Promise.all([
        supabase.from("products").select("id, name, barcode, package_size, package_unit, brand_id, category_id").order("name"),
        supabase.from("brands").select("id, name").order("name"),
        supabase.from("categories").select("id, name").order("name"),
      ]);
      if (productsResult.error) throw productsResult.error;
      if (brandsResult.error) throw brandsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      setProducts(productsResult.data);
      setBrands(brandsResult.data);
      setCategories(categoriesResult.data);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "טעינת הקטלוג נכשלה.");
    } finally {
      setIsSaving(false);
    }
  }

  const brandName = new Map(brands.map((brand) => [brand.id, brand.name]));
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="space-y-8">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">הוספת קטלוג התחלתי</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          הוספת קטגוריות, מותגים ומוצרים נפוצים לחשבון שלך כדי שתוכל להתחיל
          להתנסות. פריטים שכבר קיימים לא יוכפלו.
        </p>
        <button
          type="button"
          onClick={addStarterCatalog}
          disabled={isSaving}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isSaving ? "מוסיף..." : "הוספת קטלוג התחלתי"}
        </button>
      </section>

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

      <form onSubmit={addManualPurchase} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-bold text-slate-950">הוספת רכישה ידנית</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          הרכישה תופיע בהיסטוריה ותשפיע על חישובי המחיר, גם ללא חשבונית.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <select required value={purchaseProductId} onChange={(event) => setPurchaseProductId(event.target.value)} className="field">
            <option value="">בחירת מוצר *</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          <input required type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} className="field" />
          <input required type="number" min="0" step="0.01" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} placeholder="מחיר ליחידה *" className="field" />
          <input required type="number" min="0.001" step="0.001" value={purchaseQuantity} onChange={(event) => setPurchaseQuantity(event.target.value)} placeholder="כמות *" className="field" />
        </div>
        <button disabled={isSaving || products.length === 0} className="mt-5 rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-60">
          {isSaving ? "שומר..." : "שמירת רכישה"}
        </button>
        {products.length === 0 && <p className="mt-3 text-sm text-slate-600">יש ליצור מוצר לפני הוספת רכישה.</p>}
      </form>

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
