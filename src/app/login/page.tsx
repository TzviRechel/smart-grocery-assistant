import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">עוזר הקניות שלי</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">כניסה למערכת</h1>
        <p className="mt-4 leading-7 text-slate-600">
          נשלח אליך קישור חד-פעמי לאימייל. אין צורך לזכור סיסמה.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
