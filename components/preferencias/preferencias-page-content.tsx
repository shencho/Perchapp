"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePreferencias } from "@/lib/supabase/actions/ajustes";
import type { Profile } from "@/types/supabase";

const schema = z.object({
  asistente_nombre: z.string().min(1, "El nombre del asistente es requerido"),
  vto_day_default: z.number().int().min(1).max(31),
});

type FormData = z.infer<typeof schema>;

interface Props {
  profile: Profile | null;
}

export function PreferenciasPageContent({ profile }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      asistente_nombre: profile?.asistente_nombre ?? "Perchita",
      vto_day_default: profile?.vto_day_default ?? 10,
    },
  });

  function onSubmit(data: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updatePreferencias(data);
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Preferencias</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurá el comportamiento de la app.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asistente_nombre">Nombre del asistente</Label>
          <Input
            id="asistente_nombre"
            placeholder="Perchita"
            {...register("asistente_nombre")}
          />
          <p className="text-xs text-muted-foreground">Cómo se llama el asistente de captura de voz.</p>
          {errors.asistente_nombre && (
            <p className="text-xs text-destructive">{errors.asistente_nombre.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vto_day_default">Día de vencimiento default (tarjetas)</Label>
          <Input
            id="vto_day_default"
            type="number"
            min={1}
            max={31}
            placeholder="10"
            className="w-24"
            {...register("vto_day_default", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">Día del mes (1–31) que usás por defecto en tarjetas.</p>
          {errors.vto_day_default && (
            <p className="text-xs text-destructive">{errors.vto_day_default.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-green-500">Cambios guardados.</p>}

        <Button type="submit" className="w-fit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}
