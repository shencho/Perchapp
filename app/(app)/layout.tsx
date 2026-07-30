import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar } from "@/components/navigation/desktop-sidebar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { PerchitaFAB } from "@/components/navigation/perchita-fab";
import { NotificationsBell } from "@/components/notificaciones/notifications-bell";
import { NotificationsToast } from "@/components/notificaciones/notifications-toast";
import { getNotificaciones } from "@/lib/supabase/actions/notificaciones";

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
    .select("onboarding_completado, asistente_nombre")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarding_completado) {
    redirect("/onboarding");
  }

  const asistenteNombre = profile.asistente_nombre ?? "MANGO AI";

  // Defensivo: si la migración 024 (notificaciones) aún no se corrió, no rompemos
  // toda la app — simplemente no hay notificaciones.
  let notificaciones: Awaited<ReturnType<typeof getNotificaciones>> = [];
  try {
    notificaciones = await getNotificaciones();
  } catch {
    notificaciones = [];
  }

  return (
    <div className="min-h-screen md:flex md:flex-row">
      <DesktopSidebar
        asistenteNombre={asistenteNombre}
        userEmail={user.email}
        notificaciones={notificaciones}
      />
      {/* Campana flotante solo en mobile (desktop la tiene en el sidebar) */}
      <NotificationsBell
        notificaciones={notificaciones}
        className="md:hidden fixed top-3 right-3 z-40 bg-background border border-border shadow-sm"
      />
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-0">{children}</main>
      <MobileBottomNav userEmail={user.email} />
      <PerchitaFAB />
      <NotificationsToast notificaciones={notificaciones} />
      <Toaster />
    </div>
  );
}
