import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/header";

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
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
