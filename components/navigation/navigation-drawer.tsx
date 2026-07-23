"use client";

import { useEffect, useState, type ReactElement } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavItemComponent } from "@/components/navigation/nav-item";
import { UserSection } from "@/components/navigation/user-section";
import { getNavItems } from "@/lib/navigation/get-nav-items";

interface Props {
  trigger: ReactElement;
  userEmail?: string;
}

export function NavigationDrawer({ trigger, userEmail }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const drawerItems = getNavItems().filter(
    (item) => item.drawerOnly || item.desktopOnly
  );

  // Cerrar el drawer al navegar (cambia el pathname).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="left" showCloseButton>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {drawerItems.map((item) => (
            <NavItemComponent key={item.href} item={item} variant="drawer" />
          ))}
        </nav>
        <UserSection userEmail={userEmail} />
      </SheetContent>
    </Sheet>
  );
}
