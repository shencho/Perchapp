import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { DesktopSidebar } from "@/components/navigation/desktop-sidebar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { PerchitaFAB } from "@/components/navigation/perchita-fab";
import { NotificationsBell } from "@/components/notificaciones/notifications-bell";
import { NotificationsToast } from "@/components/notificaciones/notifications-toast";
import { getNotificaciones } from "@/lib/supabase/actions/notificaciones";
import { getAuthUser, getPerfil } from "@/lib/supabase/auth";
import { MangoLogo } from "@/components/ui/mango-logo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth + perfil cacheados: la page que renderiza abajo los reusa sin pagar
  // otra ida a Supabase. Es la ÚNICA espera bloqueante del layout.
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const profile = await getPerfil();
  if (!profile || !profile.onboarding_completado) redirect("/onboarding");

  const asistenteNombre = profile.asistente_nombre ?? "MANGO AI";
  const esAdmin = profile.es_admin ?? false;

  // Las notificaciones NO bloquean el shell: se pasa la promesa y cada consumidor
  // la resuelve dentro de su propio Suspense. La app ya es usable mientras carga.
  const notificacionesPromise = getNotificaciones().catch(() => []);

  return (
    <div className="min-h-screen md:flex md:flex-row">
      <DesktopSidebar
        asistenteNombre={asistenteNombre}
        userEmail={user.email}
        notificacionesPromise={notificacionesPromise}
        esAdmin={esAdmin}
      />
      {/* Barra superior solo en mobile (desktop tiene la campana en el sidebar).
          Sticky + en el flujo → el contenido de la página va debajo, sin superposición. */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between h-12 px-4 border-b border-border bg-background">
        <MangoLogo size={24} showWordmark />
        <Suspense fallback={<div className="h-9 w-9" />}>
          <NotificationsBell notificacionesPromise={notificacionesPromise} />
        </Suspense>
      </div>
      <main className="flex-1 min-w-0 p-4 md:p-6 pb-20 md:pb-0">{children}</main>
      <MobileBottomNav userEmail={user.email} esAdmin={esAdmin} />
      <PerchitaFAB />
      <Suspense fallback={null}>
        <NotificationsToast notificacionesPromise={notificacionesPromise} />
      </Suspense>
      <Toaster />
    </div>
  );
}
