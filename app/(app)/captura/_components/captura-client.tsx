"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RevisionModal } from "./revision-modal";
import type { ParsedMovimiento } from "@/lib/ai/prompts/interpretMovement";
import type { Cuenta, Tarjeta, Categoria, Persona } from "@/types/supabase";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";

// ── Web Speech API types ──────────────────────────────────────────────────────

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onresult: ((event: any) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ── Ejemplos rotativos ────────────────────────────────────────────────────────

const EJEMPLOS = [
  "Gasté 15 mil en el super con débito",
  "Pagué el Netflix con tarjeta de crédito",
  "Me llegó transferencia de 80 palos por el proyecto",
  "Cargué nafta, 25 mil con Mercado Pago",
  "Pagué el alquiler con transferencia, 350 lucas",
  "Compré remedios en la farmacia, 8 mil en efectivo",
  "Me debitaron la prepaga, 45 mil",
];

interface Props {
  asistente_nombre: string;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  clientes: { id: string; nombre: string }[];
  personas: Persona[];
  grupos: GrupoConMiembros[];
}

export function CapturaClient({ asistente_nombre, cuentas, tarjetas, categorias, clientes, personas, grupos }: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedMovimiento | null>(null);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [ejemplos] = useState(() => {
    // Mezclar y tomar 5
    return [...EJEMPLOS].sort(() => Math.random() - 0.5).slice(0, 5);
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Micrófono ─────────────────────────────────────────────────────────────

  const detenerMicrofono = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setEscuchando(false);
  }, []);

  const iniciarMicrofono = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setErrorMsg("Tu navegador no soporta reconocimiento de voz. Usá Chrome o Edge.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-AR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let transcripcion = "";

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          transcripcion += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript;
        }
      }
      setTexto(transcripcion + interimText);

      // Auto-enviar si hay silencio >1.5s
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (transcripcion.trim()) {
          detenerMicrofono();
          // Auto-submit después de 300ms para que el estado se actualice
          setTimeout(() => {
            handleInterpretar(transcripcion.trim());
          }, 300);
        }
      }, 1500);
    };

    recognition.onerror = () => {
      detenerMicrofono();
      setErrorMsg("Error al acceder al micrófono.");
    };

    recognition.onend = () => {
      setEscuchando(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setEscuchando(true);
    setErrorMsg(null);
  }, [detenerMicrofono]);

  function toggleMicrofono() {
    if (escuchando) {
      detenerMicrofono();
    } else {
      iniciarMicrofono();
    }
  }

  // ── Interpretar ───────────────────────────────────────────────────────────

  async function handleInterpretar(textOverride?: string) {
    const input = (textOverride ?? texto).trim();
    if (!input) return;

    setEstado("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Error del servidor");
      }

      setParsed(data.movimiento);
      setRevisionOpen(true);
      setEstado("idle");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al interpretar");
      setEstado("error");
    }
  }

  function handleConfirmed() {
    setTexto("");
    setParsed(null);
    router.push("/movimientos");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const inicial = asistente_nombre.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] px-4 py-8 max-w-xl mx-auto w-full">

      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-3 shadow-lg">
          <span className="text-primary-foreground font-bold text-2xl">{inicial}</span>
        </div>
        <h1 className="text-xl font-semibold">Hola, soy {asistente_nombre}</h1>
        <p className="text-muted-foreground text-sm mt-1 italic">No te cuelgues</p>
        <p className="text-muted-foreground text-sm mt-3">
          Contame en palabras simples qué movimiento querés registrar.
        </p>
      </div>

      {/* Ejemplos sugeridos */}
      <div className="flex flex-wrap gap-2 justify-center mb-6 w-full">
        {ejemplos.map((ejemplo) => (
          <button
            key={ejemplo}
            type="button"
            onClick={() => {
              setTexto(ejemplo);
              textareaRef.current?.focus();
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            {ejemplo}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="w-full space-y-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="ej. Gasté 15 mil en el super con débito..."
            rows={4}
            className={cn(
              "w-full resize-none rounded-xl border bg-card px-4 py-3 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
              "transition-colors",
              escuchando && "border-primary ring-2 ring-primary/30"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleInterpretar();
              }
            }}
          />
          {escuchando && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 text-xs text-primary animate-pulse">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              Escuchando…
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={escuchando ? "default" : "outline"}
            size="sm"
            onClick={toggleMicrofono}
            className={cn("gap-1.5", escuchando && "bg-primary/20 border-primary text-primary")}
          >
            {escuchando ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {escuchando ? "Detener" : "Micrófono"}
          </Button>

          <Button
            type="button"
            onClick={() => handleInterpretar()}
            disabled={!texto.trim() || estado === "loading"}
            className="flex-1 gap-1.5"
          >
            {estado === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Interpretando…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Interpretar
              </>
            )}
          </Button>
        </div>

        {/* Hint teclado */}
        <p className="text-xs text-muted-foreground text-center">
          También podés usar <kbd className="px-1 py-0.5 rounded border border-border text-xs">⌘ Enter</kbd> para enviar
        </p>

        {/* Error */}
        {errorMsg && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Modal de revisión */}
      <RevisionModal
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        parsed={parsed}
        cuentas={cuentas}
        tarjetas={tarjetas}
        categorias={categorias}
        clientes={clientes}
        personas={personas}
        grupos={grupos}
        onConfirmed={handleConfirmed}
      />
    </div>
  );
}
