import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Necroporra 2026 • Plataforma Oficial",
  description: "Competición privada de pronósticos sobre personalidades públicas.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen pb-20 md:pb-12 bg-[#090d16] text-slate-100 antialiased selection:bg-gold-500/20 selection:text-gold-300">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
