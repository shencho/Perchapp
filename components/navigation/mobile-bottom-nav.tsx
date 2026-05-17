"use client";

import { MoreHorizontal } from "lucide-react";
import { NavItemComponent } from "@/components/navigation/nav-item";
import { NavigationDrawer } from "@/components/navigation/navigation-drawer";
import { getNavItems } from "@/lib/navigation/get-nav-items";

interface Props {
  modo: "personal" | "profesional" | "ambos" | null;
  userEmail?: string;
}

export function MobileBottomNav({ modo, userEmail }: Props) {
  const allItems = getNavItems(modo);
  const m = modo ?? "personal";

  const inicio = allItems.find((i) => i.href === "/dashboard")!;
  const movimientos = allItems.find((i) => i.href === "/movimientos")!;
  const rightPrimary =
    m === "profesional" || m === "ambos"
      ? allItems.find((i) => i.href === "/clientes")!
      : allItems.find((i) => i.href === "/balances")!;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background z-30">
      <div className="h-full grid grid-cols-5 [&>*]:min-w-0">
        <NavItemComponent item={inicio} variant="bottom" />
        <NavItemComponent item={movimientos} variant="bottom" />

        {/* Center gap — FAB sits above this slot */}
        <div aria-hidden="true" />

        <NavItemComponent item={rightPrimary} variant="bottom" />

        <NavigationDrawer
          trigger={
            <button className="flex flex-col items-center justify-center gap-0.5 h-full w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              <span className="truncate max-w-[68px] leading-none">Más</span>
            </button>
          }
          modo={modo}
          userEmail={userEmail}
        />
      </div>
    </nav>
  );
}
