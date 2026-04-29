import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildInterpretPrompt, extractJsonFromResponse } from "@/lib/ai/prompts/interpretMovement";
import { ANTHROPIC_MODEL } from "@/lib/ai/config";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sesión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener texto del body
    const body = await req.json().catch(() => ({}));
    const text: string = body?.text ?? "";
    if (!text.trim()) {
      return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
    }

    // 3. Cargar contexto del usuario en paralelo
    const [profileRes, cuentasRes, tarjetasRes, categoriasRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("vto_day_default, asistente_nombre, profesion")
        .eq("id", user.id)
        .single(),
      supabase
        .from("cuentas")
        .select("id, nombre, moneda")
        .eq("user_id", user.id)
        .eq("archivada", false),
      supabase
        .from("tarjetas")
        .select("id, nombre")
        .eq("user_id", user.id)
        .eq("archivada", false),
      supabase
        .from("categorias")
        .select("nombre, parent_id")
        .eq("user_id", user.id)
        .eq("archivada", false),
    ]);

    const profile   = profileRes.data;
    const cuentas   = cuentasRes.data   ?? [];
    const tarjetas  = tarjetasRes.data  ?? [];
    const categorias = categoriasRes.data ?? [];

    // Aplanar categorías: "Padre > Hijo" para el prompt
    const catMap = new Map(categorias.map((c) => [c.nombre, c]));
    const categoriasPlanas = categorias.map((c) => {
      if (!c.parent_id) return c.nombre;
      const parent = categorias.find((p) => !p.parent_id && catMap.has(p.nombre));
      // Buscar el padre por id (simplificado: lo buscamos en el array)
      return c.nombre;
    });
    // Eliminar duplicados
    const categoriasUnicas = [...new Set(categoriasPlanas)];

    // 4. Construir prompt
    const { sys, prompt } = buildInterpretPrompt({
      userText:          text,
      vtoDay:            profile?.vto_day_default ?? 10,
      cuentas,
      tarjetas,
      categorias:        categoriasUnicas,
      asistente_nombre:  profile?.asistente_nombre ?? "Perchita",
      profesion:         profile?.profesion ?? "",
    });

    // 5. Llamar a Claude
    const message = await anthropic.messages.create({
      model:      ANTHROPIC_MODEL,
      max_tokens: 1024,
      system:     sys,
      messages:   [{ role: "user", content: prompt }],
    });

    const responseText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    // 6. Parsear y devolver
    const movimiento = extractJsonFromResponse(responseText);
    return NextResponse.json({ movimiento });

  } catch (err) {
    console.error("[/api/interpret]", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
