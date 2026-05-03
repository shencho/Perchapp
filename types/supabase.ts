// Tipos generados manualmente desde el schema de Perchapp.
// Reemplazar con: npx supabase gen types typescript --project-id voeyfiwlmhsdqdajwgrw > types/supabase.ts
// (requiere: npx supabase login)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nombre: string | null
          profesion: string | null
          modo: "personal" | "profesional" | "ambos" | null
          asistente_nombre: string | null
          onboarding_completado: boolean
          vto_day_default: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre?: string | null
          profesion?: string | null
          modo?: "personal" | "profesional" | "ambos" | null
          asistente_nombre?: string | null
          onboarding_completado?: boolean
          vto_day_default?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string | null
          profesion?: string | null
          modo?: "personal" | "profesional" | "ambos" | null
          asistente_nombre?: string | null
          onboarding_completado?: boolean
          vto_day_default?: number
          created_at?: string
          updated_at?: string
        }
      }
      cuentas: {
        Row: {
          id: string
          user_id: string
          nombre: string
          tipo: "Banco" | "Billetera virtual" | "Efectivo" | "Inversión"
          saldo: number
          moneda: string
          orden: number
          archivada: boolean
          inv_subtipo: "plazo_fijo" | "cripto" | "fci" | "acciones" | "usd_fisico" | "balanz" | "otros" | null
          inv_fecha_vencimiento: string | null
          inv_notas: string | null
          inv_tasa_anual: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          tipo: "Banco" | "Billetera virtual" | "Efectivo" | "Inversión"
          saldo?: number
          moneda?: string
          orden?: number
          archivada?: boolean
          inv_subtipo?: "plazo_fijo" | "cripto" | "fci" | "acciones" | "usd_fisico" | "balanz" | "otros" | null
          inv_fecha_vencimiento?: string | null
          inv_notas?: string | null
          inv_tasa_anual?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nombre?: string
          tipo?: "Banco" | "Billetera virtual" | "Efectivo" | "Inversión"
          saldo?: number
          moneda?: string
          orden?: number
          archivada?: boolean
          inv_subtipo?: "plazo_fijo" | "cripto" | "fci" | "acciones" | "usd_fisico" | "balanz" | "otros" | null
          inv_fecha_vencimiento?: string | null
          inv_notas?: string | null
          inv_tasa_anual?: number | null
          created_at?: string
        }
      }
      tarjetas: {
        Row: {
          id: string
          user_id: string
          cuenta_id: string | null
          nombre: string
          tipo: "Crédito" | "Débito" | null
          banco_emisor: string | null
          ultimos_cuatro: string | null
          limite: number | null
          limite_ars: number | null
          limite_usd: number | null
          cierre_dia: number | null
          vencimiento_dia: number | null
          cuenta_pago_default: string | null
          archivada: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cuenta_id?: string | null
          nombre: string
          tipo?: "Crédito" | "Débito" | null
          banco_emisor?: string | null
          ultimos_cuatro?: string | null
          limite?: number | null
          limite_ars?: number | null
          limite_usd?: number | null
          cierre_dia?: number | null
          vencimiento_dia?: number | null
          cuenta_pago_default?: string | null
          archivada?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cuenta_id?: string | null
          nombre?: string
          tipo?: "Crédito" | "Débito" | null
          banco_emisor?: string | null
          ultimos_cuatro?: string | null
          limite?: number | null
          limite_ars?: number | null
          limite_usd?: number | null
          cierre_dia?: number | null
          vencimiento_dia?: number | null
          cuenta_pago_default?: string | null
          archivada?: boolean
          created_at?: string
        }
      }
      categorias: {
        Row: {
          id: string
          user_id: string
          nombre: string
          tipo: "Ingreso" | "Egreso" | "Ambos"
          parent_id: string | null
          color: string | null
          icono: string | null
          orden: number
          archivada: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          tipo: "Ingreso" | "Egreso" | "Ambos"
          parent_id?: string | null
          color?: string | null
          icono?: string | null
          orden?: number
          archivada?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nombre?: string
          tipo?: "Ingreso" | "Egreso" | "Ambos"
          parent_id?: string | null
          color?: string | null
          icono?: string | null
          orden?: number
          archivada?: boolean
          created_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          user_id: string
          nombre: string
          tipo: "Persona" | "Empresa" | "Familia"
          parent_cliente_id: string | null
          email: string | null
          telefono: string | null
          whatsapp: string | null
          notas: string | null
          archivado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          tipo?: "Persona" | "Empresa" | "Familia"
          parent_cliente_id?: string | null
          email?: string | null
          telefono?: string | null
          whatsapp?: string | null
          notas?: string | null
          archivado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nombre?: string
          tipo?: "Persona" | "Empresa" | "Familia"
          parent_cliente_id?: string | null
          email?: string | null
          telefono?: string | null
          whatsapp?: string | null
          notas?: string | null
          archivado?: boolean
          created_at?: string
        }
      }
      servicios_cliente: {
        Row: {
          id: string
          user_id: string
          cliente_id: string
          nombre: string
          descripcion: string | null
          modalidad: "sesion" | "hora" | "abono" | "proyecto" | "comision"
          tarifa_actual: number | null
          tarifa_moneda: string
          ciclo_facturacion: "mensual" | "quincenal" | "al_cierre" | "por_hito" | "inmediato"
          dia_cierre_ciclo: number | null
          tope_unidades_periodo: number | null
          tarifa_unidad_extra: number | null
          proyecto_total: number | null
          proyecto_estado: "activo" | "finalizado" | "pausado"
          notas: string | null
          archivado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cliente_id: string
          nombre: string
          descripcion?: string | null
          modalidad: "sesion" | "hora" | "abono" | "proyecto" | "comision"
          tarifa_actual?: number | null
          tarifa_moneda?: string
          ciclo_facturacion?: "mensual" | "quincenal" | "al_cierre" | "por_hito" | "inmediato"
          dia_cierre_ciclo?: number | null
          tope_unidades_periodo?: number | null
          tarifa_unidad_extra?: number | null
          proyecto_total?: number | null
          proyecto_estado?: "activo" | "finalizado" | "pausado"
          notas?: string | null
          archivado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cliente_id?: string
          nombre?: string
          descripcion?: string | null
          modalidad?: "sesion" | "hora" | "abono" | "proyecto" | "comision"
          tarifa_actual?: number | null
          tarifa_moneda?: string
          ciclo_facturacion?: "mensual" | "quincenal" | "al_cierre" | "por_hito" | "inmediato"
          dia_cierre_ciclo?: number | null
          tope_unidades_periodo?: number | null
          tarifa_unidad_extra?: number | null
          proyecto_total?: number | null
          proyecto_estado?: "activo" | "finalizado" | "pausado"
          notas?: string | null
          archivado?: boolean
          created_at?: string
        }
      }
      tarifas_historial: {
        Row: {
          id: string
          user_id: string
          servicio_id: string
          tarifa: number
          moneda: string
          vigente_desde: string
          vigente_hasta: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          servicio_id: string
          tarifa: number
          moneda?: string
          vigente_desde?: string
          vigente_hasta?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          servicio_id?: string
          tarifa?: number
          moneda?: string
          vigente_desde?: string
          vigente_hasta?: string | null
          created_at?: string
        }
      }
      registros_trabajo: {
        Row: {
          id: string
          user_id: string
          cliente_id: string | null
          servicio_id: string | null
          tipo: "sesion" | "hora" | "hito" | "comision" | null
          fecha: string
          cantidad: number
          tarifa_aplicada: number | null
          monto: number | null
          monto_override: boolean
          facturado: boolean
          pago_id: string | null
          duracion_minutos: number | null
          origen: "manual" | "voz" | "google_calendar" | "api"
          origen_ref: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cliente_id?: string | null
          servicio_id?: string | null
          tipo?: "sesion" | "hora" | "hito" | "comision" | null
          fecha?: string
          cantidad?: number
          tarifa_aplicada?: number | null
          monto?: number | null
          monto_override?: boolean
          facturado?: boolean
          pago_id?: string | null
          duracion_minutos?: number | null
          origen?: "manual" | "voz" | "google_calendar" | "api"
          origen_ref?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cliente_id?: string | null
          servicio_id?: string | null
          tipo?: "sesion" | "hora" | "hito" | null
          fecha?: string
          cantidad?: number
          tarifa_aplicada?: number | null
          monto?: number | null
          monto_override?: boolean
          facturado?: boolean
          pago_id?: string | null
          duracion_minutos?: number | null
          origen?: "manual" | "voz" | "google_calendar" | "api"
          origen_ref?: string | null
          notas?: string | null
          created_at?: string
        }
      }
      registros_pagos: {
        Row: {
          id: string
          user_id: string
          registro_id: string
          pago_id: string
          monto_asignado: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          registro_id: string
          pago_id: string
          monto_asignado: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          registro_id?: string
          pago_id?: string
          monto_asignado?: number
          created_at?: string
        }
      }
      pagos_cliente: {
        Row: {
          id: string
          user_id: string
          cliente_id: string | null
          monto: number
          moneda: string
          fecha: string
          metodo: string | null
          cuenta_destino_id: string | null
          observaciones: string | null
          movimiento_id: string | null
          registro_creado_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cliente_id?: string | null
          monto: number
          moneda?: string
          fecha?: string
          metodo?: string | null
          cuenta_destino_id?: string | null
          observaciones?: string | null
          movimiento_id?: string | null
          registro_creado_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cliente_id?: string | null
          monto?: number
          moneda?: string
          fecha?: string
          metodo?: string | null
          cuenta_destino_id?: string | null
          observaciones?: string | null
          movimiento_id?: string | null
          registro_creado_id?: string | null
          created_at?: string
        }
      }
      movimientos: {
        Row: {
          id: string
          user_id: string
          cuenta_id: string | null
          categoria_id: string | null
          tipo: "Ingreso" | "Egreso" | "Transferencia"
          ambito: "Personal" | "Profesional"
          monto: number
          moneda: string
          tipo_cambio: number | null
          concepto: string | null
          descripcion: string | null
          clasificacion: "Fijo" | "Variable" | "Cuotas"
          cuotas: number
          frecuencia: "Corriente" | "No corriente"
          necesidad: number | null
          metodo: "Efectivo" | "Transferencia" | "Billetera virtual" | "Crédito" | "Débito automático" | "Débito" | null
          tarjeta_id: string | null
          fecha_vencimiento: string | null
          debita_de: "cuenta" | "tarjeta" | null
          cuenta_destino_id: string | null
          cantidad: number
          unitario: number | null
          observaciones: string | null
          cliente_id: string | null
          servicio_id: string | null
          fecha: string
          es_compartido: boolean
          gc_mi_parte: number | null
          prestamo_id: string | null
          prestamo_pago_id: string | null
          plantilla_recurrente_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cuenta_id?: string | null
          categoria_id?: string | null
          tipo: "Ingreso" | "Egreso" | "Transferencia"
          ambito?: "Personal" | "Profesional"
          monto: number
          moneda?: string
          tipo_cambio?: number | null
          concepto?: string | null
          descripcion?: string | null
          clasificacion?: "Fijo" | "Variable" | "Cuotas"
          cuotas?: number
          frecuencia?: "Corriente" | "No corriente"
          necesidad?: number | null
          metodo?: "Efectivo" | "Transferencia" | "Billetera virtual" | "Crédito" | "Débito automático" | "Débito" | null
          tarjeta_id?: string | null
          fecha_vencimiento?: string | null
          debita_de?: "cuenta" | "tarjeta" | null
          cuenta_destino_id?: string | null
          cantidad?: number
          unitario?: number | null
          observaciones?: string | null
          cliente_id?: string | null
          servicio_id?: string | null
          fecha?: string
          es_compartido?: boolean
          gc_mi_parte?: number | null
          prestamo_id?: string | null
          prestamo_pago_id?: string | null
          plantilla_recurrente_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cuenta_id?: string | null
          categoria_id?: string | null
          tipo?: "Ingreso" | "Egreso" | "Transferencia"
          ambito?: "Personal" | "Profesional"
          monto?: number
          moneda?: string
          tipo_cambio?: number | null
          concepto?: string | null
          descripcion?: string | null
          clasificacion?: "Fijo" | "Variable" | "Cuotas"
          cuotas?: number
          frecuencia?: "Corriente" | "No corriente"
          necesidad?: number | null
          metodo?: "Efectivo" | "Transferencia" | "Billetera virtual" | "Crédito" | "Débito automático" | "Débito" | null
          tarjeta_id?: string | null
          fecha_vencimiento?: string | null
          debita_de?: "cuenta" | "tarjeta" | null
          cuenta_destino_id?: string | null
          cantidad?: number
          unitario?: number | null
          observaciones?: string | null
          cliente_id?: string | null
          servicio_id?: string | null
          fecha?: string
          es_compartido?: boolean
          gc_mi_parte?: number | null
          prestamo_id?: string | null
          prestamo_pago_id?: string | null
          plantilla_recurrente_id?: string | null
          created_at?: string
        }
      }
      conversaciones_ia: {
        Row: {
          id: string
          user_id: string
          mensajes: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mensajes?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mensajes?: Json
          created_at?: string
          updated_at?: string
        }
      }
      profesiones_templates: {
        Row: {
          id: string
          nombre: string
          slug: string
          categorias_sugeridas: Json
          modalidades: Json
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          slug: string
          categorias_sugeridas?: Json
          modalidades?: Json
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          slug?: string
          categorias_sugeridas?: Json
          modalidades?: Json
          created_at?: string
        }
      }
      feature_flags: {
        Row: {
          id: string
          user_id: string
          flags: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flags?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flags?: Json
          created_at?: string
        }
      }
      personas: {
        Row: {
          id: string
          user_id: string
          nombre: string
          notas: string | null
          archivado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          notas?: string | null
          archivado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nombre?: string
          notas?: string | null
          archivado?: boolean
          created_at?: string
        }
      }
      grupos: {
        Row: {
          id: string
          user_id: string
          nombre: string
          archivado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          archivado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nombre?: string
          archivado?: boolean
          created_at?: string
        }
      }
      grupo_miembros: {
        Row: {
          grupo_id: string
          persona_id: string
        }
        Insert: {
          grupo_id: string
          persona_id: string
        }
        Update: {
          grupo_id?: string
          persona_id?: string
        }
      }
      gastos_compartidos_participantes: {
        Row: {
          id: string
          user_id: string
          movimiento_id: string
          persona_nombre: string
          persona_id: string | null
          monto: number
          estado: "pendiente" | "cobrado"
          modo: "fijo" | "a_repartir"
          cuenta_destino_id: string | null
          movimiento_ingreso_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          movimiento_id: string
          persona_nombre: string
          persona_id?: string | null
          monto: number
          estado?: "pendiente" | "cobrado"
          modo?: "fijo" | "a_repartir"
          cuenta_destino_id?: string | null
          movimiento_ingreso_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          movimiento_id?: string
          persona_nombre?: string
          persona_id?: string | null
          monto?: number
          estado?: "pendiente" | "cobrado"
          modo?: "fijo" | "a_repartir"
          cuenta_destino_id?: string | null
          movimiento_ingreso_id?: string | null
          created_at?: string
        }
      }
      prestamos: {
        Row: {
          id: string
          user_id: string
          tipo: "otorgado" | "recibido" | "bancario"
          persona_id: string | null
          institucion_nombre: string | null
          monto_inicial: number
          moneda: string
          fecha_inicio: string
          fecha_vencimiento: string | null
          cantidad_cuotas: number | null
          tasa_interes_anual: number | null
          cuota_mensual: number | null
          dia_vencimiento_cuota: number | null
          estado: "activo" | "cancelado"
          notas: string | null
          archivado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tipo: "otorgado" | "recibido" | "bancario"
          persona_id?: string | null
          institucion_nombre?: string | null
          monto_inicial: number
          moneda?: string
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          cantidad_cuotas?: number | null
          tasa_interes_anual?: number | null
          cuota_mensual?: number | null
          dia_vencimiento_cuota?: number | null
          estado?: "activo" | "cancelado"
          notas?: string | null
          archivado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tipo?: "otorgado" | "recibido" | "bancario"
          persona_id?: string | null
          institucion_nombre?: string | null
          monto_inicial?: number
          moneda?: string
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          cantidad_cuotas?: number | null
          tasa_interes_anual?: number | null
          cuota_mensual?: number | null
          dia_vencimiento_cuota?: number | null
          estado?: "activo" | "cancelado"
          notas?: string | null
          archivado?: boolean
          created_at?: string
        }
      }
      prestamos_pagos: {
        Row: {
          id: string
          prestamo_id: string
          fecha: string
          monto: number
          cuota_numero: number | null
          movimiento_id: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prestamo_id: string
          fecha?: string
          monto: number
          cuota_numero?: number | null
          movimiento_id?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prestamo_id?: string
          fecha?: string
          monto?: number
          cuota_numero?: number | null
          movimiento_id?: string | null
          notas?: string | null
          created_at?: string
        }
      }
      plantillas_recurrentes: {
        Row: {
          id: string
          user_id: string
          nombre: string
          monto_estimado: number
          moneda: string
          dia_mes: number
          metodo: "Efectivo" | "Transferencia" | "Billetera virtual" | "Crédito" | "Débito automático" | "Débito" | null
          debita_de: "cuenta" | "tarjeta" | null
          cuenta_id: string | null
          tarjeta_id: string | null
          categoria_id: string | null
          clasificacion: "Fijo" | "Variable" | "Cuotas" | null
          concepto: string | null
          activo: boolean
          fecha_inicio: string
          fecha_fin: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          monto_estimado: number
          moneda?: string
          dia_mes: number
          metodo?: "Efectivo" | "Transferencia" | "Billetera virtual" | "Crédito" | "Débito automático" | "Débito" | null
          debita_de?: "cuenta" | "tarjeta" | null
          cuenta_id?: string | null
          tarjeta_id?: string | null
          categoria_id?: string | null
          clasificacion?: "Fijo" | "Variable" | "Cuotas" | null
          concepto?: string | null
          activo?: boolean
          fecha_inicio?: string
          fecha_fin?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nombre?: string
          monto_estimado?: number
          moneda?: string
          dia_mes?: number
          metodo?: "Efectivo" | "Transferencia" | "Billetera virtual" | "Crédito" | "Débito automático" | "Débito" | null
          debita_de?: "cuenta" | "tarjeta" | null
          cuenta_id?: string | null
          tarjeta_id?: string | null
          categoria_id?: string | null
          clasificacion?: "Fijo" | "Variable" | "Cuotas" | null
          concepto?: string | null
          activo?: boolean
          fecha_inicio?: string
          fecha_fin?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      gastos_grupales_pagadores: {
        Row: {
          id: string
          user_id: string
          gasto_id: string
          persona_id: string | null
          monto_pagado: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gasto_id: string
          persona_id?: string | null
          monto_pagado: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gasto_id?: string
          persona_id?: string | null
          monto_pagado?: number
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Helpers para acceder a tipos de filas individuales
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Cuenta = Database["public"]["Tables"]["cuentas"]["Row"]
export type Tarjeta = Database["public"]["Tables"]["tarjetas"]["Row"]
export type Categoria = Database["public"]["Tables"]["categorias"]["Row"]
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"]
export type ServicioCliente = Database["public"]["Tables"]["servicios_cliente"]["Row"]
export type TarifaHistorial = Database["public"]["Tables"]["tarifas_historial"]["Row"]
export type RegistroTrabajo = Database["public"]["Tables"]["registros_trabajo"]["Row"]
export type RegistroPago = Database["public"]["Tables"]["registros_pagos"]["Row"]
export type PagoCliente = Database["public"]["Tables"]["pagos_cliente"]["Row"]
export type Movimiento = Database["public"]["Tables"]["movimientos"]["Row"]
export type ConversacionIA = Database["public"]["Tables"]["conversaciones_ia"]["Row"]
export type ProfesionTemplate = Database["public"]["Tables"]["profesiones_templates"]["Row"]
export type FeatureFlags = Database["public"]["Tables"]["feature_flags"]["Row"]
export type Persona = Database["public"]["Tables"]["personas"]["Row"]
export type Grupo = Database["public"]["Tables"]["grupos"]["Row"]
export type GrupoMiembro = Database["public"]["Tables"]["grupo_miembros"]["Row"]
export type GastoCompartidoParticipante = Database["public"]["Tables"]["gastos_compartidos_participantes"]["Row"]
export type Prestamo = Database["public"]["Tables"]["prestamos"]["Row"]
export type PrestamoPago = Database["public"]["Tables"]["prestamos_pagos"]["Row"]
export type GastoGrupalPagador = Database["public"]["Tables"]["gastos_grupales_pagadores"]["Row"]
export type PlantillaRecurrente = Database["public"]["Tables"]["plantillas_recurrentes"]["Row"]
