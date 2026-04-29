import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, asistente_nombre")
    .eq("id", user!.id)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Hola{profile?.nombre ? `, ${profile.nombre}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bienvenido/a a Perchapp.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">
          El dashboard con KPIs y gráficos se construye en la Sesión 6.
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Mientras tanto, configurá tus cuentas, tarjetas y categorías en{" "}
          <Link href="/ajustes" className="text-primary hover:underline underline-offset-4">
            Ajustes
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
