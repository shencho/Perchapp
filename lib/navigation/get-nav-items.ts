import {
  Home,
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
  Briefcase,
  Landmark,
  Wallet,
  CreditCard,
  Users,
  Tag,
  RefreshCw,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  labelShort?: string; // Label corto para mobile bottom navbar
  icon: LucideIcon;
  desktopOnly?: boolean;
  drawerOnly?: boolean;
};

export function getNavItems(modo: "personal" | "profesional" | "ambos" | null): NavItem[] {
  const m = modo ?? "personal";

  const main: NavItem[] = [
    { href: "/dashboard",   label: "Inicio",      icon: Home },
    { href: "/movimientos", label: "Movimientos",  labelShort: "Movs.",    icon: ArrowLeftRight },
    { href: "/balances",    label: "Balances",     icon: BarChart3 },
    { href: "/prestamos",   label: "Préstamos",    icon: Landmark, desktopOnly: true },
    { href: "/cash-flow",   label: "Cash Flow",    icon: TrendingUp, desktopOnly: true },
  ];

  if (m === "profesional" || m === "ambos") {
    main.push({ href: "/clientes", label: "Profesional", labelShort: "Profes.", icon: Briefcase });
  }

  const drawer: NavItem[] = [
    { href: "/cuentas",                 label: "Cuentas",                icon: Wallet,    drawerOnly: true },
    { href: "/tarjetas",                label: "Tarjetas",               icon: CreditCard, drawerOnly: true },
    { href: "/personas",                label: "Personas y grupos",      icon: Users,     drawerOnly: true },
    { href: "/categorias",              label: "Categorías",             icon: Tag,       drawerOnly: true },
    { href: "/movimientos-recurrentes", label: "Movimientos recurrentes", icon: RefreshCw, drawerOnly: true },
    { href: "/ajustes",                 label: "Ajustes",                icon: Settings,  drawerOnly: true },
  ];

  return [...main, ...drawer];
}
