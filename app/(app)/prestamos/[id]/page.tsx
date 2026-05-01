import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrestamo } from "@/lib/supabase/actions/prestamos";
import { getPagosPrestamo } from "@/lib/supabase/actions/prestamos-pagos";
import { getPersonas } from "@/lib/supabase/actions/personas";
import { PrestamoDetalleClient } from "./_components/prestamo-detalle-client";
import type { Cuenta } from "@/types/supabase";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrestamoDetallePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [cuentasResult] = await Promise.all([
    supabase
      .from("cuentas")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivada", false)
      .order("nombre"),
  ]);

  let prestamo;
  let pagos;
  try {
    [prestamo, pagos] = await Promise.all([
      getPrestamo(id),
      getPagosPrestamo(id),
    ]);
  } catch {
    notFound();
  }

  const personas = await getPersonas();
  const cuentas = (cuentasResult.data ?? []) as Cuenta[];

  return (
    <PrestamoDetalleClient
      prestamo={prestamo}
      pagos={pagos}
      cuentas={cuentas}
      personas={personas}
    />
  );
}
