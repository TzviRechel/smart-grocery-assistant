import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "עוזר הקניות שלי",
  description: "ניהול ומעקב אחר קניות ומחירי מוצרי סופר",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
