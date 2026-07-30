"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from "@/lib/supabase/actions/notificaciones";
import { responderInvitacion } from "@/lib/supabase/actions/conexiones";
import type { Notificacion } from "@/types/supabase";

interface Props {
  notificaciones: Notificacion[];
  className?: string;
}

export function NotificationsBell({ notificaciones, className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  async function handleResponder(n: Notificacion, aceptar: boolean) {
    if (!n.ref_id) return;
    setBusyId(n.id);
    setError(null);
    try {
      await responderInvitacion(n.ref_id, aceptar);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al responder");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeida(n: Notificacion) {
    if (n.leida) return;
    setBusyId(n.id);
    try {
      await marcarNotificacionLeida(n.id);
      router.refresh();
    } catch {
      /* silencioso */
    } finally {
      setBusyId(null);
    }
  }

  async function handleTodas() {
    setBusyId("todas");
    try {
      await marcarTodasLeidas();
      router.refresh();
    } catch {
      /* silencioso */
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Notificaciones"
        aria-label={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ""}`}
        className={cn(
          "relative inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors",
          className,
        )}
      >
        <Bell className="h-5 w-5" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white leading-none">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Notificaciones</DialogTitle>
          </DialogHeader>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {notificaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
              No tenés notificaciones.
            </p>
          ) : (
            <>
              {noLeidas > 0 && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleTodas}
                    disabled={busyId === "todas"}
                  >
                    Marcar todas como leídas
                  </Button>
                </div>
              )}
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border max-h-[60vh] overflow-y-auto">
                {notificaciones.map((n) => {
                  const esInvitacion = n.tipo === "invitacion_recibida";
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "flex flex-col gap-2 px-4 py-3",
                        !n.leida && "bg-primary/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium">{n.titulo}</span>
                          {n.cuerpo && (
                            <span className="text-xs text-muted-foreground">
                              {n.cuerpo}
                            </span>
                          )}
                        </div>
                        {!n.leida && !esInvitacion && (
                          <button
                            type="button"
                            onClick={() => handleLeida(n)}
                            disabled={busyId === n.id}
                            className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                            title="Marcar como leída"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {esInvitacion && !n.leida && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleResponder(n, true)}
                            disabled={busyId === n.id}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Aceptar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResponder(n, false)}
                            disabled={busyId === n.id}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
