"use client";

import type { ReactElement } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavItemComponent } from "@/components/navigation/nav-item";
import { UserSection } from "@/components/navigation/user-section";
import { getNavItems } from "@/lib/navigation/get-nav-items";

interface Props {
  trigger: ReactElement;
  modo: "personal" | "profesional" | "ambos" | null;
  userEmail?: string;
}

export function NavigationDrawer({ trigger, modo, userEmail }: Props) {
  const m = modo ?? "personal";
  const drawerItems = getNavItems(modo).filter(
    (item) => item.drawerOnly ||
    item.desktopOnly ||
    ((m === "profesional" || m === "ambos") && item.href === "/balances")
  );

  return (
    <Sheet>
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
