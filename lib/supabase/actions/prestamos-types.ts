import { z } from "zod";

export const prestamoSchema = z.object({
  tipo: z.enum(["otorgado", "recibido", "bancario"]),
  persona_id: z.string().uuid().nullable().optional(),
  institucion_nombre: z.string().max(200).nullable().optional(),
  monto_inicial: z.number().positive(),
  moneda: z.enum(["ARS", "USD"]).default("ARS"),
  fecha_inicio: z.string(),
  fecha_vencimiento: z.string().nullable().optional(),
  cantidad_cuotas: z.number().int().positive().nullable().optional(),
  tasa_interes_anual: z.number().positive().nullable().optional(),
  cuota_mensual: z.number().positive().nullable().optional(),
  dia_vencimiento_cuota: z.number().int().min(1).max(31).nullable().optional(),
  estado: z.enum(["activo", "cancelado"]).default("activo"),
  notas: z.string().nullable().optional(),
});

export type PrestamoInput = z.infer<typeof prestamoSchema>;

export const registrarPagoPrestamoSchema = z.object({
  prestamoId: z.string().uuid(),
  fecha: z.string(),
  monto: z.number().positive(),
  cuentaId: z.string().uuid().nullable().optional(),
  cuotaNumero: z.number().int().positive().nullable().optional(),
  notas: z.string().nullable().optional(),
});

export type RegistrarPagoPrestamoInput = z.infer<typeof registrarPagoPrestamoSchema>;

export const editarPagoPrestamoSchema = z.object({
  fecha: z.string().optional(),
  monto: z.number().positive().optional(),
  cuentaId: z.string().uuid().nullable().optional(),
  notas: z.string().nullable().optional(),
});

export type EditarPagoPrestamoInput = z.infer<typeof editarPagoPrestamoSchema>;
