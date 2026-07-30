"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Notificacion } from "@/types/supabase";

const STORAGE_KEY = "perchapp:notif-toasted";

/**
 * Dispara un toast por cada notificación NO leída que no se haya mostrado
 * todavía en esta sesión/dispositivo (tracked en localStorage). Así el popup
 * no se repite en cada navegación server-side.
 */
export function NotificationsToast({
  notificaciones,
}: {
  notificaciones: Notificacion[];
}) {
  const router = useRouter();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let yaMostradas: string[] = [];
    try {
      yaMostradas = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      yaMostradas = [];
    }
    const yaSet = new Set(yaMostradas);

    const nuevas = notificaciones.filter((n) => !n.leida && !yaSet.has(n.id));
    if (nuevas.length === 0) return;

    for (const n of nuevas) {
      toast(n.titulo, {
        description: n.cuerpo ?? undefined,
        action:
          n.tipo === "invitacion_recibida"
            ? { label: "Ver", onClick: () => router.push("/personas") }
            : undefined,
      });
      yaSet.add(n.id);
    }

    // Conservamos solo los ids todavía relevantes (los no leídos actuales)
    // más los nuevos, para que el storage no crezca sin límite.
    const relevantes = notificaciones.map((n) => n.id);
    const aGuardar = Array.from(yaSet).filter((id) => relevantes.includes(id));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(aGuardar));
    } catch {
      /* ignore */
    }
  }, [notificaciones, router]);

  return null;
}
