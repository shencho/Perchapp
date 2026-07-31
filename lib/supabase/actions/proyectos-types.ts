import type { Proyecto, ProyectoMiembro, ProyectoGasto } from "@/types/supabase";
import type { ResultadoBalanceGrupal } from "@/lib/domain/calcularBalanceGrupal";

export interface ProyectoGastoConDetalle extends ProyectoGasto {
  pagadores: { miembro_id: string; monto_pagado: number }[];
  splits: { miembro_id: string; monto_consumido: number; modo: string }[];
}

export interface BalanceMoneda {
  moneda: string;
  resultado: ResultadoBalanceGrupal;
}

export interface ProyectoResumen {
  proyecto: Proyecto;
  miembros: ProyectoMiembro[];
  cantGastos: number;
}

export interface ProyectoDetalle {
  proyecto: Proyecto;
  miembros: ProyectoMiembro[];
  gastos: ProyectoGastoConDetalle[];
  balances: BalanceMoneda[];
  esOwner: boolean;
  miUsuarioId: string;
  /** miembro_id que corresponde al usuario actual (si es miembro-usuario). */
  miMiembroId: string | null;
}

export interface MiembroInput {
  usuarioId?: string | null;
  personaId?: string | null;
  nombre: string;
}

export interface GastoProyectoInput {
  proyectoId: string;
  concepto: string | null;
  montoTotal: number;
  moneda: string;
  fecha: string;
  pagadores: { miembroId: string; montoPagado: number }[];
  splits: { miembroId: string; montoConsumido: number; modo?: "fijo" | "a_repartir" }[];
}
