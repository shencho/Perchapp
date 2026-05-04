// Prompt del intérprete de movimientos en lenguaje natural.

export interface PromptParams {
  userText: string;
  vtoDay: number;
  cuentas: { id: string; nombre: string; moneda: string }[];
  tarjetas: { id: string; nombre: string }[];
  categorias: { id: string; nombre: string; tipo: string; parent_id: string | null }[];
  clientes: { id: string; nombre: string }[];
  servicios: { id: string; cliente_id: string; nombre: string; modalidad: string }[];
  asistente_nombre: string;
  profesion: string;
  combosHistoricos?: string;
}

export interface ParsedMovimiento {
  tipo:              "Ingreso" | "Egreso";
  ambito:            "Personal" | "Profesional";
  cliente_id:        string | null;
  servicio_id:       string | null;
  categoria:         string;
  categoria_id:      string | null;
  subcategoria_id:   string | null;
  concepto:          string;
  descripcion:       string;
  clasificacion:     "Fijo" | "Variable" | "Cuotas";
  frecuencia:        "Corriente" | "No corriente";
  necesidad:         number | null;
  fechaConsumo:      string;
  fechaVencimiento:  string | null;
  cantidad:          number;
  unitario:          number;
  final:             number;
  moneda:            "ARS" | "USD";
  tipoCambio:        number | null;
  metodo:            "Efectivo" | "Transferencia" | "Billetera virtual" | "Crédito" | "Débito automático" | "Débito";
  debitaDe:          "cuenta" | "tarjeta" | null;
  tarjeta:           string;
  tarjeta_id:        string | null;
  cuentaId:          string | null;
  cuotas:            number;
  confianza:         "alta" | "media" | "baja";
  notas:             string;
}

// ── Calendario BA ─────────────────────────────────────────────────────────────

function buildCalendario(): string {
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  // Fecha actual en timezone Buenos Aires
  const baStr = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
  const ba = new Date(baStr);
  const hoy = new Date(ba.getFullYear(), ba.getMonth(), ba.getDate());

  const fmt = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${DIAS[d.getDay()]} ${yy}-${mm}-${dd}`;
  };

  const lines = [`HOY: ${fmt(hoy)}`];
  lines.push("Últimos 7 días:");
  for (let i = 1; i <= 7; i++) {
    const p = new Date(hoy); p.setDate(hoy.getDate() - i);
    lines.push(`  -${i}d: ${fmt(p)}`);
  }
  lines.push("Próximos 7 días:");
  for (let i = 1; i <= 7; i++) {
    const n = new Date(hoy); n.setDate(hoy.getDate() + i);
    lines.push(`  +${i}d: ${fmt(n)}`);
  }
  return lines.join("\n");
}

// ── Formato categorías ────────────────────────────────────────────────────────

function formatCategorias(
  cats: { id: string; nombre: string; tipo: string; parent_id: string | null }[]
): string {
  const padres = cats.filter(c => !c.parent_id);
  const lines: string[] = [];
  for (const p of padres) {
    lines.push(`id="${p.id}" nombre="${p.nombre}" tipo=${p.tipo}`);
    const hijos = cats.filter(c => c.parent_id === p.id);
    for (const h of hijos) {
      lines.push(`  ↳ id="${h.id}" nombre="${h.nombre}" tipo=${h.tipo}`);
    }
  }
  // Categorías sin padre conocido en la lista
  const huerfanas = cats.filter(c => c.parent_id && !cats.find(p => p.id === c.parent_id));
  for (const h of huerfanas) {
    lines.push(`id="${h.id}" nombre="${h.nombre}" tipo=${h.tipo}`);
  }
  return lines.length ? lines.join("\n") : "(sin categorías cargadas)";
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildInterpretPrompt(params: PromptParams): { sys: string; prompt: string } {
  const {
    userText,
    vtoDay,
    cuentas,
    tarjetas,
    categorias,
    clientes,
    servicios,
    asistente_nombre,
    profesion,
    combosHistoricos = "",
  } = params;

  const cuentasStr = cuentas.length
    ? cuentas.map((c) => `id="${c.id}" nombre="${c.nombre}" moneda=${c.moneda}`).join("\n")
    : "(sin cuentas cargadas)";

  const tarjetasStr = tarjetas.length
    ? tarjetas.map((t) => `id="${t.id}" nombre="${t.nombre}"`).join("\n")
    : "(sin tarjetas)";

  const clientesStr = clientes.length
    ? clientes.map((c) => `- "${c.nombre}" (id: ${c.id})`).join("\n")
    : "(sin clientes)";

  const serviciosStr = servicios.length
    ? servicios.map((s) => `- "${s.nombre}" [cliente_id: ${s.cliente_id}, modalidad: ${s.modalidad}] (id: ${s.id})`).join("\n")
    : "(sin servicios)";

  const profesionCtx = profesion ? `El usuario es ${profesion}.` : "";

  const sys = `Sos "${asistente_nombre}", un asistente financiero argentino que interpreta mensajes en rioplatense para registrar movimientos. Respondés SIEMPRE con JSON válido, sin texto extra, sin backticks.`;

  const prompt = `CALENDARIO DE REFERENCIA (usá estas fechas exactas, no calculés por tu cuenta):
${buildCalendario()}

REGLAS DE FECHAS:
- "hoy" → HOY
- "ayer" → -1d de HOY
- "anteayer" / "antes de ayer" → -2d de HOY
- "hace X días" → HOY -X días
- "el lunes" / "lunes pasado" / "el lunes pasado" → el lunes más reciente ANTERIOR a HOY (buscalo en los últimos 7 días)
- "el martes que viene" / "el próximo martes" → el martes más próximo POSTERIOR a HOY (buscalo en los próximos 7 días)
- Igual para todos los demás días de la semana
- Si no se menciona fecha → usá HOY

DÍA DE VENCIMIENTO DE RESUMEN: ${vtoDay}

CUENTAS DEL USUARIO:
${cuentasStr}

TARJETAS DEL USUARIO:
${tarjetasStr}

CATEGORÍAS DEL USUARIO (devolvé categoria_id y subcategoria_id con los IDs exactos de esta lista; si no existe, devolvé null):
${formatCategorias(categorias)}

ÁMBITO DEL MOVIMIENTO:
${profesionCtx}
El campo "ambito" indica si el movimiento es personal o profesional:
- "Personal": gastos o ingresos cotidianos (compras, servicios del hogar, sueldo en relación de dependencia, etc.)
- "Profesional": ingresos por trabajo independiente (cobranzas a clientes, honorarios, facturación) o gastos directamente vinculados a servicios prestados.

Reglas para decidir el ámbito:
1. Si la frase menciona el nombre o apodo de un cliente de la lista → ambito="Profesional", cliente_id=su id.
2. Si usa palabras como "cobré", "me pagó", "facturé", "sesión con", "consulta de", "honorarios", "cliente" → probablemente "Profesional".
3. Si es ambiguo o no hay señales profesionales → ambito="Personal", cliente_id=null, servicio_id=null.

CLIENTES ACTIVOS DEL USUARIO (si la frase menciona uno, vinculalo en cliente_id):
${clientesStr}

SERVICIOS DISPONIBLES (si la frase menciona uno y hay cliente matcheado, vinculalo en servicio_id):
${serviciosStr}

MAESTROS (usá estos valores exactos):
Métodos: Efectivo, Transferencia, Billetera virtual, Crédito, Débito automático, Débito
Clasificaciones: Fijo, Variable, Cuotas
Frecuencias: Corriente, No corriente

${combosHistoricos ? `COMBINACIONES HISTÓRICAS FRECUENTES DEL USUARIO:\n${combosHistoricos}\n` : ""}
REGLAS GENERALES:
- "15 mil" = 15000, "2 palos" = 2000000, "1 luca" = 1000, "1.5k" = 1500, "1 palo" = 1000000
- Si menciona tarjeta o dice "crédito" → método="Crédito", tarjeta=nombre de la tarjeta, tarjeta_id=su id si existe en la lista
- "MP", "Mercado Pago", "Uala", "Modo", "Personal Pay", "Naranja X" = "Billetera virtual"
- "DA" o "débito automático" = "Débito automático"
- Débito automático: si dice "me lo debitan del banco/cuenta" → debitaDe="cuenta". Si dice "por la master/visa/tarjeta" → debitaDe="tarjeta". Si es servicio que típicamente va al banco (luz, gas, prepaga, monotributo) → debitaDe="cuenta"
- Si no especifica método → inferí (alquiler→Transferencia, kiosco/chino→Efectivo o Billetera virtual, supermercado→Débito o Billetera virtual)
- Si es Crédito O (Débito automático + debitaDe=tarjeta) → fechaVencimiento = día ${vtoDay} del mes siguiente al consumo (YYYY-MM-DD)
- Si no cumple eso → fechaVencimiento=null
- Si menciona cuotas (ej "en 12 cuotas") → cuotas=12, clasificacion="Cuotas"
- categoria_id: si la categoría inferida existe en la lista, devolvé su ID exacto. Si no existe → null
- subcategoria_id: igual para subcategoría. Si el concepto coincide con una subcategoría en la lista, devolvé su id
- tarjeta_id: buscá match case-insensitive por nombre en la lista de tarjetas. Si matchea → devolvé su id. Si no → null
- cuentaId (en orden de prioridad):
  1. Si el usuario menciona el nombre de una cuenta → usá ese id
  2. Efectivo → cuenta tipo Efectivo (si hay una sola)
  3. Billetera virtual → cuenta tipo Billetera virtual (si hay una sola)
  4. Transferencia o Débito → cuenta tipo Banco (si hay una sola)
  5. Si ambiguo → null
- MONEDA: "USD", "dólares", "u$s", "verdes" → moneda="USD", tipoCambio=número si se mencionó, sino null. ARS → tipoCambio=null
- confianza: "alta" si todo claro, "media" si inferiste ≥1 campo importante, "baja" si varios son dudosos
- unitario: precio unitario (si hay cuotas: valor por cuota; sino: igual a final/cantidad)
- final: monto total

NECESIDAD (solo para Egresos, escala 1-5):
- 1 Innecesario: capricho puro (vacaciones de lujo, boliches, compras impulsivas caras)
- 2 Prescindible: lindo pero evitable (delivery, indumentaria no urgente, salidas a bares)
- 3 Medio: útil con margen (peluquería, suscripciones de entretenimiento, Spotify)
- 4 Necesario: afecta tu día a día si lo sacás (supermercado, combustible, seguro, internet)
- 5 Esencial: crítico (alquiler, luz/gas/agua, medicina/prepaga, impuestos obligatorios)

INPUT: """${userText}"""

Devolvé SOLO este JSON (sin backticks, sin texto extra):
{
  "tipo": "Egreso" o "Ingreso",
  "ambito": "Personal" o "Profesional",
  "cliente_id": "uuid del cliente si matchea en la lista, sino null",
  "servicio_id": "uuid del servicio si matchea en la lista y hay cliente, sino null",
  "categoria": "nombre de la categoría padre (para mostrar)",
  "categoria_id": "id exacto de la categoría padre si existe en la lista, sino null",
  "subcategoria_id": "id exacto de la subcategoría si existe en la lista, sino null",
  "concepto": "concepto corto (subcategoría o nombre del comercio)",
  "descripcion": "detalle adicional (o vacío)",
  "clasificacion": "Fijo" o "Variable" o "Cuotas",
  "frecuencia": "Corriente" o "No corriente",
  "necesidad": número 1-5 (solo si Egreso, sino null),
  "fechaConsumo": "YYYY-MM-DD",
  "fechaVencimiento": "YYYY-MM-DD" o null,
  "cantidad": 1,
  "unitario": número,
  "final": número,
  "moneda": "ARS" o "USD",
  "tipoCambio": número o null,
  "metodo": "Crédito" o "Débito" o "Efectivo" o "Transferencia" o "Billetera virtual" o "Débito automático",
  "debitaDe": "cuenta" o "tarjeta" (solo si Débito automático) o null,
  "tarjeta": "nombre de tarjeta o vacío",
  "tarjeta_id": "id de tarjeta si matchea en la lista, sino null",
  "cuentaId": "id de cuenta si aplica, sino null",
  "cuotas": 1,
  "confianza": "alta" o "media" o "baja",
  "notas": "breve explicación de qué inferiste y por qué ese nivel de necesidad"
}`;

  return { sys, prompt };
}

export function extractJsonFromResponse(text: string): ParsedMovimiento {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("No se encontró JSON en la respuesta del intérprete");
  return JSON.parse(cleaned.slice(s, e + 1)) as ParsedMovimiento;
}
