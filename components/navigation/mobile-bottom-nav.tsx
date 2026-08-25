"use client";

import { MoreHorizontal } from "lucide-react";
import { NavItemComponent } from "@/components/navigation/nav-item";
import { NavigationDrawer } from "@/components/navigation/navigation-drawer";
import { getNavItems } from "@/lib/navigation/get-nav-items";

interface Props {
  userEmail?: string;
  esAdmin?: boolean;
}

export function MobileBottomNav({ userEmail, esAdmin = false }: Props) {
  // Se arma desde el flag: antes buscaba 3 hrefs a mano con `!`, así que
  // renombrar cualquiera de esas rutas rompía la barra en runtime.
  const items = getNavItems().filter((i) => i.bottomNav).slice(0, 3);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-[#eee4d0] bg-background z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="h-full grid grid-cols-5 [&>*]:min-w-0">
        {items.slice(0, 2).map((item) => (
          <NavItemComponent key={item.href} item={item} variant="bottom" />
        ))}

        {/* Hueco central — el mango (PerchitaFAB) se apoya acá */}
        <div aria-hidden="true" />

        {items.slice(2).map((item) => (
          <NavItemComponent key={item.href} item={item} variant="bottom" />
        ))}

        <NavigationDrawer
          trigger={
            <button className="flex flex-col items-center justify-center gap-0.5 h-full w-full text-xs text-muted-foreground hover:text-foreground rounded-lg mx-0.5 transition-[transform,background-color,color] duration-100 active:scale-[0.96] active:bg-primary/10">
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              <span className="truncate max-w-[68px] leading-none">Más</span>
            </button>
          }
          userEmail={userEmail}
          esAdmin={esAdmin}
        />
      </div>
    </nav>
  );
}
