import { notFound } from "next/navigation";
import { getCliente } from "@/lib/supabase/actions/clientes";
import { getServicios } from "@/lib/supabase/actions/servicios";
import { createClient } from "@/lib/supabase/server";
import { ClienteDetalleClient } from "./_components/cliente-detalle-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetallePage({ params }: Props) {
  const { id } = await params;

  const [cliente, servicios] = await Promise.all([
    getCliente(id),
    getServicios(id),
  ]);

  if (!cliente) notFound();

  // Cargar cuentas para el modal de pagos
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: cuentas } = await supabase
    .from("cuentas")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archivada", false)
    .order("nombre");

  return (
    <ClienteDetalleClient
      cliente={cliente}
      serviciosIniciales={servicios}
      cuentas={cuentas ?? []}
    />
  );
}
