"use client";

import { MoreHorizontal } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { NavItemComponent } from "@/components/navigation/nav-item";
import { NavigationDrawer } from "@/components/navigation/navigation-drawer";
import { MangoAIButton } from "@/components/navigation/mango-ai-button";
import { MangoLogo } from "@/components/ui/mango-logo";
import { getNavItems } from "@/lib/navigation/get-nav-items";

interface Props {
  asistenteNombre: string;
  userEmail?: string;
}

export function DesktopSidebar({ asistenteNombre, userEmail }: Props) {
  const sidebarItems = getNavItems().filter((item) => !item.drawerOnly);

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-border h-screen sticky top-0 bg-card shrink-0">
      <div className="px-4 py-5">
        <MangoLogo size={28} showWordmark />
      </div>

      <div className="px-2 pb-2">
        <MangoAIButton asistenteNombre={asistenteNombre} />
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {sidebarItems.map((item) => (
          <NavItemComponent key={item.href} item={item} variant="sidebar" />
        ))}
      </nav>

      <Separator />

      <div className="p-2">
        <NavigationDrawer
          trigger={
            <Button variant="ghost" size="sm" className="w-full gap-2 justify-start">
              <MoreHorizontal className="h-4 w-4 shrink-0" />
              Más
            </Button>
          }
          userEmail={userEmail}
        />
      </div>
    </aside>
  );
}
