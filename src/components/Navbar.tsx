"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, User, ArrowLeftRight, Activity, BookOpen, Settings } from "lucide-react";
import clsx from "clsx";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Clasificación", icon: Trophy },
    { href: "/roster", label: "Mi Plantilla", icon: User },
    { href: "/duel", label: "Cara a Cara", icon: ArrowLeftRight },
    { href: "/what-if", label: "Simulador", icon: Activity },
    { href: "/rules", label: "Reglamento", icon: BookOpen },
    { href: "/admin", label: "Ajustes", icon: Settings },
  ];

  return (
    <>
      {/* Header Desktop y Móvil */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center space-x-2.5">
            <span className="text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              Necroporra
              <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.2 text-[10px] font-medium text-zinc-400">
                2026
              </span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
                    isActive
                      ? "bg-zinc-800/80 text-zinc-100 font-medium"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  )}
                >
                  <Icon className={clsx("h-3.5 w-3.5", isActive ? "text-zinc-100" : "text-zinc-500")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Acceso directo en móvil */}
          <div className="flex md:hidden items-center">
            <Link
              href="/roster"
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Mi Plantilla
            </Link>
          </div>
        </div>
      </header>

      {/* Bottom Nav Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg md:hidden">
        <div className="grid grid-cols-5 h-14 max-w-md mx-auto items-center px-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center justify-center py-1 transition-colors relative",
                  isActive ? "text-zinc-100 font-medium" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Icon className={clsx("h-4 w-4 mb-0.5", isActive ? "text-zinc-100" : "text-zinc-500")} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
