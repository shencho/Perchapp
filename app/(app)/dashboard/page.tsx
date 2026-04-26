import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bienvenido, {user?.email}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">
          El dashboard se construye en la Sesión 6.
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Sesion 1 completada — auth funcionando correctamente.
        </p>
      </div>
    </div>
  );
}
