import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar } from "@/components/navigation/desktop-sidebar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { PerchitaFAB } from "@/components/navigation/perchita-fab";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completado, modo, asistente_nombre")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarding_completado) {
    redirect("/onboarding");
  }

  const asistenteNombre = profile.asistente_nombre ?? "MANGO AI";
  const modo = profile.modo ?? "personal";

  return (
    <div className="min-h-screen md:flex md:flex-row">
      <DesktopSidebar modo={modo} asistenteNombre={asistenteNombre} userEmail={user.email} />
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-0">{children}</main>
      <MobileBottomNav modo={modo} userEmail={user.email} />
      <PerchitaFAB />
      <Toaster />
    </div>
  );
}
