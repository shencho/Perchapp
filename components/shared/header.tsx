"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userEmail?: string;
  modo?: string;
}

const NAV_BASE = [
  { href: "/dashboard",   label: "Inicio" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/captura",     label: "Captura" },
  { href: "/cuentas",     label: "Cuentas" },
  { href: "/prestamos",   label: "Préstamos" },
];

export function Header({ userEmail, modo }: HeaderProps) {
  const showClientes = modo === "profesional" || modo === "ambos";
  const NAV_LINKS = showClientes
    ? [...NAV_BASE, { href: "/clientes", label: "Clientes" }]
    : NAV_BASE;
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 relative z-40">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-sm">Perchapp</span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden sm:flex items-center gap-1 ml-4">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1">
        {userEmail && (
          <span className="text-xs text-muted-foreground hidden md:block mr-2">
            {userEmail}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/ajustes")}
          className="text-muted-foreground hover:text-foreground"
          title="Ajustes"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-1.5 text-muted-foreground hover:text-foreground hidden sm:flex"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:block">Salir</span>
        </Button>

        {/* Hamburguesa mobile */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden text-muted-foreground"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Menu mobile desplegable */}
      {menuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-card border-b border-border px-4 py-3 flex flex-col gap-1 sm:hidden shadow-lg">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <hr className="border-border my-1" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-surface text-left"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}
