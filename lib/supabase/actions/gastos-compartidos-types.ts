export type { GastoCompartidoParticipante, GastoGrupalPagador } from "@/types/supabase";

export interface ParticipanteInput {
  persona_nombre:    string;
  persona_id?:       string | null;
  monto:             number;
  cuenta_destino_id?: string | null;
  modo?:             "fijo" | "a_repartir";
}

export interface MarcarCobradoInput {
  participanteId:   string;
  fecha:            string;
  cuentaDestinoId?: string | null;
  observacion?:     string | null;
  conceptoGasto:    string;
  montoGasto:       number;
  moneda:           string;
}

// ── Splitwise: múltiples pagadores ───────────────────────────────────────────

export interface PagadorFormInput {
  personaId:   string | null  // null = el usuario registrador
  nombre:      string         // display only, no se persiste
  montoPagado: number
}

export interface GastoGrupalPagadorRow {
  id:           string
  persona_id:   string | null
  monto_pagado: number
}
