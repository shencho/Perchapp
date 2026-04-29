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
          email: string | null
          telefono: string | null
          notas: string | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          email?: string | null
          telefono?: string | null
          notas?: string | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nombre?: string
          email?: string | null
          telefono?: string | null
          notas?: string | null
          activo?: boolean
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
          tarifa_actual: number | null
          moneda: string
          frecuencia: "mensual" | "semanal" | "por_sesion" | "otro" | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cliente_id: string
          nombre: string
          descripcion?: string | null
          tarifa_actual?: number | null
          moneda?: string
          frecuencia?: "mensual" | "semanal" | "por_sesion" | "otro" | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cliente_id?: string
          nombre?: string
          descripcion?: string | null
          tarifa_actual?: number | null
          moneda?: string
          frecuencia?: "mensual" | "semanal" | "por_sesion" | "otro" | null
          activo?: boolean
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
          fecha_desde: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          servicio_id: string
          tarifa: number
          moneda?: string
          fecha_desde?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          servicio_id?: string
          tarifa?: number
          moneda?: string
          fecha_desde?: string
          created_at?: string
        }
      }
      registros_trabajo: {
        Row: {
          id: string
          user_id: string
          cliente_id: string | null
          servicio_id: string | null
          fecha: string
          duracion_minutos: number | null
          notas: string | null
          cobrado: boolean
          monto: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cliente_id?: string | null
          servicio_id?: string | null
          fecha?: string
          duracion_minutos?: number | null
          notas?: string | null
          cobrado?: boolean
          monto?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cliente_id?: string | null
          servicio_id?: string | null
          fecha?: string
          duracion_minutos?: number | null
          notas?: string | null
          cobrado?: boolean
          monto?: number | null
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
          notas: string | null
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
          notas?: string | null
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
          notas?: string | null
          created_at?: string
        }
      }
      movimientos: {
        Row: {
          id: string
          user_id: string
          cuenta_id: string | null
          categoria_id: string | null
          tipo: "ingreso" | "egreso"
          monto: number
          descripcion: string | null
          fecha: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cuenta_id?: string | null
          categoria_id?: string | null
          tipo: "ingreso" | "egreso"
          monto: number
          descripcion?: string | null
          fecha?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cuenta_id?: string | null
          categoria_id?: string | null
          tipo?: "ingreso" | "egreso"
          monto?: number
          descripcion?: string | null
          fecha?: string
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
export type PagoCliente = Database["public"]["Tables"]["pagos_cliente"]["Row"]
export type Movimiento = Database["public"]["Tables"]["movimientos"]["Row"]
export type ConversacionIA = Database["public"]["Tables"]["conversaciones_ia"]["Row"]
export type ProfesionTemplate = Database["public"]["Tables"]["profesiones_templates"]["Row"]
export type FeatureFlags = Database["public"]["Tables"]["feature_flags"]["Row"]
