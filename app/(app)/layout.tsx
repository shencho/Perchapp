import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/header";

// Layout protegido: cualquier ruta bajo (app) requiere sesión activa.
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header userEmail={user.email} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
