"use client";

import { useState, useTransition } from "react";
import { createProfile, type OnboardingData } from "@/lib/supabase/actions/createProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROFESIONES = [
  { slug: "psicopedagogia", label: "Psicopedagogía" },
  { slug: "coaching",       label: "Coaching"       },
  { slug: "consultoria",    label: "Consultoría"    },
  { slug: "profesor",       label: "Profesor/a"     },
  { slug: "generico",       label: "Otro"           },
];

const MODOS = [
  { value: "personal",     label: "Personal",     desc: "Gestiono mis finanzas personales" },
  { value: "profesional",  label: "Profesional",  desc: "Gestiono mi actividad laboral"   },
  { value: "ambos",        label: "Ambos",         desc: "Personal y profesional juntos"   },
] as const;

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<OnboardingData>({
    nombre: "",
    profesion: "",
    modo: "ambos",
    asistente_nombre: "Perchita",
  });

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function canAdvance() {
    if (step === 1) return form.nombre.trim().length > 0;
    if (step === 2) return form.profesion.length > 0;
    if (step === 3) return form.modo.length > 0;
    if (step === 4) return form.asistente_nombre.trim().length > 0;
    return false;
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createProfile(form);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error");
      }
    });
  }

  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">P</span>
          </div>
          <h1 className="text-xl font-semibold">Configurá tu cuenta</h1>
          <p className="text-sm text-muted-foreground">Paso {step} de {TOTAL_STEPS}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full mb-8">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-6">
          {/* Step 1 — Nombre */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-semibold tracking-tight">¿Cómo te llamás?</h2>
                <p className="text-sm text-muted-foreground">Tu nombre o como preferís que te llame el asistente.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: María"
                  autoFocus
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && canAdvance() && next()}
                />
              </div>
            </div>
          )}

          {/* Step 2 — Profesión */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-semibold tracking-tight">¿A qué te dedicás?</h2>
                <p className="text-sm text-muted-foreground">Elegí la opción que mejor describe tu actividad.</p>
              </div>
              <div className="flex flex-col gap-2">
                {PROFESIONES.map((prof) => (
                  <button
                    key={prof.slug}
                    type="button"
                    onClick={() => setForm({ ...form, profesion: prof.slug })}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      form.profesion === prof.slug
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    {prof.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Modo */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-semibold tracking-tight">¿Para qué usás Perchapp?</h2>
                <p className="text-sm text-muted-foreground">Podés cambiar esto después en tu perfil.</p>
              </div>
              <div className="flex flex-col gap-2">
                {MODOS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm({ ...form, modo: m.value })}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      form.modo === m.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <p className={`text-sm font-medium ${form.modo === m.value ? "text-primary" : ""}`}>{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Asistente */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-semibold tracking-tight">¿Cómo llamás a tu asistente?</h2>
                <p className="text-sm text-muted-foreground">Es el nombre con el que vas a hablarle dentro de la app.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="asistente">Nombre del asistente</Label>
                <Input
                  id="asistente"
                  placeholder="Perchita"
                  autoFocus
                  value={form.asistente_nombre}
                  onChange={(e) => setForm({ ...form, asistente_nombre: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && canAdvance() && handleSubmit()}
                />
              </div>
              <p className="text-xs text-muted-foreground">Por defecto: Perchita</p>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={back}
                disabled={isPending}
              >
                Atrás
              </Button>
            )}
            {step < TOTAL_STEPS ? (
              <Button
                type="button"
                className="flex-1"
                onClick={next}
                disabled={!canAdvance()}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1"
                onClick={handleSubmit}
                disabled={!canAdvance() || isPending}
              >
                {isPending ? "Configurando..." : "Empezar"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
