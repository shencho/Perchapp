"use server";

import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/types/supabase";

export type ClienteConSaldo = Cliente & {
  saldo_pendiente: number;
  sub_clientes: Cliente[];
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getClientes(incluirArchivados = false): Promise<ClienteConSaldo[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const [clientesRes, registrosRes, pagosRes] = await Promise.all([
    supabase
      .from("clientes")
      .select("*")
      .eq("user_id", user.id)
      .order("nombre"),
    supabase
      .from("registros_trabajo")
      .select("cliente_id, monto")
      .eq("user_id", user.id),
    supabase
      .from("pagos_cliente")
      .select("cliente_id, monto")
      .eq("user_id", user.id),
  ]);

  const clientes = clientesRes.data ?? [];

  // facturado total por cliente
  const facturadoMap: Record<string, number> = {};
  for (const r of registrosRes.data ?? []) {
    if (r.cliente_id) {
      facturadoMap[r.cliente_id] = (facturadoMap[r.cliente_id] ?? 0) + (r.monto ?? 0);
    }
  }

  // cobrado total por cliente
  const cobradoMap: Record<string, number> = {};
  for (const p of pagosRes.data ?? []) {
    if (p.cliente_id) {
      cobradoMap[p.cliente_id] = (cobradoMap[p.cliente_id] ?? 0) + p.monto;
    }
  }

  // Separar padres de sub-clientes
  const padres = clientes.filter((c) => !c.parent_cliente_id);
  const hijos = clientes.filter((c) => !!c.parent_cliente_id);

  const resultado: ClienteConSaldo[] = padres
    .filter((c) => incluirArchivados || !c.archivado)
    .map((c) => ({
      ...c,
      saldo_pendiente: Math.max(0, (facturadoMap[c.id] ?? 0) - (cobradoMap[c.id] ?? 0)),
      sub_clientes: hijos.filter((h) => h.parent_cliente_id === c.id),
    }));

  return resultado;
}

export async function getCliente(id: string): Promise<ClienteConSaldo | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const [clienteRes, subClientesRes, registrosRes, pagosRes] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("clientes").select("*").eq("parent_cliente_id", id).eq("user_id", user.id),
    supabase.from("registros_trabajo").select("monto").eq("cliente_id", id).eq("user_id", user.id),
    supabase.from("pagos_cliente").select("monto").eq("cliente_id", id).eq("user_id", user.id),
  ]);

  if (!clienteRes.data) return null;

  const totalFacturado = (registrosRes.data ?? []).reduce((acc, r) => acc + (r.monto ?? 0), 0);
  const totalCobrado   = (pagosRes.data ?? []).reduce((acc, p) => acc + p.monto, 0);
  const saldo_pendiente = Math.max(0, totalFacturado - totalCobrado);

  return {
    ...clienteRes.data,
    saldo_pendiente,
    sub_clientes: subClientesRes.data ?? [],
  };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

interface SubClienteInput {
  nombre: string;
}

interface CreateClienteInput {
  nombre: string;
  tipo: "Persona" | "Empresa" | "Familia";
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  notas?: string | null;
  sub_clientes?: SubClienteInput[];
}

export async function createCliente(data: CreateClienteInput): Promise<Cliente> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: cliente, error } = await supabase
    .from("clientes")
    .insert({
      user_id:  user.id,
      nombre:   data.nombre,
      tipo:     data.tipo,
      email:    data.email ?? null,
      telefono: data.telefono ?? null,
      whatsapp: data.whatsapp ?? null,
      notas:    data.notas ?? null,
    })
    .select()
    .single();

  if (error || !cliente) throw new Error(error?.message ?? "Error al crear cliente");

  // Insertar sub-clientes si los hay (solo para tipo Familia)
  if (data.sub_clientes && data.sub_clientes.length > 0) {
    const subInserts = data.sub_clientes
      .filter((s) => s.nombre.trim())
      .map((s) => ({
        user_id:          user.id,
        nombre:           s.nombre.trim(),
        tipo:             "Persona" as const,
        parent_cliente_id: cliente.id,
      }));
    if (subInserts.length > 0) {
      await supabase.from("clientes").insert(subInserts);
    }
  }

  return cliente;
}

interface UpdateClienteInput {
  nombre?: string;
  tipo?: "Persona" | "Empresa" | "Familia";
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  notas?: string | null;
}

export async function updateCliente(id: string, data: UpdateClienteInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("clientes")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function archivarCliente(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("clientes")
    .update({ archivado: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function desarchivarCliente(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("clientes")
    .update({ archivado: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
