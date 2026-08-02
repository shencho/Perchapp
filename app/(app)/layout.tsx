import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar } from "@/components/navigation/desktop-sidebar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { PerchitaFAB } from "@/components/navigation/perchita-fab";
import { NotificationsBell } from "@/components/notificaciones/notifications-bell";
import { NotificationsToast } from "@/components/notificaciones/notifications-toast";
import { getNotificaciones } from "@/lib/supabase/actions/notificaciones";
import { MangoLogo } from "@/components/ui/mango-logo";

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

  // Defensivo: es_admin en query aparte porque la columna la crea la migración 028;
  // si aún no corrió, no rompemos el gate de toda la app (solo no hay /control).
  let esAdmin = false;
  try {
    const { data: adminRow } = await supabase
      .from("profiles").select("es_admin").eq("id", user.id).single();
    esAdmin = adminRow?.es_admin ?? false;
  } catch {
    esAdmin = false;
  }

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
        esAdmin={esAdmin}
      />
      {/* Barra superior solo en mobile (desktop tiene la campana en el sidebar).
          Sticky + en el flujo → el contenido de la página va debajo, sin superposición. */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between h-12 px-4 border-b border-border bg-background">
        <MangoLogo size={24} showWordmark />
        <NotificationsBell notificaciones={notificaciones} />
      </div>
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-0">{children}</main>
      <MobileBottomNav userEmail={user.email} esAdmin={esAdmin} />
      <PerchitaFAB />
      <NotificationsToast notificaciones={notificaciones} />
      <Toaster />
    </div>
  );
}
