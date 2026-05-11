"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { updateAjustes } from "@/lib/supabase/actions/ajustes";
import type { Profile } from "@/types/supabase";

const MODOS = [
  { value: "personal",     label: "Personal" },
  { value: "profesional",  label: "Profesional" },
  { value: "ambos",        label: "Ambos" },
] as const;

const schema = z.object({
  nombre:           z.string().min(1, "El nombre es requerido"),
  modo:             z.enum(["personal", "profesional", "ambos"]),
  profesion:        z.string().optional(),
  asistente_nombre: z.string().min(1, "El nombre del asistente es requerido"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  profile: Profile | null;
  profesiones: { nombre: string; slug: string }[];
}

export function AjustesPageContent({ profile, profesiones }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:           profile?.nombre ?? "",
      modo:             profile?.modo ?? "personal",
      profesion:        profile?.profesion ?? "",
      asistente_nombre: profile?.asistente_nombre ?? "MANGO AI",
    },
  });

  const modoWatched = watch("modo");
  const showProfesion = modoWatched === "profesional" || modoWatched === "ambos";

  function onSubmit(data: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateAjustes({
          nombre:           data.nombre,
          modo:             data.modo,
          profesion:        data.profesion ?? "",
          asistente_nombre: data.asistente_nombre,
        });
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurá tu cuenta y preferencias.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 max-w-sm">

        {/* Sección: Tu cuenta */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tu cuenta</h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" placeholder="Ej: María" {...register("nombre")} />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Modo de uso</Label>
            <Controller
              name="modo"
              control={control}
              render={({ field }) => (
                <NamedSelect
                  options={MODOS.map(m => ({ value: m.value, label: m.label }))}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                  className="w-full"
                />
              )}
            />
            {errors.modo && <p className="text-xs text-destructive">{errors.modo.message}</p>}
          </div>

          {showProfesion && (
            <div className="flex flex-col gap-1.5">
              <Label>Área profesional</Label>
              <Controller
                name="profesion"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={[
                      { value: "", label: "Sin especificar" },
                      ...profesiones.map(p => ({ value: p.slug, label: p.nombre })),
                    ]}
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v)}
                    className="w-full"
                  />
                )}
              />
            </div>
          )}
        </section>

        {/* Sección: Personalización */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personalización</h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asistente_nombre">Nombre del asistente</Label>
            <Input
              id="asistente_nombre"
              placeholder="MANGO AI"
              {...register("asistente_nombre")}
            />
            <p className="text-xs text-muted-foreground">Así se presenta el asistente de captura de voz.</p>
            {errors.asistente_nombre && (
              <p className="text-xs text-destructive">{errors.asistente_nombre.message}</p>
            )}
          </div>

          {/* TODO PR2: Sección "Apariencia" con toggle dark/light */}
          {/* TODO: Sección "Seguridad" con cambio de contraseña */}
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-green-500">Cambios guardados.</p>}

        <Button type="submit" className="w-fit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}
