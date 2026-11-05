const navigation = [
  { label: "ראשי", href: "/" },
  { label: "העלאת חשבונית", href: "/receipts/new" },
  { label: "חיפוש מוצרים", href: "/products" },
  { label: "היסטוריית קניות", href: "/history" },
  { label: "מוצרים וקטגוריות", href: "/catalog" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">עוזר הקניות שלי</p>
            <h1 className="text-2xl font-bold text-slate-950">שלום, מתחילים לאסוף תובנות</h1>
          </div>
          <nav aria-label="ניווט ראשי" className="flex flex-wrap gap-2 text-sm">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10">
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
          <p className="mb-3 text-sm font-medium text-slate-500">שלב ראשון</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">המערכת מוכנה לחיבור לנתונים שלך</h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            כאן יופיעו נתוני הקניות האמיתיים שלך לאחר שנחבר את Supabase ונבנה את
            מודול המוצרים. כרגע לא מוצגים נתוני דמה.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {["חיבור למסד הנתונים", "ניהול מוצרים וקטגוריות", "העלאת חשבונית"].map((item) => (
              <div key={item} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                <span className="mb-2 block h-2 w-2 rounded-full bg-amber-400" />
                {item}
                <span className="mt-1 block text-xs text-slate-400">טרם הוגדר</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
