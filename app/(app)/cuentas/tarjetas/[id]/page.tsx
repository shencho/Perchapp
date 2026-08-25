import { redirect } from "next/navigation";

/**
 * El detalle se mudó a /tarjetas/[id]: viviendo bajo /cuentas, el nav iluminaba
 * "Cuentas" al abrir una tarjeta. Queda el redirect por los enlaces viejos.
 */
export default async function TarjetaLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/tarjetas/${id}`);
}
