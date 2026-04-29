// Prompt del intérprete de movimientos en lenguaje natural.
// Adaptado del MVP HTML (buildInterpretPrompt).

export interface PromptParams {
  userText: string;
  vtoDay: number;
  cuentas: { id: string; nombre: string; moneda: string }[];
  tarjetas: { id: string; nombre: string }[];
  categorias: string[];
  asistente_nombre: string;
  profesion: string;
  combosHistoricos?: string;
}

export interface ParsedMovimiento {
  tipo:              "Ingreso" | "Egreso";
  categoria:         string;
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
  cuentaId:          string | null;
  cuotas:            number;
  confianza:         "alta" | "media" | "baja";
  notas:             string;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildInterpretPrompt(params: PromptParams): { sys: string; prompt: string } {
  const {
    userText,
    vtoDay,
    cuentas,
    tarjetas,
    categorias,
    asistente_nombre,
    combosHistoricos = "",
  } = params;

  const cuentasStr = cuentas.length
    ? cuentas.map((c) => `id="${c.id}" nombre="${c.nombre}" moneda=${c.moneda}`).join("\n")
    : "(sin cuentas cargadas)";

  const tarjetasStr = tarjetas.length
    ? tarjetas.map((t) => `id="${t.id}" nombre="${t.nombre}"`).join("\n")
    : "(sin tarjetas)";

  const sys = `Sos "${asistente_nombre}", un asistente financiero argentino que interpreta mensajes en rioplatense para registrar movimientos. Respondés SIEMPRE con JSON válido, sin texto extra, sin backticks.`;

  const prompt = `CONTEXTO:
- Fecha actual: ${hoy()}
- Día de vencimiento de resumen: ${vtoDay}

CUENTAS DEL USUARIO:
${cuentasStr}

TARJETAS DEL USUARIO:
${tarjetasStr}

MAESTROS (usá estos valores exactos si corresponde):
Categorías: ${categorias.join(", ")}
Métodos: Efectivo, Transferencia, Billetera virtual, Crédito, Débito automático, Débito
Clasificaciones: Fijo, Variable, Cuotas
Frecuencias: Corriente, No corriente

${combosHistoricos ? `COMBINACIONES HISTÓRICAS FRECUENTES DEL USUARIO (úsalas para inferir):\n${combosHistoricos}\n` : ""}
REGLAS:
- "15 mil" = 15000, "2 palos" = 2000000, "1 luca" = 1000, "1.5k" = 1500, "1 palo" = 1000000
- Si menciona tarjeta o dice "crédito", método="Crédito" y tarjeta=nombre de la tarjeta del usuario (buscá match por nombre o banco)
- "MP", "Mercado Pago", "Uala", "Modo", "Personal Pay", "Naranja X" = "Billetera virtual"
- "DA" o "débito automático" = "Débito automático"
- Débito automático puede debitarse de cuenta bancaria O de tarjeta de crédito. Si dice "me lo debitan del banco" o "cuenta" → debitaDe="cuenta". Si dice "me lo debitan en la master/visa" o "débito automático por tarjeta" → debitaDe="tarjeta" y rellená campo tarjeta. Si no es claro pero hay tarjeta en el mensaje → debitaDe="tarjeta". Si es un servicio que típicamente se debita de banco (luz, gas, prepaga, monotributo) → debitaDe="cuenta".
- Si no especifica método → inferí por el concepto (ej. alquiler→Transferencia, kiosco/chino→Efectivo o Billetera virtual, supermercado→Débito o Billetera virtual)
- Si no hay fecha → usá hoy
- Si es Crédito O (Débito automático + debitaDe=tarjeta) → calculá fechaVencimiento = día ${vtoDay} del mes siguiente al consumo (formato YYYY-MM-DD)
- Si no cumple eso → fechaVencimiento=null
- Si menciona cuotas, detectá el número (ej "en 12 cuotas" → cuotas=12, clasificacion="Cuotas")
- Inferí categoría y concepto del histórico y del sentido común: "chino" → Alimentos / Supermercado, "spotify" → Suscripciones / Streaming, "nafta" → Transporte / Combustible
- cuentaId: buscá el id en la lista de cuentas del usuario según estas reglas (en orden de prioridad):
  1. Si el usuario menciona explícitamente el nombre de una cuenta → usá ese id
  2. Si método=Efectivo → usá el id de la única cuenta tipo Efectivo (siempre existe)
  3. Si método=Billetera virtual → usá el id de la cuenta tipo Billetera virtual si hay una sola
  4. Si método=Transferencia o Débito → usá el id de la cuenta tipo Banco si hay una sola
  5. Si hay ambigüedad o ninguna coincide → cuentaId=null
- MONEDA: si menciona "USD", "dólares", "u$s", "verdes" → moneda="USD". Si menciona tipo de cambio explícito ("a 1200") → tipoCambio=número. Si no menciona TC y es USD → tipoCambio=null. Si es ARS → moneda="ARS", tipoCambio=null.
- confianza: "alta" si TODO claro, "media" si inferiste ≥1 campo importante, "baja" si varios campos son dudosos
- unitario: precio unitario (si hay cuotas, es el valor de cada cuota; si no, igual a final/cantidad)
- final: monto total (= cantidad × unitario si no hay cuotas; si hay cuotas es cantidad × cuotas × unitario)

NECESIDAD (solo para Egresos, escala 1 a 5):
- 1 (Innecesario): capricho puro, postergable sin pensar (vacaciones de lujo, boliches, compras impulsivas de ropa cara)
- 2 (Prescindible): lindo pero evitable (delivery, indumentaria no urgente, regalos opcionales, salidas a bares/restaurantes)
- 3 (Medio): útil con margen (peluquería, lavado auto, suscripciones de entretenimiento, juntadas, Spotify)
- 4 (Necesario): afecta tu día a día si lo sacás (supermercado, combustible, seguro, cuidado personal básico, internet)
- 5 (Esencial): crítico, no podés no pagarlo (alquiler, luz/gas/agua, medicina/prepaga, impuestos obligatorios, alimentos básicos)

INPUT: """${userText}"""

Devolvé SOLO este JSON (sin backticks, sin texto extra):
{
  "tipo": "Egreso" o "Ingreso",
  "categoria": "una de las categorías del maestro, o nueva si no hay match",
  "concepto": "concepto corto (subcategoría o nombre del comercio)",
  "descripcion": "detalle adicional (o vacío)",
  "clasificacion": "Fijo" o "Variable" o "Cuotas",
  "frecuencia": "Corriente" o "No corriente",
  "necesidad": número 1-5 (solo si es Egreso, sino null),
  "fechaConsumo": "YYYY-MM-DD",
  "fechaVencimiento": "YYYY-MM-DD" o null,
  "cantidad": 1,
  "unitario": número en la moneda del movimiento,
  "final": número en la moneda del movimiento,
  "moneda": "ARS" o "USD",
  "tipoCambio": número (solo si moneda=USD y se mencionó) o null,
  "metodo": "Crédito" o "Débito" o "Efectivo" o "Transferencia" o "Billetera virtual" o "Débito automático",
  "debitaDe": "cuenta" o "tarjeta" (solo si método=Débito automático) o null,
  "tarjeta": "nombre de tarjeta del usuario o vacío",
  "cuentaId": "id de cuenta si el usuario la menciona, sino null",
  "cuotas": 1,
  "confianza": "alta" o "media" o "baja",
  "notas": "breve explicación de qué inferiste (incluí por qué le pusiste ese nivel de necesidad)"
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
