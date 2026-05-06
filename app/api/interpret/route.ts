import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildInterpretPrompt, extractJsonFromResponse } from "@/lib/ai/prompts/interpretMovement";
import { buildCatalogoDinamico } from "@/lib/ai/prompts/catalogoDinamico";
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
    const fecha90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [profileRes, cuentasRes, tarjetasRes, categoriasRes, clientesRes, serviciosRes, movimientosRes] = await Promise.all([
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
        .select("id, nombre, tipo, parent_id")
        .eq("user_id", user.id)
        .eq("archivada", false),
      supabase
        .from("clientes")
        .select("id, nombre")
        .eq("user_id", user.id)
        .eq("archivado", false)
        .order("nombre"),
      supabase
        .from("servicios_cliente")
        .select("id, cliente_id, nombre, modalidad")
        .eq("user_id", user.id)
        .eq("archivado", false)
        .order("nombre"),
      supabase
        .from("movimientos")
        .select("concepto, categoria_id")
        .eq("user_id", user.id)
        .gte("fecha", fecha90d)
        .not("concepto", "is", null)
        .limit(500),
    ]);

    const profile    = profileRes.data;
    const cuentas    = cuentasRes.data    ?? [];
    const tarjetas   = tarjetasRes.data   ?? [];
    const categorias = (categoriasRes.data ?? []) as {
      id: string; nombre: string; tipo: string; parent_id: string | null;
    }[];
    const clientes   = (clientesRes.data  ?? []) as { id: string; nombre: string }[];
    const servicios  = (serviciosRes.data ?? []) as {
      id: string; cliente_id: string; nombre: string; modalidad: string;
    }[];
    const movimientos = (movimientosRes.data ?? []) as {
      concepto: string | null; categoria_id: string | null;
    }[];

    // 4. Construir catálogo dinámico y prompt
    const catalogoDinamico = buildCatalogoDinamico(categorias, movimientos);

    const { sys, prompt } = buildInterpretPrompt({
      userText:          text,
      vtoDay:            profile?.vto_day_default ?? 10,
      cuentas,
      tarjetas,
      categorias,
      clientes,
      servicios,
      asistente_nombre:  profile?.asistente_nombre ?? "Perchita",
      profesion:         profile?.profesion ?? "",
      catalogoDinamico,
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
