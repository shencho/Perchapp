"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePerfil } from "@/lib/supabase/actions/ajustes";
import type { Profile } from "@/types/supabase";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  modo: z.enum(["personal", "profesional", "ambos"]),
  profesion: z.string().min(1, "Seleccioná un área"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  profile: Profile | null;
  profesiones: { nombre: string; slug: string }[];
}

export function PerfilPageContent({ profile, profesiones }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: profile?.nombre ?? "",
      modo: profile?.modo ?? "ambos",
      profesion: profile?.profesion ?? "",
    },
  });

  function onSubmit(data: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updatePerfil(data);
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
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Tu información personal y modo de uso.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">Tu nombre</Label>
          <Input id="nombre" placeholder="Ej: María" {...register("nombre")} />
          {errors.nombre && (
            <p className="text-xs text-destructive">{errors.nombre.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Modo</Label>
          <Controller
            name="modo"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="profesional">Profesional</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.modo && (
            <p className="text-xs text-destructive">{errors.modo.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Área profesional</Label>
          <Controller
            name="profesion"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {profesiones.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.profesion && (
            <p className="text-xs text-destructive">{errors.profesion.message}</p>
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
