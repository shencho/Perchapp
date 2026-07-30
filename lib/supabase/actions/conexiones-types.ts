// Tipos compuestos para la feature de conexiones entre usuarios.

/** Una conexión ya resuelta desde la perspectiva del usuario actual. */
export interface ConexionVista {
  id: string;
  estado: "pendiente" | "aceptada" | "rechazada";
  /** true si el usuario actual es quien envió la invitación. */
  soySolicitante: boolean;
  /** Nombre del OTRO usuario (snapshot guardado en la fila). */
  otroNombre: string | null;
  otroId: string;
  mensaje: string | null;
  createdAt: string;
  respondedAt: string | null;
}
