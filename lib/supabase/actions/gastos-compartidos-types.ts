export type { GastoCompartidoParticipante } from "@/types/supabase";

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
