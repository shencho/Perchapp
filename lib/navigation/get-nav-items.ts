import {
  Home,
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
  Landmark,
  Wallet,
  CreditCard,
  Users,
  Users2,
  Tag,
  RefreshCw,
  Settings,
  ClipboardList,
  Target,
  ChartPie,
  type LucideIcon,
} from "lucide-react";

/**
 * CRITERIO: adelante lo que se CONSULTA seguido; en "Más" lo que se CONFIGURA
 * una vez y casi no se vuelve a tocar.
 *
 *  - bottomNav  → los 4 lugares de la barra mobile (el 5º es el mango central).
 *  - sidebar    → todo lo que no es drawerOnly; el escritorio tiene lugar para más.
 *  - drawerOnly → configuración y pantallas ocasionales.
 *
 * La barra inferior se arma leyendo `bottomNav`, no buscando hrefs a mano:
 * antes tenía 3 rutas hardcodeadas con `!` y renombrar cualquiera la rompía.
 */
export type NavItem = {
  href: string;
  label: string;
  labelShort?: string; // Label corto para mobile bottom navbar
  icon: LucideIcon;
  /** Ocupa uno de los 4 lugares de la barra inferior en mobile. */
  bottomNav?: boolean;
  drawerOnly?: boolean;
  adminOnly?: boolean;  // solo visible si profiles.es_admin
};

export function getNavItems(): NavItem[] {
  // Adelante: se consultan seguido. Los 3 primeros + "Más" arman la barra mobile.
  const main: NavItem[] = [
    { href: "/dashboard",   label: "Inicio",       icon: Home,           bottomNav: true },
    { href: "/movimientos", label: "Movimientos",  labelShort: "Movs.",  icon: ArrowLeftRight, bottomNav: true },
    { href: "/tarjetas",    label: "Tarjetas",     icon: CreditCard,     bottomNav: true },
    { href: "/cuentas",     label: "Cuentas",      icon: Wallet },
    { href: "/cash-flow",   label: "Cash flow",    icon: TrendingUp },
    { href: "/estadisticas", label: "Estadísticas", icon: ChartPie },
    { href: "/balances",    label: "Balances",     icon: BarChart3 },
    { href: "/prestamos",   label: "Préstamos",    icon: Landmark },
  ];

  // En "Más": se configuran una vez.
  const drawer: NavItem[] = [
    { href: "/presupuestos",            label: "Presupuestos",            icon: Target,        drawerOnly: true },
    { href: "/categorias",              label: "Categorías",              icon: Tag,           drawerOnly: true },
    { href: "/movimientos-recurrentes", label: "Movimientos recurrentes", icon: RefreshCw,     drawerOnly: true },
    { href: "/personas",                label: "Personas y grupos",       icon: Users,         drawerOnly: true },
    { href: "/gastos-compartidos",      label: "Compartido",              icon: Users2,        drawerOnly: true },
    { href: "/ajustes",                 label: "Ajustes",                 icon: Settings,      drawerOnly: true },
    { href: "/control",                 label: "Control",                 icon: ClipboardList, drawerOnly: true, adminOnly: true },
  ];

  return [...main, ...drawer];
}
