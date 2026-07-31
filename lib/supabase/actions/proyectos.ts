"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularBalanceGrupal } from "@/lib/domain/calcularBalanceGrupal";
import type { PagadorInput, ParticipanteConsumoInput } from "@/lib/domain/calcularBalanceGrupal";
import type { Proyecto, ProyectoMiembro } from "@/types/supabase";
import type {
  ProyectoResumen,
  ProyectoDetalle,
  ProyectoGastoConDetalle,
  BalanceMoneda,
  MiembroInput,
  GastoProyectoInput,
} from "./proyectos-types";

async function getAuthed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

function revalidar(id?: string) {
  revalidatePath("/gastos-compartidos");
  if (id) revalidatePath(`/proyectos/${id}`);
  revalidatePath("/", "layout");
}

// ── Balance (reusa el dominio puro, una corrida por moneda) ────────────────────
function computeBalances(
  miembros: ProyectoMiembro[],
  gastos: ProyectoGastoConDetalle[],
): BalanceMoneda[] {
  const nombrePorMiembro = new Map(miembros.map((m) => [m.id, m.nombre]));
  const monedas = Array.from(new Set(gastos.map((g) => g.moneda)));

  return monedas.map((moneda) => {
    const pagMap = new Map<string, number>();
    const conMap = new Map<string, number>();

    for (const g of gastos.filter((x) => x.moneda === moneda)) {
      for (const p of g.pagadores) {
        pagMap.set(p.miembro_id, (pagMap.get(p.miembro_id) ?? 0) + p.monto_pagado);
      }
      for (const s of g.splits) {
        conMap.set(s.miembro_id, (conMap.get(s.miembro_id) ?? 0) + s.monto_consumido);
      }
    }

    const pagadores: PagadorInput[] = Array.from(pagMap.entries()).map(([id, monto]) => ({
      personaId: id,
      nombre: nombrePorMiembro.get(id) ?? "Miembro",
      montoPagado: monto,
    }));
    const participantes: ParticipanteConsumoInput[] = Array.from(conMap.entries()).map(([id, monto]) => ({
      personaId: id,
      nombre: nombrePorMiembro.get(id) ?? "Miembro",
      montoConsumido: monto,
    }));

    return { moneda, resultado: calcularBalanceGrupal(pagadores, participantes, 0, "Vos") };
  });
}

// ── Queries ────────────────────────────────────────────────────────────────────
export async function getProyectos(): Promise<ProyectoResumen[]> {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase
    .from("proyectos")
    .select("*, proyecto_miembros(*), proyecto_gastos(id)")
    .eq("archivado", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => {
    const { proyecto_miembros, proyecto_gastos, ...proyecto } = p as typeof p & {
      proyecto_miembros: ProyectoMiembro[];
      proyecto_gastos: { id: string }[];
    };
    return {
      proyecto: proyecto as Proyecto,
      miembros: proyecto_miembros ?? [],
      cantGastos: (proyecto_gastos ?? []).length,
    };
  });
}

export async function getProyecto(id: string): Promise<ProyectoDetalle | null> {
  const { supabase, userId } = await getAuthed();

  const { data: proyecto, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !proyecto) return null;

  const [{ data: miembros }, { data: gastosRaw }] = await Promise.all([
    supabase.from("proyecto_miembros").select("*").eq("proyecto_id", id).order("created_at"),
    supabase
      .from("proyecto_gastos")
      .select("*, proyecto_gasto_pagadores(miembro_id, monto_pagado), proyecto_gasto_splits(miembro_id, monto_consumido, modo)")
      .eq("proyecto_id", id)
      .order("fecha", { ascending: false }),
  ]);

  const gastos: ProyectoGastoConDetalle[] = (gastosRaw ?? []).map((g) => {
    const { proyecto_gasto_pagadores, proyecto_gasto_splits, ...rest } = g as typeof g & {
      proyecto_gasto_pagadores: { miembro_id: string; monto_pagado: number }[];
      proyecto_gasto_splits: { miembro_id: string; monto_consumido: number; modo: string }[];
    };
    return {
      ...(rest as ProyectoGastoConDetalle),
      pagadores: proyecto_gasto_pagadores ?? [],
      splits: proyecto_gasto_splits ?? [],
    };
  });

  const miembrosList = (miembros ?? []) as ProyectoMiembro[];
  const miMiembro = miembrosList.find((m) => m.usuario_id === userId);

  return {
    proyecto: proyecto as Proyecto,
    miembros: miembrosList,
    gastos,
    balances: computeBalances(miembrosList, gastos),
    esOwner: proyecto.created_by === userId,
    miUsuarioId: userId,
    miMiembroId: miMiembro?.id ?? null,
  };
}

// ── Mutations: proyecto ──────────────────────────────────────────────────────
export async function createProyecto(input: {
  nombre: string;
  tipo?: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  monedaDefault?: string;
  miembros?: MiembroInput[];
  grupoOrigenId?: string | null;
}): Promise<{ id: string }> {
  const { supabase, userId } = await getAuthed();

  const { data: perfil } = await supabase.from("profiles").select("nombre").eq("id", userId).single();
  const miNombre = perfil?.nombre?.split(" ")[0] ?? "Vos";

  const { data: proyecto, error } = await supabase
    .from("proyectos")
    .insert({
      created_by: userId,
      nombre: input.nombre.trim(),
      tipo: input.tipo ?? "grupo",
      fecha_inicio: input.fechaInicio ?? null,
      fecha_fin: input.fechaFin ?? null,
      moneda_default: input.monedaDefault ?? "ARS",
      grupo_origen_id: input.grupoOrigenId ?? null,
    })
    .select("id")
    .single();
  if (error || !proyecto) throw new Error(error?.message ?? "Error al crear proyecto");

  // El creador es miembro-owner
  const miembrosRows = [
    { proyecto_id: proyecto.id, usuario_id: userId, nombre: miNombre, rol: "owner" },
    ...(input.miembros ?? []).map((m) => ({
      proyecto_id: proyecto.id,
      usuario_id: m.usuarioId ?? null,
      persona_id: m.personaId ?? null,
      nombre: m.nombre,
      rol: "miembro",
    })),
  ];
  const { error: mErr } = await supabase.from("proyecto_miembros").insert(miembrosRows);
  if (mErr) throw new Error(mErr.message);

  revalidar(proyecto.id);
  return { id: proyecto.id };
}

export async function updateProyecto(
  id: string,
  input: { nombre?: string; tipo?: string; fechaInicio?: string | null; fechaFin?: string | null },
): Promise<void> {
  const { supabase } = await getAuthed();
  const { error } = await supabase
    .from("proyectos")
    .update({
      ...(input.nombre !== undefined ? { nombre: input.nombre.trim() } : {}),
      ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
      ...(input.fechaInicio !== undefined ? { fecha_inicio: input.fechaInicio } : {}),
      ...(input.fechaFin !== undefined ? { fecha_fin: input.fechaFin } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(id);
}

export async function archivarProyecto(id: string, archivado: boolean): Promise<void> {
  const { supabase } = await getAuthed();
  const { error } = await supabase.from("proyectos").update({ archivado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(id);
}

export async function deleteProyecto(id: string): Promise<void> {
  const { supabase } = await getAuthed();
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function crearProyectoDesdeGrupo(
  grupoId: string,
  input: { nombre: string; tipo?: string },
): Promise<{ id: string }> {
  const { supabase } = await getAuthed();

  const { data: miembrosRaw } = await supabase
    .from("grupo_miembros")
    .select("personas(id, nombre, usuario_vinculado_id)")
    .eq("grupo_id", grupoId);

  type PersonaJoin = { id: string; nombre: string; usuario_vinculado_id: string | null };
  const miembros: MiembroInput[] = (miembrosRaw ?? [])
    .map((m) => {
      const per = (m as unknown as { personas: PersonaJoin | PersonaJoin[] | null }).personas;
      return Array.isArray(per) ? (per[0] ?? null) : per;
    })
    .filter((p): p is PersonaJoin => p !== null)
    .map((p) => ({
      usuarioId: p.usuario_vinculado_id,
      personaId: p.usuario_vinculado_id ? null : p.id,
      nombre: p.nombre,
    }));

  return createProyecto({
    nombre: input.nombre,
    tipo: input.tipo ?? "grupo",
    miembros,
    grupoOrigenId: grupoId,
  });
}

// ── Mutations: miembros ──────────────────────────────────────────────────────
export async function addMiembro(proyectoId: string, input: MiembroInput): Promise<void> {
  const { supabase } = await getAuthed();
  const { error } = await supabase.from("proyecto_miembros").insert({
    proyecto_id: proyectoId,
    usuario_id: input.usuarioId ?? null,
    persona_id: input.personaId ?? null,
    nombre: input.nombre,
    rol: "miembro",
  });
  if (error) throw new Error(error.message);
  revalidar(proyectoId);
}

export async function removeMiembro(miembroId: string, proyectoId: string): Promise<void> {
  const { supabase } = await getAuthed();
  const { error } = await supabase.from("proyecto_miembros").delete().eq("id", miembroId);
  if (error) throw new Error(error.message);
  revalidar(proyectoId);
}

// ── Mutations: gastos ────────────────────────────────────────────────────────
export async function addProyectoGasto(input: GastoProyectoInput): Promise<{ id: string }> {
  const { supabase, userId } = await getAuthed();

  const { data: gasto, error } = await supabase
    .from("proyecto_gastos")
    .insert({
      proyecto_id: input.proyectoId,
      creado_por: userId,
      concepto: input.concepto,
      monto_total: input.montoTotal,
      moneda: input.moneda,
      fecha: input.fecha,
    })
    .select("id")
    .single();
  if (error || !gasto) throw new Error(error?.message ?? "Error al crear gasto");

  if (input.pagadores.length > 0) {
    const { error: pErr } = await supabase.from("proyecto_gasto_pagadores").insert(
      input.pagadores.map((p) => ({ gasto_id: gasto.id, miembro_id: p.miembroId, monto_pagado: p.montoPagado })),
    );
    if (pErr) throw new Error(pErr.message);
  }
  if (input.splits.length > 0) {
    const { error: sErr } = await supabase.from("proyecto_gasto_splits").insert(
      input.splits.map((s) => ({
        gasto_id: gasto.id,
        miembro_id: s.miembroId,
        monto_consumido: s.montoConsumido,
        modo: s.modo ?? "a_repartir",
      })),
    );
    if (sErr) throw new Error(sErr.message);
  }

  revalidar(input.proyectoId);
  return { id: gasto.id };
}

export async function deleteProyectoGasto(gastoId: string, proyectoId: string): Promise<void> {
  const { supabase } = await getAuthed();
  const { error } = await supabase.from("proyecto_gastos").delete().eq("id", gastoId);
  if (error) throw new Error(error.message);
  revalidar(proyectoId);
}

// ── Settlement: materializa las transferencias mínimas como deudas bilaterales ──
export async function saldarProyecto(proyectoId: string, moneda: string): Promise<{ creadas: number }> {
  const { supabase } = await getAuthed();
  const detalle = await getProyecto(proyectoId);
  if (!detalle) throw new Error("Proyecto no encontrado");

  const balance = detalle.balances.find((b) => b.moneda === moneda);
  if (!balance) return { creadas: 0 };

  const usuarioPorMiembro = new Map(detalle.miembros.map((m) => [m.id, m.usuario_id]));
  const concepto = `Saldo de ${detalle.proyecto.nombre}`;
  let creadas = 0;

  for (const t of balance.resultado.transferencias) {
    const deudorUsuario = t.deudorId ? usuarioPorMiembro.get(t.deudorId) : null;
    const acreedorUsuario = t.acreedorId ? usuarioPorMiembro.get(t.acreedorId) : null;
    if (!deudorUsuario || !acreedorUsuario) continue; // alguno no es usuario conectado

    const { data, error } = await supabase.rpc("crear_deuda_proyecto", {
      p_proyecto_id: proyectoId,
      p_deudor_id: deudorUsuario,
      p_acreedor_id: acreedorUsuario,
      p_monto: t.monto,
      p_moneda: moneda,
      p_concepto: concepto,
    });
    if (error) throw new Error(error.message);
    if (data) creadas += 1;
  }

  revalidar(proyectoId);
  return { creadas };
}
