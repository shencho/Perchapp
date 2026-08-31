"use client";

import { useEffect, useState, type ReactElement } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavItemComponent } from "@/components/navigation/nav-item";
import { UserSection } from "@/components/navigation/user-section";
import { itemsDrawer } from "@/lib/navigation/get-nav-items";

interface Props {
  trigger: ReactElement;
  userEmail?: string;
  esAdmin?: boolean;
  /** Qué barra lo abre. Define qué items ya están visibles y no hay que repetir. */
  superficie?: "mobile" | "desktop";
}

export function NavigationDrawer({ trigger, userEmail, esAdmin = false, superficie = "desktop" }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Lo que la barra hermana no muestra. En escritorio son sólo las de
  // configuración; en mobile, además, las principales que no entran en los 3
  // lugares de la barra inferior.
  const drawerItems = itemsDrawer(superficie, esAdmin);
  const principales = drawerItems.filter((i) => !i.drawerOnly);
  const configuracion = drawerItems.filter((i) => i.drawerOnly);

  // Cerrar el drawer al navegar (cambia el pathname).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="left" showCloseButton>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {principales.map((item) => (
            <NavItemComponent key={item.href} item={item} variant="drawer" />
          ))}

          {/* Se mantiene el criterio: primero lo que se consulta, después lo
              que se configura. En escritorio no hay principales acá, así que
              el encabezado no aparece. */}
          {principales.length > 0 && configuracion.length > 0 && (
            <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Configuración
            </p>
          )}

          {configuracion.map((item) => (
            <NavItemComponent key={item.href} item={item} variant="drawer" />
          ))}
        </nav>
        <UserSection userEmail={userEmail} />
      </SheetContent>
    </Sheet>
  );
}
