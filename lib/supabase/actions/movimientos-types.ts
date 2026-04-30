import { z } from "zod";

export const METODOS = [
  "Efectivo",
  "Transferencia",
  "Billetera virtual",
  "Crédito",
  "Débito automático",
  "Débito",
] as const;

export const TIPOS_MOV      = ["Ingreso", "Egreso", "Transferencia"] as const;
export const AMBITOS        = ["Personal", "Profesional"] as const;
export const CLASIFICACIONES = ["Fijo", "Variable", "Cuotas"] as const;
export const FRECUENCIAS    = ["Corriente", "No corriente"] as const;

export const movimientoSchema = z.object({
  tipo:               z.enum(TIPOS_MOV),
  ambito:             z.enum(AMBITOS).default("Personal"),
  monto:              z.number().positive("El monto debe ser mayor a 0"),
  moneda:             z.enum(["ARS", "USD"]).default("ARS"),
  tipo_cambio:        z.number().positive().nullable().optional(),
  concepto:           z.string().nullable().optional(),
  descripcion:        z.string().nullable().optional(),
  categoria_id:       z.string().uuid().nullable().optional(),
  clasificacion:      z.enum(CLASIFICACIONES).default("Variable"),
  cuotas:             z.number().int().min(1).default(1),
  frecuencia:         z.enum(FRECUENCIAS).default("Corriente"),
  necesidad:          z.number().int().min(1).max(5).nullable().optional(),
  metodo:             z.enum(METODOS).nullable().optional(),
  cuenta_id:          z.string().uuid().nullable().optional(),
  tarjeta_id:         z.string().uuid().nullable().optional(),
  fecha_vencimiento:  z.string().nullable().optional(),
  debita_de:          z.enum(["cuenta", "tarjeta"]).nullable().optional(),
  cuenta_destino_id:  z.string().uuid().nullable().optional(),
  cantidad:           z.number().int().min(1).default(1),
  unitario:           z.number().positive().nullable().optional(),
  observaciones:      z.string().nullable().optional(),
  cliente_id:         z.string().uuid().nullable().optional(),
  servicio_id:        z.string().uuid().nullable().optional(),
  fecha:              z.string().optional(),
});

export type MovimientoInput = z.infer<typeof movimientoSchema>;

export interface MovimientosFiltros {
  mes?: string;
  tipo?: string;
  ambito?: string;
  categoria_id?: string;
  metodo?: string;
  cuenta_id?: string;
  busqueda?: string;
  pagina?: number;
}
