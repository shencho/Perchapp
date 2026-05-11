import type { Profile } from "@/types/supabase";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export function getMainNavItems(profile: Profile): NavItem[] {
  const items: NavItem[] = [
    { label: "Inicio",                  href: "/dashboard",              icon: "Home" },
    { label: "Movimientos",             href: "/movimientos",            icon: "ArrowLeftRight" },
    { label: "Captura",                 href: "/captura",                icon: "Sparkles" },
    { label: "Balances",                href: "/balances",               icon: "Scale" },
    { label: "Préstamos",               href: "/prestamos",              icon: "Landmark" },
    { label: "Cash Flow",               href: "/cash-flow",              icon: "LineChart" },
  ];
  if (profile.modo === "profesional" || profile.modo === "ambos") {
    items.push({ label: "Profesional", href: "/clientes", icon: "Briefcase" });
  }
  return items;
}

export function getDrawerItems(): NavItem[] {
  return [
    { label: "Cuentas",                 href: "/cuentas",                icon: "Wallet" },
    { label: "Tarjetas",                href: "/tarjetas",               icon: "CreditCard" },
    { label: "Personas y grupos",       href: "/personas",               icon: "Users" },
    { label: "Categorías",              href: "/categorias",             icon: "Tags" },
    { label: "Movimientos recurrentes", href: "/movimientos-recurrentes", icon: "Repeat" },
    { label: "Ajustes",                 href: "/ajustes",                icon: "Settings" },
  ];
}
