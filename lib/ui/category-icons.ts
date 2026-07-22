import {
  ShoppingCart,
  Home,
  Users,
  Sparkles,
  HeartPulse,
  Car,
  GraduationCap,
  PawPrint,
  Wine,
  Plane,
  Repeat,
  Dumbbell,
  Landmark,
  TrendingUp,
  HandHeart,
  Wallet,
  Building2,
  Store,
  Percent,
  Trophy,
  Undo2,
  Gift,
  Coins,
  Tag,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapeo NOMBRE de categoría → ícono Lucide (decisión PR3: el repo no tiene
 * picker de emojis ni `categoria.icono` poblado, así que se mapea por nombre).
 * Cubre las categorías semilla de `lib/templates/catalogos.ts`. Fallback: Tag.
 * Solo se usa hoy en el dashboard.
 */
const CATEGORIA_ICONOS: Record<string, LucideIcon> = {
  // Egresos
  alimentos: ShoppingCart,
  hogar: Home,
  familia: Users,
  "cuidado personal": Sparkles,
  salud: HeartPulse,
  transporte: Car,
  educacion: GraduationCap,
  mascotas: PawPrint,
  social: Wine,
  viajes: Plane,
  suscripciones: Repeat,
  deportes: Dumbbell,
  fiscales: Landmark,
  donaciones: HandHeart,
  // Ingresos / mixtas
  inversiones: TrendingUp,
  "ajuste de inversion": TrendingUp,
  haberes: Wallet,
  "renta inmobiliaria": Building2,
  ventas: Store,
  comisiones: Percent,
  premios: Trophy,
  reembolsos: Undo2,
  "regalos recibidos": Gift,
  "otros ingresos": Coins,
};

function normalizar(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Devuelve el ícono Lucide para un nombre de categoría (fallback: Tag). */
export function categoriaNombreToLucide(
  nombre: string | null | undefined,
): LucideIcon {
  if (!nombre) return Tag;
  return CATEGORIA_ICONOS[normalizar(nombre)] ?? Tag;
}
