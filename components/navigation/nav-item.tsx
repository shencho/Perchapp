"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation/get-nav-items";

type Variant = "sidebar" | "bottom" | "drawer";

interface Props {
  item: NavItem;
  variant: Variant;
  onClick?: () => void;
}

/**
 * Ícono del item: mientras la navegación está en vuelo lo reemplaza un spinner.
 * useLinkStatus se actualiza APENAS se toca el link, sin esperar al servidor
 * (usePathname recién cambia cuando el render llega, y por eso el tap se sentía
 * muerto durante segundos).
 */
function NavIcon({
  Icon,
  className,
}: {
  Icon: NavItem["icon"];
  className: string;
}) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className={cn(className, "animate-spin")} />
  ) : (
    <Icon className={className} />
  );
}

export function NavItemComponent({ item, variant, onClick }: Props) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  // active: sí se dispara en touch (hover: nunca lo hace en pantalla táctil).
  const press = "transition-[transform,background-color,color] duration-100 active:scale-[0.96]";

  if (variant === "sidebar") {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
          press,
          "active:bg-primary/15",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-surface"
        )}
      >
        <NavIcon Icon={Icon} className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  if (variant === "drawer") {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm",
          press,
          "active:bg-primary/15",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-surface"
        )}
      >
        <NavIcon Icon={Icon} className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  // variant === "bottom" — el activo pasa a tener fondo + barra superior,
  // no sólo color (antes era indistinguible de un tap sin efecto).
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 h-full w-full text-xs rounded-lg mx-0.5",
        press,
        "active:bg-primary/10",
        isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden />
      )}
      <NavIcon Icon={Icon} className="h-5 w-5 shrink-0" />
      <span className="truncate max-w-[68px] leading-none">{item.labelShort ?? item.label}</span>
    </Link>
  );
}
