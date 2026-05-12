import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/header";
import { AppHeader } from "@/components/navigation/app-header";
import { DesktopSidebar } from "@/components/navigation/desktop-sidebar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { NavigationDrawer } from "@/components/navigation/navigation-drawer";
import { PerchitaFAB } from "@/components/navigation/perchita-fab";
import { PerchitaBottomSheet } from "@/components/navigation/perchita-bottom-sheet";

// Layout protegido: requiere sesión activa y onboarding completado.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar que el usuario completó el onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completado, modo")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarding_completado) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header userEmail={user.email} modo={profile.modo ?? "personal"} />
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-0">{children}</main>

      {/* Placeholders PASO 4 — todos hidden, sin impacto visual. Contenido real en PASO 5 */}
      <AppHeader />
      <DesktopSidebar />
      <MobileBottomNav />
      <PerchitaFAB />
      <NavigationDrawer />
      <PerchitaBottomSheet />
    </div>
  );
}
