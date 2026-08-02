// Tipos generados manualmente desde el schema de MANGO.
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
          es_admin: boolean
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
          es_admin?: boolean
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
          es_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bug_reports: {
        Row: {
          id: string
          sector: string
          titulo: string
          descripcion: string | null
          diagnostico: string | null
          fix_descripcion: string | null
          estado: string
          autor_id: string | null
          autor_nombre: string | null
          fecha_reporte: string
          fecha_resolucion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sector: string
          titulo: string
          descripcion?: string | null
          diagnostico?: string | null
          fix_descripcion?: string | null
          estado?: string
          autor_id?: string | null
          autor_nombre?: string | null
          fecha_reporte?: string
          fecha_resolucion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sector?: string
          titulo?: string
          descripcion?: string | null
          diagnostico?: string | null
          fix_descripcion?: string | null
          estado?: string
          autor_id?: string | null
          autor_nombre?: string | null
          fecha_reporte?: string
          fecha_resolucion?: string | null
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
          es_reembolso: boolean
          cuota_numero: number | null
          cuota_grupo_id: string | null
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
          es_reembolso?: boolean
          cuota_numero?: number | null
          cuota_grupo_id?: string | null
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
          es_reembolso?: boolean
          cuota_numero?: number | null
          cuota_grupo_id?: string | null
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
          usuario_vinculado_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          notas?: string | null
          archivado?: boolean
          usuario_vinculado_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nombre?: string
          notas?: string | null
          archivado?: boolean
          usuario_vinculado_id?: string | null
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
      conexiones: {
        Row: {
          id: string
          solicitante_id: string
          receptor_id: string
          solicitante_nombre: string | null
          receptor_nombre: string | null
          estado: string
          mensaje: string | null
          created_at: string
          updated_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          solicitante_id: string
          receptor_id: string
          solicitante_nombre?: string | null
          receptor_nombre?: string | null
          estado?: string
          mensaje?: string | null
          created_at?: string
          updated_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          solicitante_id?: string
          receptor_id?: string
          solicitante_nombre?: string | null
          receptor_nombre?: string | null
          estado?: string
          mensaje?: string | null
          created_at?: string
          updated_at?: string
          responded_at?: string | null
        }
      }
      notificaciones: {
        Row: {
          id: string
          user_id: string
          tipo: string
          titulo: string
          cuerpo: string | null
          ref_id: string | null
          leida: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tipo: string
          titulo: string
          cuerpo?: string | null
          ref_id?: string | null
          leida?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tipo?: string
          titulo?: string
          cuerpo?: string | null
          ref_id?: string | null
          leida?: boolean
          created_at?: string
        }
      }
      deudas_compartidas: {
        Row: {
          id: string
          acreedor_id: string
          deudor_id: string
          acreedor_nombre: string | null
          deudor_nombre: string | null
          conexion_id: string | null
          monto: number
          moneda: string
          concepto: string | null
          movimiento_origen_id: string | null
          participante_id: string | null
          proyecto_id: string | null
          origen: string
          estado: string
          deudor_cuenta_id: string | null
          acreedor_cuenta_id: string | null
          mov_ingreso_acreedor_id: string | null
          mov_egreso_deudor_id: string | null
          created_at: string
          updated_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          acreedor_id: string
          deudor_id: string
          acreedor_nombre?: string | null
          deudor_nombre?: string | null
          conexion_id?: string | null
          monto: number
          moneda?: string
          concepto?: string | null
          movimiento_origen_id?: string | null
          participante_id?: string | null
          proyecto_id?: string | null
          origen?: string
          estado?: string
          deudor_cuenta_id?: string | null
          acreedor_cuenta_id?: string | null
          mov_ingreso_acreedor_id?: string | null
          mov_egreso_deudor_id?: string | null
          created_at?: string
          updated_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          acreedor_id?: string
          deudor_id?: string
          acreedor_nombre?: string | null
          deudor_nombre?: string | null
          conexion_id?: string | null
          monto?: number
          moneda?: string
          concepto?: string | null
          movimiento_origen_id?: string | null
          participante_id?: string | null
          proyecto_id?: string | null
          origen?: string
          estado?: string
          deudor_cuenta_id?: string | null
          acreedor_cuenta_id?: string | null
          mov_ingreso_acreedor_id?: string | null
          mov_egreso_deudor_id?: string | null
          created_at?: string
          updated_at?: string
          responded_at?: string | null
        }
      }
      proyectos: {
        Row: {
          id: string
          created_by: string
          nombre: string
          tipo: string
          fecha_inicio: string | null
          fecha_fin: string | null
          moneda_default: string
          grupo_origen_id: string | null
          archivado: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by: string
          nombre: string
          tipo?: string
          fecha_inicio?: string | null
          fecha_fin?: string | null
          moneda_default?: string
          grupo_origen_id?: string | null
          archivado?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string
          nombre?: string
          tipo?: string
          fecha_inicio?: string | null
          fecha_fin?: string | null
          moneda_default?: string
          grupo_origen_id?: string | null
          archivado?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      proyecto_miembros: {
        Row: {
          id: string
          proyecto_id: string
          usuario_id: string | null
          persona_id: string | null
          nombre: string
          rol: string
          created_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          usuario_id?: string | null
          persona_id?: string | null
          nombre: string
          rol?: string
          created_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          usuario_id?: string | null
          persona_id?: string | null
          nombre?: string
          rol?: string
          created_at?: string
        }
      }
      proyecto_gastos: {
        Row: {
          id: string
          proyecto_id: string
          creado_por: string
          concepto: string | null
          monto_total: number
          moneda: string
          fecha: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          creado_por: string
          concepto?: string | null
          monto_total: number
          moneda?: string
          fecha: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          creado_por?: string
          concepto?: string | null
          monto_total?: number
          moneda?: string
          fecha?: string
          created_at?: string
          updated_at?: string
        }
      }
      proyecto_gasto_pagadores: {
        Row: { id: string; gasto_id: string; miembro_id: string; monto_pagado: number }
        Insert: { id?: string; gasto_id: string; miembro_id: string; monto_pagado: number }
        Update: { id?: string; gasto_id?: string; miembro_id?: string; monto_pagado?: number }
      }
      proyecto_gasto_splits: {
        Row: { id: string; gasto_id: string; miembro_id: string; monto_consumido: number; modo: string }
        Insert: { id?: string; gasto_id: string; miembro_id: string; monto_consumido: number; modo?: string }
        Update: { id?: string; gasto_id?: string; miembro_id?: string; monto_consumido?: number; modo?: string }
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
          tipo: "Egreso" | "Ingreso"
          ambito: "Personal" | "Profesional"
          cliente_id: string | null
          servicio_id: string | null
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
          tipo?: "Egreso" | "Ingreso"
          ambito?: "Personal" | "Profesional"
          cliente_id?: string | null
          servicio_id?: string | null
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
          tipo?: "Egreso" | "Ingreso"
          ambito?: "Personal" | "Profesional"
          cliente_id?: string | null
          servicio_id?: string | null
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
      alertas_silenciadas: {
        Row: {
          id: string
          user_id: string
          alerta_tipo: "plantilla_pendiente" | "plantilla_atrasada"
          alerta_referencia: string
          silenciada_hasta: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          alerta_tipo: "plantilla_pendiente" | "plantilla_atrasada"
          alerta_referencia: string
          silenciada_hasta: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          alerta_tipo?: "plantilla_pendiente" | "plantilla_atrasada"
          alerta_referencia?: string
          silenciada_hasta?: string
          created_at?: string
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
    Functions: {
      buscar_usuario_por_email: {
        Args: { p_email: string }
        Returns: { id: string; nombre: string | null }[]
      }
      sincronizar_deudas_gasto: {
        Args: { p_movimiento_id: string }
        Returns: undefined
      }
      conciliar_deuda: {
        Args: {
          p_deuda_id: string
          p_acreedor_cuenta_id: string | null
          p_fecha: string
          p_observacion?: string | null
        }
        Returns: undefined
      }
      revertir_conciliacion: {
        Args: { p_deuda_id: string }
        Returns: undefined
      }
      puede_ver_proyecto: {
        Args: { p_proyecto_id: string }
        Returns: boolean
      }
      crear_deuda_proyecto: {
        Args: {
          p_proyecto_id: string
          p_deudor_id: string
          p_acreedor_id: string
          p_monto: number
          p_moneda: string
          p_concepto: string | null
        }
        Returns: string | null
      }
    }
    Enums: Record<string, never>
  }
}

// Helpers para acceder a tipos de filas individuales
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Cuenta = Database["public"]["Tables"]["cuentas"]["Row"]
export type Tarjeta = Database["public"]["Tables"]["tarjetas"]["Row"]
export type Categoria = Database["public"]["Tables"]["categorias"]["Row"]
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
export type AlertaSilenciada = Database["public"]["Tables"]["alertas_silenciadas"]["Row"]
export type Conexion = Database["public"]["Tables"]["conexiones"]["Row"]
export type Notificacion = Database["public"]["Tables"]["notificaciones"]["Row"]
export type DeudaCompartida = Database["public"]["Tables"]["deudas_compartidas"]["Row"]
export type BugReport = Database["public"]["Tables"]["bug_reports"]["Row"]
export type Proyecto = Database["public"]["Tables"]["proyectos"]["Row"]
export type ProyectoMiembro = Database["public"]["Tables"]["proyecto_miembros"]["Row"]
export type ProyectoGasto = Database["public"]["Tables"]["proyecto_gastos"]["Row"]
export type ProyectoGastoPagador = Database["public"]["Tables"]["proyecto_gasto_pagadores"]["Row"]
export type ProyectoGastoSplit = Database["public"]["Tables"]["proyecto_gasto_splits"]["Row"]
