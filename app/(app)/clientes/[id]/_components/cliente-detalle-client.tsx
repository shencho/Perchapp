"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Phone, MessageCircle, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClienteEditor } from "../../_components/cliente-editor";
import { ServiciosTab } from "./servicios-tab";
import { RegistrosTab } from "./registros-tab";
import { PagosTab } from "./pagos-tab";
import { SaldoTab } from "./saldo-tab";
import { cn } from "@/lib/utils";
import type { ClienteConSaldo } from "@/lib/supabase/actions/clientes";
import type { ServicioConHistorial } from "@/lib/supabase/actions/servicios";
import type { Cuenta } from "@/types/supabase";

type Tab = "servicios" | "registros" | "pagos" | "saldo";

const TABS: { id: Tab; label: string }[] = [
  { id: "servicios",  label: "Servicios" },
  { id: "registros",  label: "Registros" },
  { id: "pagos",      label: "Pagos" },
  { id: "saldo",      label: "Saldo" },
];

const TIPO_BADGE: Record<string, string> = {
  Persona:  "bg-blue-900/40 text-blue-300 border-blue-800",
  Empresa:  "bg-purple-900/40 text-purple-300 border-purple-800",
  Familia:  "bg-amber-900/40 text-amber-300 border-amber-800",
};

interface Props {
  cliente: ClienteConSaldo;
  serviciosIniciales: ServicioConHistorial[];
  cuentas: Cuenta[];
}

export function ClienteDetalleClient({ cliente, serviciosIniciales, cuentas }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("servicios");
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      {/* Breadcrumb */}
      <Link
        href="/clientes"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        Clientes
      </Link>

      {/* Header del cliente */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">{cliente.nombre}</h1>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                TIPO_BADGE[cliente.tipo]
              )}>
                {cliente.tipo}
              </span>
              {cliente.archivado && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                  Archivado
                </span>
              )}
            </div>

            {/* Contacto */}
            <div className="flex items-center gap-4 flex-wrap">
              {cliente.email && (
                <a href={`mailto:${cliente.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="h-3 w-3" />
                  {cliente.email}
                </a>
              )}
              {cliente.telefono && (
                <a href={`tel:${cliente.telefono}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="h-3 w-3" />
                  {cliente.telefono}
                </a>
              )}
              {cliente.whatsapp && (
                <a
                  href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-green-400 transition-colors"
                >
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </a>
              )}
            </div>

            {/* Sub-clientes */}
            {cliente.sub_clientes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Sub-clientes: {cliente.sub_clientes.map((s) => s.nombre).join(", ")}
              </p>
            )}

            {/* Notas */}
            {cliente.notas && (
              <p className="text-xs text-muted-foreground italic">{cliente.notas}</p>
            )}
          </div>

          <div className="flex gap-1 flex-shrink-0">
            <Button size="icon-sm" variant="ghost" onClick={() => setEditorOpen(true)} title="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Saldo rápido */}
        {cliente.saldo_pendiente > 0 && (
          <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-amber-300">Saldo pendiente</span>
            <span className="text-sm font-semibold text-amber-400">
              {new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 0,
              }).format(cliente.saldo_pendiente)}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      <div>
        {tab === "servicios"  && <ServiciosTab cliente={cliente} serviciosIniciales={serviciosIniciales} />}
        {tab === "registros"  && <RegistrosTab cliente={cliente} servicios={serviciosIniciales} />}
        {tab === "pagos"      && <PagosTab cliente={cliente} cuentas={cuentas} />}
        {tab === "saldo"      && <SaldoTab clienteId={cliente.id} />}
      </div>

      <ClienteEditor open={editorOpen} onOpenChange={setEditorOpen} editing={cliente} />
    </div>
  );
}
