"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";

interface HeaderProps {
  userEmail?: string;
}

export function Header({ userEmail }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">P</span>
        </div>
        <span className="font-semibold text-sm">Perchapp</span>
      </div>

      <div className="flex items-center gap-1">
        {userEmail && (
          <span className="text-xs text-muted-foreground hidden sm:block mr-2">
            {userEmail}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/ajustes")}
          className="text-muted-foreground hover:text-foreground"
          title="Ajustes"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">Salir</span>
        </Button>
      </div>
    </header>
  );
}
