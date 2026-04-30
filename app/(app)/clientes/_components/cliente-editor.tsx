"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { createCliente, updateCliente } from "@/lib/supabase/actions/clientes";
import type { ClienteConSaldo } from "@/lib/supabase/actions/clientes";

const TIPOS = ["Persona", "Empresa", "Familia"] as const;

const schema = z.object({
  nombre:   z.string().min(1, "El nombre es requerido"),
  tipo:     z.enum(TIPOS),
  email:    z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  notas:    z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: ClienteConSaldo | null;
}

export function ClienteEditor({ open, onOpenChange, editing }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [subClientes, setSubClientes] = useState<string[]>(
    editing ? editing.sub_clientes.map((s) => s.nombre) : []
  );

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          nombre:   editing.nombre,
          tipo:     editing.tipo,
          email:    editing.email ?? "",
          telefono: editing.telefono ?? "",
          whatsapp: editing.whatsapp ?? "",
          notas:    editing.notas ?? "",
        }
      : { nombre: "", tipo: "Persona", email: "", telefono: "", whatsapp: "", notas: "" },
  });

  const tipo = watch("tipo");

  function handleOpen(v: boolean) {
    if (!v) {
      reset();
      setSubClientes(editing ? editing.sub_clientes.map((s) => s.nombre) : []);
      setActionError(null);
    }
    onOpenChange(v);
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const payload = {
        nombre:   data.nombre,
        tipo:     data.tipo,
        email:    data.email || null,
        telefono: data.telefono || null,
        whatsapp: data.whatsapp || null,
        notas:    data.notas || null,
      };

      if (editing) {
        await updateCliente(editing.id, payload);
      } else {
        await createCliente({
          ...payload,
          sub_clientes: subClientes.filter(Boolean).map((n) => ({ nombre: n })),
        });
      }
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  }

  function addSubCliente() {
    setSubClientes((prev) => [...prev, ""]);
  }

  function updateSubCliente(idx: number, value: string) {
    setSubClientes((prev) => prev.map((v, i) => (i === idx ? value : v)));
  }

  function removeSubCliente(idx: number) {
    setSubClientes((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpen}
      title={editing ? "Editar cliente" : "Nuevo cliente"}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
    >
      <div className="flex flex-col gap-4">
        {/* Nombre + Tipo */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label htmlFor="cli-nombre">Nombre</Label>
            <Input
              id="cli-nombre"
              placeholder="Ej: María García"
              autoFocus
              {...register("nombre")}
            />
            {errors.nombre && (
              <p className="text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 w-36">
            <Label>Tipo</Label>
            <NamedSelect
              options={TIPOS.map((t) => ({ value: t, label: t }))}
              value={tipo}
              onValueChange={(v) => v && reset({ ...watch(), tipo: v as typeof TIPOS[number] })}
              className="w-full"
            />
          </div>
        </div>

        {/* Contacto */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cli-email">Email</Label>
            <Input id="cli-email" type="email" placeholder="mail@ejemplo.com" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cli-tel">Teléfono</Label>
            <Input id="cli-tel" placeholder="+54 9 11..." {...register("telefono")} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cli-wa">WhatsApp</Label>
          <Input id="cli-wa" placeholder="+54 9 11..." {...register("whatsapp")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cli-notas">Notas</Label>
          <textarea
            id="cli-notas"
            rows={2}
            placeholder="Notas internas sobre el cliente"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            {...register("notas")}
          />
        </div>

        {/* Sub-clientes (solo Familia, solo al crear) */}
        {tipo === "Familia" && !editing && (
          <div className="flex flex-col gap-2 border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Sub-clientes
              </Label>
              <Button type="button" size="sm" variant="ghost" onClick={addSubCliente} className="h-6 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Agregar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ej: Familia López → sub-clientes Lucía y Tomás
            </p>
            {subClientes.map((nombre, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder={`Sub-cliente ${idx + 1}`}
                  value={nombre}
                  onChange={(e) => updateSubCliente(idx, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => removeSubCliente(idx)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      </div>
    </FormDialog>
  );
}
