"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(`לא ניתן לשלוח קישור התחברות: ${error.message}`);
        return;
      }

      setMessage("קישור התחברות נשלח לכתובת שהזנת. אפשר לבדוק את תיבת הדואר.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "אירעה שגיאה לא צפויה.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <label className="block text-sm font-medium text-slate-700" htmlFor="email">
        כתובת אימייל
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-left outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        dir="ltr"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "שולח..." : "שליחת קישור התחברות"}
      </button>
      {message && (
        <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          {message}
        </p>
      )}
    </form>
  );
}
