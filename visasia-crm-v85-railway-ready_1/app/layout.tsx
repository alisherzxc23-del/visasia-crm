import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisAsia CRM",
  description: "CRM для VisAsia",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
