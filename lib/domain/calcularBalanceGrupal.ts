// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PagadorInput {
  personaId: string | null  // null = el usuario registrador ("Vos")
  nombre: string
  montoPagado: number
}

export interface ParticipanteConsumoInput {
  personaId: string | null  // null = el usuario registrador
  nombre: string
  montoConsumido: number
}

export interface BalancePersona {
  personaId: string | null
  nombre: string
  pagado: number
  consumido: number
  neto: number             // pagado - consumido: > 0 = acreedor, < 0 = deudor
}

export interface Transferencia {
  deudorId: string | null
  deudorNombre: string
  acreedorId: string | null
  acreedorNombre: string
  monto: number
}

export interface ResultadoBalanceGrupal {
  personas: BalancePersona[]
  transferencias: Transferencia[]
  totalPagado: number
  totalConsumido: number
  hayDesbalance: boolean   // abs(totalPagado - totalConsumido) > 0.01
}

// ── Constantes internas ───────────────────────────────────────────────────────

const USUARIO_KEY = "__usuario__"
const EPSILON = 0.005  // tolerancia para float centavos

function r2(n: number) {
  return Math.round(n * 100) / 100
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Calcula el balance neto de un gasto grupal y las transferencias mínimas
 * necesarias para saldarlo (algoritmo greedy: mayor acreedor con mayor deudor).
 *
 * Pagadores y participantes son INDEPENDIENTES: una persona puede aparecer
 * en uno, en ambos, o en ninguno.
 *
 * Retrocompatibilidad: si pagadores está vacío, se asume que el usuario pagó
 * el monto total (montoTotalFallback). Si también está vacío el monto,
 * totalPagado = totalConsumido y hayDesbalance = false.
 */
export function calcularBalanceGrupal(
  pagadores: PagadorInput[],
  participantes: ParticipanteConsumoInput[],
  montoTotalFallback = 0,
  nombreUsuario = "Vos",
): ResultadoBalanceGrupal {

  // ── Retrocompatibilidad ──────────────────────────────────────────────────
  const pagadoresEfectivos: PagadorInput[] =
    pagadores.length > 0
      ? pagadores
      : [{ personaId: null, nombre: nombreUsuario, montoPagado: montoTotalFallback }]

  // ── Mapa clave → { nombre, pagado, consumido } ───────────────────────────
  // Clave: personaId o USUARIO_KEY para null
  const mapa = new Map<string, { nombre: string; pagado: number; consumido: number }>()

  const key = (id: string | null) => id ?? USUARIO_KEY
  const resolveNombre = (id: string | null, nombre: string) =>
    id === null ? nombreUsuario : nombre

  for (const p of pagadoresEfectivos) {
    const k = key(p.personaId)
    const entry = mapa.get(k)
    if (entry) {
      entry.pagado += p.montoPagado
    } else {
      mapa.set(k, { nombre: resolveNombre(p.personaId, p.nombre), pagado: p.montoPagado, consumido: 0 })
    }
  }

  for (const c of participantes) {
    const k = key(c.personaId)
    const entry = mapa.get(k)
    if (entry) {
      entry.consumido += c.montoConsumido
    } else {
      mapa.set(k, { nombre: resolveNombre(c.personaId, c.nombre), pagado: 0, consumido: c.montoConsumido })
    }
  }

  // ── Calcular neto por persona ─────────────────────────────────────────────
  const personas: BalancePersona[] = []
  for (const [k, v] of mapa.entries()) {
    personas.push({
      personaId: k === USUARIO_KEY ? null : k,
      nombre: v.nombre,
      pagado: r2(v.pagado),
      consumido: r2(v.consumido),
      neto: r2(v.pagado - v.consumido),
    })
  }

  // ── Totales ───────────────────────────────────────────────────────────────
  const totalPagado    = r2(personas.reduce((s, p) => s + p.pagado, 0))
  const totalConsumido = r2(personas.reduce((s, p) => s + p.consumido, 0))
  const hayDesbalance  = Math.abs(totalPagado - totalConsumido) > 0.01

  // ── Algoritmo greedy: minimizar transferencias ────────────────────────────
  // Trabajamos sobre copias mutables del neto
  const acreedores = personas
    .filter(p => p.neto > EPSILON)
    .map(p => ({ personaId: p.personaId, nombre: p.nombre, saldo: p.neto }))
    .sort((a, b) => b.saldo - a.saldo)

  const deudores = personas
    .filter(p => p.neto < -EPSILON)
    .map(p => ({ personaId: p.personaId, nombre: p.nombre, saldo: p.neto }))
    .sort((a, b) => a.saldo - b.saldo)  // más negativo primero

  const transferencias: Transferencia[] = []

  let ia = 0
  let id = 0

  while (ia < acreedores.length && id < deudores.length) {
    const acr = acreedores[ia]
    const deu = deudores[id]

    const monto = r2(Math.min(acr.saldo, Math.abs(deu.saldo)))
    if (monto > EPSILON) {
      transferencias.push({
        deudorId:       deu.personaId,
        deudorNombre:   deu.nombre,
        acreedorId:     acr.personaId,
        acreedorNombre: acr.nombre,
        monto,
      })
    }

    acr.saldo = r2(acr.saldo - monto)
    deu.saldo = r2(deu.saldo + monto)

    if (acr.saldo <= EPSILON) ia++
    if (deu.saldo >= -EPSILON) id++
  }

  return { personas, transferencias, totalPagado, totalConsumido, hayDesbalance }
}

// ── Caso de aceptación del usuario (para verificación manual) ─────────────────
//
// 5 personas, total gasto $210.000
// Pagadores: usuario $85.000, Manu $73.000, Kiti $52.000
// Participantes (a_repartir igual entre 5): $42.000 cada uno
//
// Balance esperado:
//   Usuario:  +$43.000  (acreedor)
//   Manu:     +$31.000  (acreedor)
//   Kiti:     +$10.000  (acreedor)
//   Persona4: -$42.000  (deudor)
//   Persona5: -$42.000  (deudor)
//
// Transferencias mínimas esperadas (4 pasos):
//   Persona4 → Usuario: $42.000
//   Persona5 → Manu:    $31.000
//   Persona5 → Kiti:    $10.000
//   Persona5 → Usuario:  $1.000

export function verificarCasoDeAceptacion(): {
  ok: boolean
  errores: string[]
  resultado: ResultadoBalanceGrupal
} {
  const pagadores: PagadorInput[] = [
    { personaId: null,   nombre: "Vos",     montoPagado: 85_000 },
    { personaId: "manu", nombre: "Manu",    montoPagado: 73_000 },
    { personaId: "kiti", nombre: "Kiti",    montoPagado: 52_000 },
  ]
  const participantes: ParticipanteConsumoInput[] = [
    { personaId: null,    nombre: "Vos",     montoConsumido: 42_000 },
    { personaId: "manu",  nombre: "Manu",    montoConsumido: 42_000 },
    { personaId: "kiti",  nombre: "Kiti",    montoConsumido: 42_000 },
    { personaId: "p4",    nombre: "Persona4", montoConsumido: 42_000 },
    { personaId: "p5",    nombre: "Persona5", montoConsumido: 42_000 },
  ]

  const resultado = calcularBalanceGrupal(pagadores, participantes, 210_000)
  const errores: string[] = []

  // Verificar netos esperados
  const esperados: Record<string, number> = {
    "__usuario__": 43_000,
    "manu": 31_000,
    "kiti": 10_000,
    "p4": -42_000,
    "p5": -42_000,
  }
  for (const p of resultado.personas) {
    const k = p.personaId ?? "__usuario__"
    const esp = esperados[k]
    if (esp === undefined) {
      errores.push(`Persona inesperada: ${p.nombre}`)
    } else if (Math.abs(p.neto - esp) > 0.01) {
      errores.push(`${p.nombre}: neto esperado ${esp}, obtenido ${p.neto}`)
    }
  }

  // Verificar 4 transferencias
  if (resultado.transferencias.length !== 4) {
    errores.push(`Se esperaban 4 transferencias, se obtuvieron ${resultado.transferencias.length}`)
  }

  // Verificar monto total de transferencias = suma de deudas
  const totalTransf = resultado.transferencias.reduce((s, t) => s + t.monto, 0)
  if (Math.abs(totalTransf - 84_000) > 0.01) {
    errores.push(`Total transferencias esperado $84.000, obtenido $${totalTransf}`)
  }

  // Verificar caso edge: pagador que no participa
  const pagadoresEdge: PagadorInput[] = [
    { personaId: null, nombre: "Vos", montoPagado: 50_000 },
  ]
  const participantesEdge: ParticipanteConsumoInput[] = [
    { personaId: "a", nombre: "A", montoConsumido: 20_000 },
    { personaId: "b", nombre: "B", montoConsumido: 15_000 },
    { personaId: "c", nombre: "C", montoConsumido: 15_000 },
  ]
  const resultadoEdge = calcularBalanceGrupal(pagadoresEdge, participantesEdge, 50_000)
  const usuarioEdge = resultadoEdge.personas.find(p => p.personaId === null)
  if (!usuarioEdge || Math.abs(usuarioEdge.neto - 50_000) > 0.01) {
    errores.push(`Edge case pagador-no-participante: neto usuario esperado $50.000, obtenido ${usuarioEdge?.neto}`)
  }
  if (resultadoEdge.transferencias.length !== 3) {
    errores.push(`Edge case: se esperaban 3 transferencias, se obtuvieron ${resultadoEdge.transferencias.length}`)
  }

  return { ok: errores.length === 0, errores, resultado }
}
