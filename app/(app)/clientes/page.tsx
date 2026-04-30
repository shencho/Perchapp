import { getClientes } from "@/lib/supabase/actions/clientes";
import { ClientesClient } from "./_components/clientes-client";

export default async function ClientesPage() {
  const clientes = await getClientes(true); // incluye archivados para toggle
  return <ClientesClient clientes={clientes} />;
}
