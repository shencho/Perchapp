"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, X, Link2, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  buscarUsuarioPorEmail,
  enviarInvitacion,
  responderInvitacion,
  eliminarConexion,
} from "@/lib/supabase/actions/conexiones";
import type { ConexionVista } from "@/lib/supabase/actions/conexiones-types";

interface Props {
  conexiones: ConexionVista[];
  recibidas: ConexionVista[];
  enviadas: ConexionVista[];
}

type Encontrado = { id: string; nombre: string | null };

export function ConexionesSection({ conexiones, recibidas, enviadas }: Props) {
  const router = useRouter();

  // Estado del diálogo de invitación
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [encontrado, setEncontrado] = useState<Encontrado | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de acciones sobre filas
  const [busyId, setBusyId] = useState<string | null>(null);

  function resetInvite() {
    setEmail("");
    setMensaje("");
    setEncontrado(null);
    setNoExiste(false);
    setError(null);
  }

  function openInvite() {
    resetInvite();
    setShowInvite(true);
  }

  async function handleBuscar() {
    const clean = email.trim();
    if (!clean) { setError("Ingresá un email"); return; }
    setBuscando(true);
    setError(null);
    setNoExiste(false);
    setEncontrado(null);
    try {
      const res = await buscarUsuarioPorEmail(clean);
      if (res) setEncontrado(res);
      else setNoExiste(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al buscar");
    } finally {
      setBuscando(false);
    }
  }

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!encontrado) { handleBuscar(); return; }
    setEnviando(true);
    setError(null);
    try {
      await enviarInvitacion(encontrado.id, encontrado.nombre, mensaje);
      setShowInvite(false);
      resetInvite();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setEnviando(false);
    }
  }

  async function handleResponder(id: string, aceptar: boolean) {
    setBusyId(id);
    try {
      await responderInvitacion(id, aceptar);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleEliminar(id: string) {
    setBusyId(id);
    try {
      await eliminarConexion(id);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Conexiones</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vinculá tu cuenta con otros usuarios de Perchapp para compartir deudas.
          </p>
        </div>
        <Button size="sm" onClick={openInvite}>
          <UserPlus className="h-4 w-4 mr-1" />
          Invitar
        </Button>
      </div>

      {/* Invitaciones recibidas */}
      {recibidas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Invitaciones recibidas
          </p>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-primary/30 bg-primary/5">
            {recibidas.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium">
                    {c.otroNombre ?? "Alguien"} te quiere conectar
                  </span>
                  {c.mensaje && (
                    <span className="text-xs text-muted-foreground truncate">
                      &ldquo;{c.mensaje}&rdquo;
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button size="sm" onClick={() => handleResponder(c.id, true)} disabled={busyId === c.id}>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Aceptar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleResponder(c.id, false)} disabled={busyId === c.id}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conectados */}
      {conexiones.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {conexiones.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                <span className="text-sm font-medium truncate">{c.otroNombre ?? "Usuario"}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-success/10 text-[11px] text-success border border-success/20">
                  Conectado
                </span>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => handleEliminar(c.id)}
                disabled={busyId === c.id}
                title="Eliminar conexión"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Invitaciones enviadas */}
      {enviadas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Enviadas (pendientes)</p>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {enviadas.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{c.otroNombre ?? "Usuario"}</span>
                  <span className="text-xs text-muted-foreground">esperando respuesta</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEliminar(c.id)}
                  disabled={busyId === c.id}
                >
                  Cancelar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {conexiones.length === 0 && recibidas.length === 0 && enviadas.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
          Todavía no tenés conexiones. Invitá a alguien por su email.
        </p>
      )}

      {/* Diálogo de invitación */}
      <FormDialog
        open={showInvite}
        onOpenChange={(v) => { setShowInvite(v); if (!v) resetInvite(); }}
        title="Invitar a conectar"
        description="Buscá a la persona por el email con el que se registró en Perchapp."
        onSubmit={handleEnviar}
        isSubmitting={enviando || buscando}
        submitLabel={encontrado ? "Enviar invitación" : "Buscar"}
      >
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            autoFocus
            placeholder="persona@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEncontrado(null);
              setNoExiste(false);
            }}
          />
        </div>

        {encontrado && (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2">
            <Check className="h-4 w-4 text-success flex-shrink-0" />
            <span className="text-sm">
              Encontramos a <strong>{encontrado.nombre ?? "este usuario"}</strong>
            </span>
          </div>
        )}

        {noExiste && (
          <p className="text-xs text-muted-foreground">
            Esa persona todavía no usa Perchapp.
          </p>
        )}

        {encontrado && (
          <div className="flex flex-col gap-1.5">
            <Label>Mensaje <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input
              placeholder="Ej: para dividir los gastos del viaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </FormDialog>
    </div>
  );
}
