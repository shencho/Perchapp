import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BalancesClient } from "./_components/balances-client";
import type { PersonaBalanceRow } from "./_components/balances-client";
import { DeudasBilateralesSection } from "@/components/balances/deudas-bilaterales-section";
import { getDeudasComoDeudor, getDeudasComoAcreedor } from "@/lib/supabase/actions/deudas";

export default async function BalancesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Deudas bilaterales (usuarios de Perchapp). Defensivo si 026 aún no corrió.
  const debo = await getDeudasComoDeudor().catch(() => []);
  const meDeben = await getDeudasComoAcreedor().catch(() => []);
  const hayBilaterales =
    debo.some((d) => d.estado === "pendiente" || d.estado === "pago_marcado") ||
    meDeben.some((d) => d.estado === "pendiente" || d.estado === "pago_marcado");

  const [perfilRes, cuentasRes, gastosRes] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", user.id).single(),
    supabase.from("cuentas").select("id, nombre").eq("user_id", user.id).eq("archivada", false).order("orden"),
    supabase
      .from("movimientos")
      .select("id, concepto, fecha, monto, moneda")
      .eq("user_id", user.id)
      .eq("es_compartido", true)
      .order("fecha", { ascending: false }),
  ]);

  const nombreUsuario = perfilRes.data?.nombre?.split(" ")[0] ?? "Vos";
  const cuentas = (cuentasRes.data ?? []) as { id: string; nombre: string }[];
  const gastos = gastosRes.data ?? [];
  const gastoIds = gastos.map((g) => g.id);

  if (gastoIds.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <DeudasBilateralesSection debo={debo} meDeben={meDeben} cuentas={cuentas} />
        <BalancesClient
          balances={[]}
          cuentas={cuentas}
          nombreUsuario={nombreUsuario}
          hideEmptyState={hayBilaterales}
        />
      </div>
    );
  }

  const { data: participantesData } = await supabase
    .from("gastos_compartidos_participantes")
    .select("id, movimiento_id, persona_id, persona_nombre, monto, estado")
    .in("movimiento_id", gastoIds)
    .eq("user_id", user.id)
    .not("persona_id", "is", null);

  const participantes = participantesData ?? [];

  // Construir mapa persona → balance consolidado
  const personaMap = new Map<string, PersonaBalanceRow>();

  for (const gasto of gastos) {
    const moneda = gasto.moneda ?? "ARS";
    const partes = participantes.filter((p) => p.movimiento_id === gasto.id);

    for (const part of partes) {
      const key = part.persona_id!;
      if (!personaMap.has(key)) {
        personaMap.set(key, {
          personaId: key,
          nombre: part.persona_nombre,
          pendienteARS: 0,
          pendienteUSD: 0,
          cobradoARS: 0,
          cobradoUSD: 0,
          gastosDetalle: [],
        });
      }
      const entry = personaMap.get(key)!;

      if (part.estado === "pendiente") {
        if (moneda === "ARS") entry.pendienteARS += part.monto;
        else if (moneda === "USD") entry.pendienteUSD += part.monto;
      } else if (part.estado === "cobrado") {
        if (moneda === "ARS") entry.cobradoARS += part.monto;
        else if (moneda === "USD") entry.cobradoUSD += part.monto;
      }

      entry.gastosDetalle.push({
        gastoId:        gasto.id,
        concepto:       gasto.concepto,
        fecha:          gasto.fecha,
        moneda,
        participanteId: part.id,
        estado:         part.estado as "pendiente" | "cobrado",
        monto:          part.monto,
      });
    }
  }

  const balances: PersonaBalanceRow[] = Array.from(personaMap.values()).sort((a, b) => {
    const absA = a.pendienteARS + a.pendienteUSD;
    const absB = b.pendienteARS + b.pendienteUSD;
    return absB - absA;
  });

  return (
    <div className="flex flex-col gap-6">
      <DeudasBilateralesSection debo={debo} meDeben={meDeben} cuentas={cuentas} />
      <BalancesClient balances={balances} cuentas={cuentas} nombreUsuario={nombreUsuario} />
    </div>
  );
}
