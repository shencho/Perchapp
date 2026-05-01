import { getPrestamos } from "@/lib/supabase/actions/prestamos";
import { getPersonas } from "@/lib/supabase/actions/personas";
import { PrestamosClient } from "./_components/prestamos-client";

export default async function PrestamosPage() {
  const [prestamos, personas] = await Promise.all([getPrestamos(), getPersonas()]);
  return <PrestamosClient prestamos={prestamos} personas={personas} />;
}
