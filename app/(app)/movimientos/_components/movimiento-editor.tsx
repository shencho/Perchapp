"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, Users, AlertTriangle, Lock, Unlock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { cn } from "@/lib/utils";
import { createMovimiento, updateMovimiento } from "@/lib/supabase/actions/movimientos";
import { createPlantilla, buscarPlantillaParecida } from "@/lib/supabase/actions/plantillas";
import { getServicios } from "@/lib/supabase/actions/servicios";
import {
  getPagoByMovimientoId,
  syncPagoFromMovimiento,
  unlinkPagoFromMovimiento,
} from "@/lib/supabase/actions/pagos";
import {
  getParticipantes,
  upsertParticipantes,
  getPagadores,
  upsertPagadores,
} from "@/lib/supabase/actions/gastos-compartidos";
import type { ParticipanteInput, PagadorFormInput } from "@/lib/supabase/actions/gastos-compartidos-types";
import { createPersona } from "@/lib/supabase/actions/personas";
import { RegistrarPagoModal } from "./registrar-pago-modal";
import {
  TIPOS_MOV,
  AMBITOS,
  METODOS,
  CLASIFICACIONES,
  FRECUENCIAS,
  type MovimientoInput,
} from "@/lib/supabase/actions/movimientos-types";
import type { Movimiento, Cuenta, Tarjeta, Categoria, Persona, PlantillaRecurrente } from "@/types/supabase";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import { CreatableSelect, type CatOption } from "./creatable-select";

// ── Tipos internos gasto compartido ───────────────────────────────────────────

interface ParticipanteForm {
  tempId:          string;
  dbId?:           string;
  persona_nombre:  string;
  persona_id:      string | null;
  monto:           number;
  montoEditado:    boolean;
  modo:            "fijo" | "a_repartir";
  estado:          "pendiente" | "cobrado";
  guardarEnAgenda: boolean;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo:              z.enum(TIPOS_MOV),
  ambito:            z.enum(AMBITOS),
  moneda:            z.enum(["ARS", "USD"]),
  tipo_cambio:       z.number().positive().nullable().optional(),
  monto:             z.number().positive("El monto debe ser mayor a 0"),
  categoria_id:      z.string().nullable().optional(),
  clasificacion:     z.enum(CLASIFICACIONES),
  cuotas:            z.number().int().min(1),
  frecuencia:        z.enum(FRECUENCIAS),
  necesidad:         z.number().int().min(1).max(5).nullable().optional(),
  metodo:            z.enum(METODOS).nullable().optional(),
  cuenta_id:         z.string().nullable().optional(),
  tarjeta_id:        z.string().nullable().optional(),
  fecha_vencimiento: z.string().nullable().optional(),
  debita_de:         z.enum(["cuenta", "tarjeta"]).nullable().optional(),
  cuenta_destino_id: z.string().nullable().optional(),
  concepto:          z.string().nullable().optional(),
  descripcion:       z.string().nullable().optional(),
  cantidad:          z.number().int().min(1),
  observaciones:     z.string().nullable().optional(),
  fecha:             z.string().optional(),
  cliente_id:        z.string().nullable().optional(),
  servicio_id:       z.string().nullable().optional(),
  crear_recurrente:   z.boolean().optional(),
  nombre_plantilla:   z.string().optional(),
  dia_mes_recurrente: z.number().int().min(1).max(31).optional(),
}).superRefine((data, ctx) => {
  if (data.ambito === "Profesional" && data.tipo !== "Transferencia" && !data.cliente_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El cliente es requerido", path: ["cliente_id"] });
  }
  if (data.crear_recurrente === true) {
    if (!data.nombre_plantilla || data.nombre_plantilla.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nombre requerido (mínimo 2 caracteres)", path: ["nombre_plantilla"] });
    }
    if (!data.dia_mes_recurrente || data.dia_mes_recurrente < 1 || data.dia_mes_recurrente > 31) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El día debe ser entre 1 y 31", path: ["dia_mes_recurrente"] });
    }
  }
});

type FormData = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editing?: Movimiento | null;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  clientes?: { id: string; nombre: string }[];
  defaultValues?: Partial<FormData>;
  suggestCategoria?: string;
  personas?: Persona[];
  grupos?: GrupoConMiembros[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NECESIDAD_LABELS: Record<number, string> = {
  1: "Innecesario",
  2: "Prescindible",
  3: "Medio",
  4: "Necesario",
  5: "Esencial",
};

const NECESIDAD_COLORS: Record<number, string> = {
  1: "bg-red-900 border-red-700 text-red-200",
  2: "bg-orange-900 border-orange-700 text-orange-200",
  3: "bg-yellow-900 border-yellow-700 text-yellow-200",
  4: "bg-green-900 border-green-700 text-green-200",
  5: "bg-emerald-900 border-emerald-700 text-emerald-200",
};

function formatMonto(n: number | string, moneda = "ARS") {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda }).format(num);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MovimientoEditor({ open, onClose, onSaved, editing, cuentas, tarjetas, categorias, clientes = [], defaultValues, suggestCategoria, personas = [], grupos = [] }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCategorias, setLocalCategorias] = useState<Categoria[]>(categorias);
  const [padreId, setPadreId] = useState<string | null>(null);
  const [subcatId, setSubcatId] = useState<string | null>(null);
  const [serviciosCliente, setServiciosCliente] = useState<{ id: string; nombre: string; modalidad: string }[]>([]);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<MovimientoInput | null>(null);
  const [linkedPago, setLinkedPago] = useState<{ id: string; registro_creado_id: string | null } | null>(null);

  // Gasto compartido
  const [esCompartido, setEsCompartido] = useState(false);
  const [gcMiParte, setGcMiParte] = useState<number>(0);
  const [gcMiParteEditada, setGcMiParteEditada] = useState(false);
  const [gcMiParteModo, setGcMiParteModo] = useState<"fijo" | "a_repartir">("a_repartir");
  const [participantes, setParticipantes] = useState<ParticipanteForm[]>([]);
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [nuevaPersonaId, setNuevaPersonaId] = useState<string | null>(null);
  const [nuevaGuardarEnAgenda, setNuevaGuardarEnAgenda] = useState(false);

  // Pagadores (Splitwise)
  const [pagadores, setPagadores] = useState<PagadorFormInput[]>([]);
  const [pagadoresAutoSync, setPagadoresAutoSync] = useState(true);
  const [showAddPagador, setShowAddPagador] = useState(false);
  const [nuevoPagadorNombre, setNuevoPagadorNombre] = useState("");
  const [nuevoPagadorPersonaId, setNuevoPagadorPersonaId] = useState<string | null>(null);
  const [nuevoPagadorMonto, setNuevoPagadorMonto] = useState<number>(0);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo:          "Egreso",
      ambito:        "Personal",
      moneda:        "ARS",
      clasificacion: "Variable",
      cuotas:        1,
      frecuencia:       "Corriente",
      cantidad:         1,
      fecha:            todayStr(),
      cliente_id:       null,
      servicio_id:      null,
      crear_recurrente: false,
      ...defaultValues,
    },
  });

  // Sincronizar si viene editing o defaultValues
  useEffect(() => {
    // Determina padreId/subcatId a partir de un categoria_id que puede ser padre o hijo
    function resolveCatId(catId: string | null | undefined) {
      if (!catId) { setPadreId(null); setSubcatId(null); return; }
      const cat = localCategorias.find((c) => c.id === catId);
      if (cat?.parent_id) {
        setPadreId(cat.parent_id);
        setSubcatId(cat.id);
      } else {
        setPadreId(catId);
        setSubcatId(null);
      }
    }

    if (editing) {
      resolveCatId(editing.categoria_id);
      reset({
        tipo:              editing.tipo as FormData["tipo"],
        ambito:            editing.ambito as FormData["ambito"],
        moneda:            (editing.moneda ?? "ARS") as "ARS" | "USD",
        tipo_cambio:       editing.tipo_cambio ?? undefined,
        monto:             editing.monto,
        clasificacion:     (editing.clasificacion ?? "Variable") as FormData["clasificacion"],
        cuotas:            editing.cuotas ?? 1,
        frecuencia:        (editing.frecuencia ?? "Corriente") as FormData["frecuencia"],
        necesidad:         editing.necesidad ?? undefined,
        metodo:            (editing.metodo ?? undefined) as FormData["metodo"],
        cuenta_id:         editing.cuenta_id ?? undefined,
        tarjeta_id:        editing.tarjeta_id ?? undefined,
        fecha_vencimiento: editing.fecha_vencimiento ?? undefined,
        debita_de:         (editing.debita_de ?? undefined) as FormData["debita_de"],
        cuenta_destino_id: editing.cuenta_destino_id ?? undefined,
        concepto:          editing.concepto ?? undefined,
        descripcion:       editing.descripcion ?? undefined,
        cantidad:          editing.cantidad ?? 1,
        observaciones:     editing.observaciones ?? undefined,
        fecha:             editing.fecha ?? todayStr(),
        cliente_id:        editing.cliente_id ?? null,
        servicio_id:       editing.servicio_id ?? null,
      });
    } else if (defaultValues) {
      resolveCatId(defaultValues.categoria_id as string | null | undefined);
      reset({ tipo: "Egreso", ambito: "Personal", moneda: "ARS", clasificacion: "Variable", cuotas: 1, frecuencia: "Corriente", cantidad: 1, fecha: todayStr(), ...defaultValues });
    } else {
      setPadreId(null);
      setSubcatId(null);
      reset({ tipo: "Egreso", ambito: "Personal", moneda: "ARS", clasificacion: "Variable", cuotas: 1, frecuencia: "Corriente", cantidad: 1, fecha: todayStr() });
    }
    setPagoModalOpen(false);
    setPendingPayload(null);
    setLinkedPago(null);

    // Gasto compartido
    setEsCompartido(editing?.es_compartido ?? false);
    setGcMiParte(editing?.gc_mi_parte ?? 0);
    setGcMiParteEditada(false);
    setGcMiParteModo("a_repartir");
    setNuevaNombre("");
    setNuevaPersonaId(null);
    setNuevaGuardarEnAgenda(false);
    // Pagadores — init sync, override async from DB
    setShowAddPagador(false);
    setNuevoPagadorNombre("");
    setNuevoPagadorPersonaId(null);
    setNuevoPagadorMonto(0);
    if (editing?.es_compartido) {
      setPagadores([{ personaId: null, nombre: "Vos", montoPagado: editing.monto }]);
      setPagadoresAutoSync(true);
    } else {
      setPagadores([]);
      setPagadoresAutoSync(true);
    }

    if (editing?.es_compartido && editing.id) {
      getParticipantes(editing.id)
        .then((ps) => setParticipantes(ps.map((p) => ({
          tempId:          p.id,
          dbId:            p.id,
          persona_nombre:  p.persona_nombre,
          persona_id:      p.persona_id,
          monto:           p.monto,
          montoEditado:    false,
          modo:            ((p as { modo?: string }).modo as "fijo" | "a_repartir") ?? "a_repartir",
          estado:          p.estado,
          guardarEnAgenda: false,
        }))))
        .catch(() => setParticipantes([]));
      getPagadores(editing.id)
        .then((rows) => {
          if (rows.length > 0) {
            setPagadoresAutoSync(false);
            setPagadores(rows.map((r) => ({
              personaId:   r.persona_id,
              nombre:      r.persona_id
                ? (personas.find((p) => p.id === r.persona_id)?.nombre ?? "Persona")
                : "Vos",
              montoPagado: r.monto_pagado,
            })));
          }
          // else: keep sync default (user paid all)
        })
        .catch(() => {/* keep default */});
    } else {
      setParticipantes([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open]);

  // Cargar pago vinculado cuando se edita un movimiento Profesional
  useEffect(() => {
    if (editing?.id && editing?.ambito === "Profesional") {
      getPagoByMovimientoId(editing.id)
        .then((p) => setLinkedPago(p))
        .catch(() => setLinkedPago(null));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  // Valores observados para condicionales
  const tipo         = watch("tipo");
  const ambito       = watch("ambito");
  const moneda       = watch("moneda");
  const clasificacion = watch("clasificacion");
  const metodo       = watch("metodo");
  const debita_de    = watch("debita_de");
  const cuotas       = watch("cuotas");
  const monto        = watch("monto");
  const cantidad     = watch("cantidad");
  const clienteId        = watch("cliente_id");
  const crearRecurrente  = watch("crear_recurrente");

  // Pre-llenar nombre_plantilla con concepto cuando el usuario activa el checkbox
  useEffect(() => {
    if (crearRecurrente && !getValues("nombre_plantilla")) {
      setValue("nombre_plantilla", getValues("concepto") ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crearRecurrente, getValues, setValue]);

  // REGLA 1: detectar si el pago vinculado se desvinculará al guardar
  const pagoSeDesvinculara =
    !!editing && !!linkedPago &&
    (ambito !== (editing.ambito as string) || clienteId !== editing.cliente_id);

  // Resetear gasto compartido si se cambia el tipo
  useEffect(() => {
    if (tipo !== "Egreso") {
      setEsCompartido(false);
      setParticipantes([]);
      setPagadores([]);
      setPagadoresAutoSync(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  // Auto-sync monto del usuario en pagadores (solo cuando es el único pagador y no fue editado)
  useEffect(() => {
    if (esCompartido && pagadoresAutoSync && monto > 0 && !isNaN(monto)) {
      setPagadores([{ personaId: null, nombre: "Vos", montoPagado: monto }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monto, esCompartido, pagadoresAutoSync]);

  // Limpiar cliente/servicio cuando se cambia a Personal
  useEffect(() => {
    if (ambito !== "Profesional") {
      setValue("cliente_id", null);
      setValue("servicio_id", null);
      setServiciosCliente([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambito]);

  // Cargar servicios cuando cambia el cliente
  useEffect(() => {
    if (!clienteId) { setServiciosCliente([]); return; }
    getServicios(clienteId)
      .then((s) => setServiciosCliente(s.filter((sv) => !sv.archivado).map((sv) => ({ id: sv.id, nombre: sv.nombre, modalidad: sv.modalidad }))))
      .catch(() => setServiciosCliente([]));
  }, [clienteId]);

  // Categorías padre (sin parent_id)
  const catsPadre = localCategorias.filter((c) => !c.parent_id && (
    tipo === "Transferencia" ? false : c.tipo === tipo || c.tipo === "Ambos"
  ));
  // Subcategorías del padre seleccionado — usa padreId (estado local, no RHF)
  const catsHijas = padreId
    ? localCategorias.filter((c) => c.parent_id === padreId)
    : [];

  // Al cambiar tipo o categoría padre, limpiar subcategoría
  useEffect(() => { setSubcatId(null); }, [tipo, padreId]);

  // Visibilidad de tarjeta y fecha_vencimiento
  const showTarjeta = metodo === "Crédito" || (metodo === "Débito automático" && debita_de === "tarjeta");
  const showFechaVto = showTarjeta;
  const showDebitaDe = metodo === "Débito automático";
  const showNecesidad = tipo === "Egreso" && ambito === "Personal";
  const showCuotasChip = clasificacion === "Cuotas";
  const showTipoCambio = moneda === "USD";
  const showCuentaDestino = tipo === "Transferencia";

  // Chip de cuotas en vivo
  const unitario = monto && cuotas ? (monto / (cuotas || 1)) : 0;
  const total    = cantidad && monto ? cantidad * monto : monto;

  const datalistId = useId();
  const pagadoresDatalistId = useId();

  function agregarParticipante() {
    if (!nuevaNombre.trim()) return;
    setParticipantes((prev) => [
      ...prev,
      {
        tempId:          `temp-${Date.now()}`,
        persona_nombre:  nuevaNombre.trim(),
        persona_id:      nuevaPersonaId,
        monto:           0,
        montoEditado:    false,
        modo:            "a_repartir" as const,
        estado:          "pendiente" as const,
        guardarEnAgenda: nuevaGuardarEnAgenda,
      },
    ]);
    setNuevaNombre("");
    setNuevaPersonaId(null);
    setNuevaGuardarEnAgenda(false);
  }

  function repartirResto() {
    const fixedUser = gcMiParteModo === "fijo" ? gcMiParte : 0;
    const fixedParts = participantes
      .filter((p) => p.estado === "pendiente" && p.modo === "fijo")
      .reduce((acc, p) => acc + p.monto, 0);
    const montoARepartir = monto - fixedUser - fixedParts;
    if (montoARepartir < 0 || !monto) return;

    const repartirParts = participantes.filter((p) => p.estado === "pendiente" && p.modo === "a_repartir");
    const incluirUsuario = gcMiParteModo === "a_repartir";
    const n = repartirParts.length + (incluirUsuario ? 1 : 0);
    if (n === 0) return;

    const parte = Math.round((montoARepartir / n) * 100) / 100;
    if (incluirUsuario) {
      setGcMiParte(parte);
      setGcMiParteEditada(false);
    }
    setParticipantes((prev) =>
      prev.map((p) =>
        p.estado === "pendiente" && p.modo === "a_repartir"
          ? { ...p, monto: parte, montoEditado: false }
          : p
      )
    );
  }

  function agregarPagador() {
    if (!nuevoPagadorNombre.trim() || nuevoPagadorMonto <= 0) return;
    setPagadoresAutoSync(false);
    setPagadores((prev) => [
      ...prev,
      { personaId: nuevoPagadorPersonaId, nombre: nuevoPagadorNombre.trim(), montoPagado: nuevoPagadorMonto },
    ]);
    setNuevoPagadorNombre("");
    setNuevoPagadorPersonaId(null);
    setNuevoPagadorMonto(0);
    setShowAddPagador(false);
  }

  function eliminarPagador(idx: number) {
    setPagadoresAutoSync(false);
    setPagadores((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePagadorMonto(idx: number, valor: number) {
    setPagadoresAutoSync(false);
    setPagadores((prev) => prev.map((p, i) => i === idx ? { ...p, montoPagado: valor } : p));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: MovimientoInput = {
        ...values,
        tipo_cambio:       values.tipo_cambio ?? null,
        concepto:          values.concepto ?? null,
        descripcion:       values.descripcion ?? null,
        categoria_id:      subcatId ?? padreId ?? null,
        necesidad:         showNecesidad ? (values.necesidad ?? null) : null,
        metodo:            values.metodo ?? null,
        cuenta_id:         values.cuenta_id ?? null,
        tarjeta_id:        showTarjeta ? (values.tarjeta_id ?? null) : null,
        fecha_vencimiento: showFechaVto ? (values.fecha_vencimiento ?? null) : null,
        debita_de:         showDebitaDe ? (values.debita_de ?? null) : null,
        cuenta_destino_id: showCuentaDestino ? (values.cuenta_destino_id ?? null) : null,
        observaciones:     values.observaciones ?? null,
        cliente_id:        values.ambito === "Profesional" ? (values.cliente_id ?? null) : null,
        servicio_id:       values.ambito === "Profesional" ? (values.servicio_id ?? null) : null,
        unitario:          clasificacion === "Cuotas" ? unitario : values.monto,
        es_compartido:     esCompartido,
        gc_mi_parte:       esCompartido ? gcMiParte : null,
      };

      // Interceptar Ingreso Profesional nuevo → modal de pago
      if (!editing && values.tipo === "Ingreso" && values.ambito === "Profesional" && values.cliente_id) {
        setPendingPayload(payload);
        setPagoModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      // Preparar participantes para upsert: resolver "guardar en agenda" primero
      const participantesInput: ParticipanteInput[] = [];
      if (esCompartido) {
        // Consumo propio del usuario (persona_id = null) — para balance grupal
        if (gcMiParte > 0) {
          participantesInput.push({
            persona_nombre: "Vos",
            persona_id:     null,
            monto:          gcMiParte,
            modo:           gcMiParteModo,
          });
        }
        const pendientes = participantes.filter((p) => p.estado === "pendiente");
        for (const p of pendientes) {
          let personaId = p.persona_id;
          if (!personaId && p.guardarEnAgenda && p.persona_nombre.trim()) {
            const nueva = await createPersona(p.persona_nombre.trim());
            personaId = nueva.id;
          }
          participantesInput.push({
            persona_nombre: p.persona_nombre,
            persona_id:     personaId,
            monto:          p.monto,
            modo:           p.modo,
          });
        }
      }

      if (editing) {
        // REGLA 1: sincronizar o desvincular pago vinculado
        if (linkedPago) {
          const ambitoChanged = values.ambito !== (editing.ambito as string);
          const clienteChanged = values.cliente_id !== editing.cliente_id;
          if (ambitoChanged || clienteChanged) {
            await unlinkPagoFromMovimiento(editing.id);
          } else {
            await syncPagoFromMovimiento(editing.id, {
              monto:             values.monto,
              fecha:             values.fecha ?? new Date().toISOString().slice(0, 10),
              cuenta_destino_id: values.cuenta_id ?? null,
            });
          }
        }
        await updateMovimiento(editing.id, payload);
        if (esCompartido) {
          await Promise.all([
            upsertParticipantes(editing.id, participantesInput),
            upsertPagadores(editing.id, pagadores),
          ]);
        }
      } else {
        // ── Detección de duplicado antes de crear ──────────
        let hacerRecurrente = values.crear_recurrente === true && values.tipo === "Egreso";

        if (hacerRecurrente) {
          const match = await buscarPlantillaParecida({
            concepto:    payload.concepto    ?? null,
            categoria_id: payload.categoria_id ?? null,
            cuenta_id:   payload.cuenta_id   ?? null,
            tarjeta_id:  payload.tarjeta_id  ?? null,
          });
          if (match) {
            const confirmar = window.confirm(
              `Ya tenés una plantilla parecida: "${match.nombre}".\n¿Querés crear otra igual de todos modos?`
            );
            if (!confirmar) hacerRecurrente = false;
          }
        }

        // ── Crear movimiento ───────────────────────────────
        const { id: nuevoId } = await createMovimiento(payload);

        if (esCompartido) {
          await Promise.all([
            upsertParticipantes(nuevoId, participantesInput),
            upsertPagadores(nuevoId, pagadores),
          ]);
        }

        // ── Crear plantilla y vincular ─────────────────────
        if (hacerRecurrente) {
          try {
            const montoPlantilla = esCompartido && gcMiParte && gcMiParte > 0 ? gcMiParte : values.monto;
            const plantilla = await createPlantilla({
              nombre:         values.nombre_plantilla!,
              monto_estimado: montoPlantilla,
              moneda:         values.moneda,
              dia_mes:        values.dia_mes_recurrente!,
              metodo:         values.metodo ?? undefined,
              debita_de:      values.debita_de ?? null,
              cuenta_id:      values.cuenta_id ?? null,
              tarjeta_id:     values.tarjeta_id ?? null,
              categoria_id:   payload.categoria_id ?? null,
              concepto:       payload.concepto ?? null,
              clasificacion:  values.clasificacion as PlantillaRecurrente["clasificacion"],
            });
            await updateMovimiento(nuevoId, { plantilla_recurrente_id: plantilla.id });
          } catch (plantillaErr) {
            console.error("Error creando plantilla:", plantillaErr);
            window.alert(
              "El movimiento se creó correctamente, pero no se pudo crear la plantilla recurrente.\n" +
              "Podés crearla manualmente desde Ajustes > Recurrentes."
            );
          }
        }
      }

      router.refresh();
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
    {/* Modal de pago — z-[60], por encima del editor z-50 */}
    {pagoModalOpen && pendingPayload && (
      <RegistrarPagoModal
        open={pagoModalOpen}
        onClose={() => { setPagoModalOpen(false); setPendingPayload(null); }}
        onConfirm={() => {
          setPagoModalOpen(false);
          setPendingPayload(null);
          router.refresh();
          onSaved?.();
          onClose();
        }}
        cliente={{
          id: pendingPayload.cliente_id!,
          nombre: clientes.find((c) => c.id === pendingPayload.cliente_id)?.nombre ?? "",
        }}
        movimientoData={pendingPayload}
        serviciosDisponibles={serviciosCliente}
      />
    )}
    {open && (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:items-center sm:pt-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-semibold text-base">
            {editing ? "Editar movimiento" : "Nuevo movimiento"}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form body — scrollable */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-4">

            {/* TIPO + ÁMBITO */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={TIPOS_MOV.map(t => ({ value: t, label: t }))}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>

              {tipo !== "Transferencia" && (
                <div className="space-y-1.5">
                  <Label>Ámbito</Label>
                  <Controller
                    name="ambito"
                    control={control}
                    render={({ field }) => (
                      <NamedSelect
                        options={AMBITOS.map(a => ({ value: a, label: a }))}
                        value={field.value}
                        onValueChange={(v) => v && field.onChange(v)}
                        className="w-full"
                      />
                    )}
                  />
                </div>
              )}

              {ambito === "Profesional" && tipo !== "Transferencia" && (
                <div className="col-span-2">
                  {clientes.length === 0 ? (
                    <p className="text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-2">
                      Aún no tenés clientes. Agregalos en{" "}
                      <a href="/clientes" className="underline hover:text-foreground">/clientes</a>{" "}
                      para vincularlos a movimientos.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Cliente</Label>
                        <Controller
                          name="cliente_id"
                          control={control}
                          render={({ field }) => (
                            <NamedSelect
                              options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
                              value={field.value ?? ""}
                              onValueChange={(v) => {
                                field.onChange(v || null);
                                setValue("servicio_id", null);
                              }}
                              placeholder="Seleccionar cliente…"
                              className="w-full"
                            />
                          )}
                        />
                        {errors.cliente_id && (
                          <p className="text-xs text-destructive">{errors.cliente_id.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Servicio</Label>
                        <Controller
                          name="servicio_id"
                          control={control}
                          render={({ field }) => (
                            <NamedSelect
                              options={serviciosCliente.map((s) => ({ value: s.id, label: s.nombre }))}
                              value={field.value ?? ""}
                              onValueChange={(v) => field.onChange(v || null)}
                              placeholder="Opcional…"
                              disabled={!clienteId}
                              className="w-full"
                            />
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MONEDA + TIPO DE CAMBIO */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Controller
                  name="moneda"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={[{ value: "ARS", label: "ARS — Pesos" }, { value: "USD", label: "USD — Dólares" }]}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>

              {showTipoCambio && (
                <div className="space-y-1.5">
                  <Label>Tipo de cambio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="ej. 1200"
                    {...register("tipo_cambio", { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>

            {/* MONTO */}
            <div className="space-y-1.5">
              <Label>Monto ({moneda})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("monto", { valueAsNumber: true })}
                className={cn(errors.monto && "border-destructive")}
              />
              {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
            </div>

            {/* CATEGORÍA + SUBCATEGORÍA */}
            {tipo !== "Transferencia" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <CreatableSelect
                    options={catsPadre as CatOption[]}
                    value={padreId ?? ""}
                    onValueChange={(v) => {
                      setPadreId(v || null);
                      setSubcatId(null);
                    }}
                    onCreated={(opt) => {
                      setLocalCategorias((prev) => [
                        ...prev,
                        {
                          id: opt.id,
                          nombre: opt.nombre,
                          tipo: tipo === "Ingreso" ? "Ingreso" : "Egreso",
                          parent_id: null,
                          user_id: "",
                          color: null,
                          icono: null,
                          orden: 999,
                          archivada: false,
                          created_at: new Date().toISOString(),
                        },
                      ]);
                      setPadreId(opt.id);
                      setSubcatId(null);
                    }}
                    tipo={tipo === "Ingreso" ? "Ingreso" : "Egreso"}
                    parent_id={null}
                    suggestCreate={suggestCategoria}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Subcategoría</Label>
                  <CreatableSelect
                    options={catsHijas as CatOption[]}
                    value={subcatId ?? ""}
                    onValueChange={(v) => setSubcatId(v || null)}
                    onCreated={(opt) => {
                      setLocalCategorias((prev) => [
                        ...prev,
                        {
                          id: opt.id,
                          nombre: opt.nombre,
                          tipo: tipo === "Ingreso" ? "Ingreso" : "Egreso",
                          parent_id: padreId ?? null,
                          user_id: "",
                          color: null,
                          icono: null,
                          orden: 999,
                          archivada: false,
                          created_at: new Date().toISOString(),
                        },
                      ]);
                      setSubcatId(opt.id);
                    }}
                    tipo={tipo === "Ingreso" ? "Ingreso" : "Egreso"}
                    parent_id={padreId}
                    placeholder="Opcional"
                    disabled={!padreId}
                  />
                </div>
              </div>
            )}

            {/* CONCEPTO + DESCRIPCIÓN */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Concepto</Label>
                <Input placeholder="ej. Spotify, Alquiler" {...register("concepto")} />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input placeholder="Detalle adicional" {...register("descripcion")} />
              </div>
            </div>

            {/* CLASIFICACIÓN + FRECUENCIA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Clasificación</Label>
                <Controller
                  name="clasificacion"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={CLASIFICACIONES.map(c => ({ value: c, label: c }))}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Frecuencia</Label>
                <Controller
                  name="frecuencia"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={FRECUENCIAS.map(f => ({ value: f, label: f }))}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>

            {/* CUOTAS + chip */}
            {showCuotasChip && (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label>Número de cuotas</Label>
                  <Input type="number" min={1} step={1} {...register("cuotas", { valueAsNumber: true })} className="w-32" />
                </div>
                {cuotas > 1 && monto > 0 && (
                  <div className="inline-flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1 text-sm text-muted-foreground">
                    <span>💳</span>
                    <span>
                      {cuotas} cuotas de {formatMonto(unitario, moneda)} · {formatMonto(total, moneda)} total
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* NECESIDAD (picker 1-5) */}
            {showNecesidad && (
              <div className="space-y-1.5">
                <Label>Necesidad</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const current = watch("necesidad");
                    const isSelected = current === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setValue("necesidad", isSelected ? null : n)}
                        className={cn(
                          "px-3 py-1 rounded-full border text-xs font-medium transition-colors",
                          isSelected
                            ? NECESIDAD_COLORS[n]
                            : "border-border text-muted-foreground hover:border-foreground/40"
                        )}
                      >
                        {n} · {NECESIDAD_LABELS[n]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MÉTODO */}
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Controller
                name="metodo"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={METODOS.map(m => ({ value: m, label: m }))}
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                    placeholder="Seleccionar…"
                    className="w-full"
                  />
                )}
              />
            </div>

            {/* DÉBITO AUTOMÁTICO → debita_de */}
            {showDebitaDe && (
              <div className="space-y-1.5">
                <Label>Se debita de</Label>
                <Controller
                  name="debita_de"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={[{ value: "cuenta", label: "Cuenta bancaria" }, { value: "tarjeta", label: "Tarjeta de crédito" }]}
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || null)}
                      placeholder="Seleccionar…"
                      className="w-full"
                    />
                  )}
                />
              </div>
            )}

            {/* TARJETA + FECHA VENCIMIENTO */}
            {showTarjeta && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tarjeta</Label>
                  <Controller
                    name="tarjeta_id"
                    control={control}
                    render={({ field }) => (
                      <NamedSelect
                        options={tarjetas.map(t => ({ value: t.id, label: t.nombre }))}
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v)}
                        placeholder="Seleccionar…"
                      />
                    )}
                  />
                </div>
                {showFechaVto && (
                  <div className="space-y-1.5">
                    <Label>Fecha vencimiento</Label>
                    <Input type="date" {...register("fecha_vencimiento")} />
                  </div>
                )}
              </div>
            )}

            {/* CUENTA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tipo === "Transferencia" ? "Cuenta origen" : "Cuenta"}</Label>
                <Controller
                  name="cuenta_id"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={cuentas.map(c => ({ value: c.id, label: c.nombre }))}
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v)}
                      placeholder="Seleccionar…"
                    />
                  )}
                />
              </div>

              {/* CUENTA DESTINO (solo Transferencia) */}
              {showCuentaDestino && (
                <div className="space-y-1.5">
                  <Label>Cuenta destino</Label>
                  <Controller
                    name="cuenta_destino_id"
                    control={control}
                    render={({ field }) => (
                      <NamedSelect
                        options={cuentas.map(c => ({ value: c.id, label: c.nombre }))}
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v)}
                        placeholder="Seleccionar…"
                      />
                    )}
                  />
                </div>
              )}
            </div>

            {/* FECHA CONSUMO + CANTIDAD */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha consumo</Label>
                <Input type="date" {...register("fecha")} />
              </div>
              <div className="space-y-1.5">
                <Label>Cantidad</Label>
                <Input type="number" min={1} step={1} {...register("cantidad", { valueAsNumber: true })} />
              </div>
            </div>

            {/* OBSERVACIONES */}
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Input placeholder="Notas adicionales" {...register("observaciones")} />
            </div>

            {/* ── GASTO COMPARTIDO ─────────────────────────────────────── */}
            {tipo === "Egreso" && (
              <>
                <hr className="border-border" />

                {/* Toggle */}
                <div className="flex items-center gap-2.5">
                  <input
                    id="es-compartido"
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    checked={esCompartido}
                    onChange={(e) => {
                      setEsCompartido(e.target.checked);
                      if (e.target.checked) {
                        setGcMiParte(monto > 0 ? monto : 0);
                        setGcMiParteEditada(false);
                        setPagadores([{ personaId: null, nombre: "Vos", montoPagado: monto > 0 ? monto : 0 }]);
                        setPagadoresAutoSync(true);
                      } else {
                        setPagadores([]);
                        setPagadoresAutoSync(true);
                      }
                    }}
                  />
                  <Label htmlFor="es-compartido" className="font-normal cursor-pointer flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Es un gasto compartido
                  </Label>
                </div>

                {esCompartido && (
                  <div className="space-y-4 pl-4 border-l-2 border-border/50">

                    {/* ¿Quién(es) pagó(aron)? */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">¿Quién(es) pagó(aron)?</Label>
                      <div className="space-y-1.5">
                        {pagadores.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2 rounded-md px-3 py-2 border bg-surface border-border text-sm">
                            <span className="flex-1 truncate">{p.nombre}</span>
                            <Input
                              type="number"
                              step="0.01"
                              className="w-28 h-7 text-sm"
                              value={p.montoPagado || ""}
                              onChange={(e) => updatePagadorMonto(idx, parseFloat(e.target.value) || 0)}
                            />
                            {p.personaId !== null && (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => eliminarPagador(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Warning suma pagadores ≠ monto */}
                      {(() => {
                        const sumPag = pagadores.reduce((acc, p) => acc + p.montoPagado, 0);
                        const delta = sumPag - monto;
                        if (Math.abs(delta) > 0.01 && monto > 0) {
                          return (
                            <div className="flex items-start gap-2 rounded-md border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>
                                Suma de pagadores ({formatMonto(sumPag, moneda)}) ≠ total ({formatMonto(monto, moneda)}). Delta: {delta > 0 ? "+" : ""}{formatMonto(delta, moneda)}.
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Agregar otro pagador */}
                      {!showAddPagador ? (
                        <button
                          type="button"
                          onClick={() => setShowAddPagador(true)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Otro pagador
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            list={pagadoresDatalistId}
                            placeholder="Nombre del pagador…"
                            className="flex h-8 flex-1 min-w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={nuevoPagadorNombre}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNuevoPagadorNombre(val);
                              const match = personas.find((p) => p.nombre.toLowerCase() === val.toLowerCase());
                              setNuevoPagadorPersonaId(match?.id ?? null);
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarPagador(); } }}
                          />
                          <datalist id={pagadoresDatalistId}>
                            {personas.map((p) => <option key={p.id} value={p.nombre} />)}
                          </datalist>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Monto…"
                            className="w-28 h-8 text-sm"
                            value={nuevoPagadorMonto || ""}
                            onChange={(e) => setNuevoPagadorMonto(parseFloat(e.target.value) || 0)}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            disabled={!nuevoPagadorNombre.trim() || nuevoPagadorMonto <= 0}
                            onClick={agregarPagador}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => {
                              setShowAddPagador(false);
                              setNuevoPagadorNombre("");
                              setNuevoPagadorPersonaId(null);
                              setNuevoPagadorMonto(0);
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Mi parte + modo toggle */}
                    <div className="space-y-1.5">
                      <Label>Mi parte ({moneda})</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={gcMiParte || ""}
                          className="flex-1"
                          onChange={(e) => {
                            setGcMiParte(parseFloat(e.target.value) || 0);
                            setGcMiParteEditada(true);
                          }}
                        />
                        <button
                          type="button"
                          title={gcMiParteModo === "fijo" ? "Fijo — click para liberar" : "A repartir — click para fijar"}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1.5 rounded-md border text-xs transition-colors",
                            gcMiParteModo === "fijo"
                              ? "bg-amber-900/30 border-amber-700/50 text-amber-300"
                              : "border-border text-muted-foreground hover:border-foreground/40"
                          )}
                          onClick={() => setGcMiParteModo((m) => m === "fijo" ? "a_repartir" : "fijo")}
                        >
                          {gcMiParteModo === "fijo"
                            ? <><Lock className="h-3 w-3" /> Fijo</>
                            : <><Unlock className="h-3 w-3" /> ÷</>}
                        </button>
                      </div>
                    </div>

                    {/* Botones de distribución */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!monto || monto <= 0}
                        onClick={() => {
                          const pendientes = participantes.filter((p) => p.estado === "pendiente");
                          const n = pendientes.length + 1;
                          const parte = Math.round((monto / n) * 100) / 100;
                          setGcMiParte(parte);
                          setGcMiParteEditada(false);
                          setParticipantes((prev) =>
                            prev.map((p) =>
                              p.estado === "pendiente"
                                ? { ...p, monto: parte, montoEditado: false }
                                : p
                            )
                          );
                        }}
                      >
                        Repartir igual
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!monto || monto <= 0}
                        onClick={repartirResto}
                        title="Resta los montos fijos y divide el resto entre los participantes marcados como ÷"
                      >
                        Repartir resto
                      </Button>
                    </div>

                    {/* Cargar grupo */}
                    {grupos.length > 0 && (
                      <div className="space-y-1.5">
                        <Label>Cargar grupo</Label>
                        <NamedSelect
                          options={grupos.map((g) => ({
                            value: g.id,
                            label: `${g.nombre} (${g.miembros.length})`,
                          }))}
                          value=""
                          onValueChange={(grupoId) => {
                            if (!grupoId) return;
                            const grupo = grupos.find((g) => g.id === grupoId);
                            if (!grupo) return;
                            const n = grupo.miembros.length + 1;
                            const parte = monto > 0 ? Math.round((monto / n) * 100) / 100 : 0;
                            if (!gcMiParteEditada) setGcMiParte(parte);
                            const cobrados = participantes.filter((p) => p.estado === "cobrado");
                            const nuevos: ParticipanteForm[] = grupo.miembros.map((m) => ({
                              tempId:          `temp-${m.id}`,
                              persona_nombre:  m.nombre,
                              persona_id:      m.id,
                              monto:           parte,
                              montoEditado:    false,
                              modo:            "a_repartir" as const,
                              estado:          "pendiente" as const,
                              guardarEnAgenda: false,
                            }));
                            setParticipantes([...cobrados, ...nuevos]);
                          }}
                          placeholder="Cargar miembros de un grupo…"
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Lista de participantes */}
                    {participantes.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Participantes</Label>
                        <div className="space-y-1.5">
                          {participantes.map((p) => (
                            <div
                              key={p.tempId}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-2 border text-sm",
                                p.estado === "cobrado"
                                  ? "bg-surface/50 border-border/40 opacity-80"
                                  : "bg-surface border-border"
                              )}
                            >
                              <span className="flex-1 truncate">{p.persona_nombre}</span>
                              {p.estado === "cobrado" ? (
                                <>
                                  <span className="text-xs text-muted-foreground">
                                    {formatMonto(p.monto, moneda)}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">
                                    Cobrado
                                  </span>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    title={p.modo === "fijo" ? "Fijo — click para liberar" : "A repartir — click para fijar"}
                                    className={cn(
                                      "flex items-center px-1.5 py-1 rounded border text-xs transition-colors shrink-0",
                                      p.modo === "fijo"
                                        ? "bg-amber-900/30 border-amber-700/50 text-amber-300"
                                        : "border-border text-muted-foreground hover:border-foreground/40"
                                    )}
                                    onClick={() =>
                                      setParticipantes((prev) =>
                                        prev.map((x) =>
                                          x.tempId === p.tempId
                                            ? { ...x, modo: x.modo === "fijo" ? "a_repartir" : "fijo" }
                                            : x
                                        )
                                      )
                                    }
                                  >
                                    {p.modo === "fijo" ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                  </button>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="w-24 h-7 text-sm"
                                    value={p.monto || ""}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value) || 0;
                                      setParticipantes((prev) =>
                                        prev.map((x) =>
                                          x.tempId === p.tempId
                                            ? { ...x, monto: v, montoEditado: true }
                                            : x
                                        )
                                      );
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() =>
                                      setParticipantes((prev) =>
                                        prev.filter((x) => x.tempId !== p.tempId)
                                      )
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agregar participante */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Agregar participante</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          list={datalistId}
                          placeholder="Nombre…"
                          className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={nuevaNombre}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNuevaNombre(val);
                            const match = personas.find(
                              (p) => p.nombre.toLowerCase() === val.toLowerCase()
                            );
                            setNuevaPersonaId(match?.id ?? null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              agregarParticipante();
                            }
                          }}
                        />
                        <datalist id={datalistId}>
                          {personas.map((p) => (
                            <option key={p.id} value={p.nombre} />
                          ))}
                        </datalist>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!nuevaNombre.trim()}
                          onClick={agregarParticipante}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {nuevaNombre.trim() && !nuevaPersonaId && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="guardar-agenda"
                            className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                            checked={nuevaGuardarEnAgenda}
                            onChange={(e) => setNuevaGuardarEnAgenda(e.target.checked)}
                          />
                          <label
                            htmlFor="guardar-agenda"
                            className="text-xs text-muted-foreground cursor-pointer"
                          >
                            Guardar en mi agenda de personas
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Soft warning: suma de partes ≠ monto total */}
                    {(() => {
                      const sumPartes =
                        gcMiParte +
                        participantes
                          .filter((p) => p.estado === "pendiente")
                          .reduce((acc, p) => acc + p.monto, 0);
                      const delta = Math.abs(sumPartes - monto);
                      if (delta > 0.01 && monto > 0) {
                        return (
                          <div className="flex items-start gap-2 rounded-md border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>
                              La suma de partes ({formatMonto(sumPartes, moneda)}) difiere del
                              total ({formatMonto(monto, moneda)}) por {formatMonto(delta, moneda)}.
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </>
            )}

            {/* ── HACER RECURRENTE ──────────────────────────────── */}
            {tipo === "Egreso" && !editing && (
              <>
                <hr className="border-border" />

                <div className="flex items-center gap-2.5">
                  <input
                    id="crear-recurrente"
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    {...register("crear_recurrente")}
                  />
                  <Label htmlFor="crear-recurrente" className="font-normal cursor-pointer flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    Hacer este movimiento recurrente (mensual)
                  </Label>
                </div>

                {crearRecurrente && (
                  <div className="space-y-3 pl-6 border-l-2 border-border/50">
                    <div className="space-y-1.5">
                      <Label>Nombre de la plantilla</Label>
                      <Input
                        placeholder="ej. Luz Edenor"
                        {...register("nombre_plantilla")}
                      />
                      {errors.nombre_plantilla && (
                        <p className="text-xs text-destructive">{errors.nombre_plantilla.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Día del mes que se debita</Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        className="w-24"
                        {...register("dia_mes_recurrente", { valueAsNumber: true })}
                      />
                      {errors.dia_mes_recurrente && (
                        <p className="text-xs text-destructive">{errors.dia_mes_recurrente.message}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Los próximos meses vas a poder generar este movimiento desde
                      &ldquo;Generar pendientes&rdquo; en /movimientos.
                    </p>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-2">
            {editing && linkedPago && (
              <p className={cn(
                "text-xs px-2 py-1.5 rounded border",
                pagoSeDesvinculara
                  ? "bg-amber-950/30 border-amber-800/40 text-amber-300"
                  : "bg-surface border-border text-muted-foreground",
              )}>
                {pagoSeDesvinculara
                  ? "Al guardar se desvinculará el pago del cliente asociado a este movimiento."
                  : "Este movimiento tiene un pago vinculado. Los cambios de monto y fecha se sincronizarán."}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              {error && <p className="text-xs text-destructive flex-1">{error}</p>}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando…" : editing ? "Guardar cambios" : "Crear"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    )}
    </>
  );
}
