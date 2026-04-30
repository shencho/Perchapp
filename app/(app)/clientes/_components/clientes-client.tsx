"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Archive, ArchiveRestore, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirm } from "@/components/shared/delete-confirm";
import { ClienteEditor } from "./cliente-editor";
import { archivarCliente, desarchivarCliente } from "@/lib/supabase/actions/clientes";
import type { ClienteConSaldo } from "@/lib/supabase/actions/clientes";
import { cn } from "@/lib/utils";

const TIPO_BADGE: Record<string, string> = {
  Persona:  "bg-blue-900/40 text-blue-300 border-blue-800",
  Empresa:  "bg-purple-900/40 text-purple-300 border-purple-800",
  Familia:  "bg-amber-900/40 text-amber-300 border-amber-800",
};

function formatSaldo(n: number) {
  if (n === 0) return null;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

interface Props {
  clientes: ClienteConSaldo[];
}

export function ClientesClient({ clientes }: Props) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteConSaldo | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [toArchive, setToArchive] = useState<ClienteConSaldo | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const filtrados = clientes.filter((c) => {
    if (!mostrarArchivados && c.archivado) return false;
    if (mostrarArchivados && !c.archivado) return false;
    if (busqueda) return c.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return true;
  });

  const conSaldo = filtrados.filter((c) => c.saldo_pendiente > 0);
  const sinSaldo = filtrados.filter((c) => c.saldo_pendiente === 0);
  const listaMostrada = [...conSaldo, ...sinSaldo];

  function openEdit(c: ClienteConSaldo) {
    setEditingCliente(c);
    setEditorOpen(true);
  }

  function openNew() {
    setEditingCliente(null);
    setEditorOpen(true);
  }

  function confirmArchive(c: ClienteConSaldo) {
    setToArchive(c);
    setArchiveError(null);
    setArchiveOpen(true);
  }

  async function handleArchive() {
    if (!toArchive) return;
    setIsArchiving(true);
    try {
      await archivarCliente(toArchive.id);
      setArchiveOpen(false);
      router.refresh();
    } catch (e) {
      setArchiveError(e instanceof Error ? e.message : "Error al archivar");
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDesarchivar(c: ClienteConSaldo) {
    try {
      await desarchivarCliente(c.id);
      router.refresh();
    } catch {
      // silencioso
    }
  }

  const totalArchivados = clientes.filter((c) => c.archivado).length;
  const totalActivos = clientes.filter((c) => !c.archivado).length;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {totalActivos} activo{totalActivos !== 1 ? "s" : ""}
            {totalArchivados > 0 && ` · ${totalArchivados} archivado${totalArchivados !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo cliente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        <button
          onClick={() => setMostrarArchivados((v) => !v)}
          className={cn(
            "h-8 px-3 rounded-md text-xs font-medium border transition-colors",
            mostrarArchivados
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-muted-foreground border-border hover:text-foreground"
          )}
        >
          {mostrarArchivados ? "Ver activos" : "Ver archivados"}
        </button>
      </div>

      {/* Lista */}
      {listaMostrada.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {mostrarArchivados
            ? "No hay clientes archivados."
            : clientes.length === 0
              ? "Todavía no tenés clientes. Creá el primero."
              : "Ningún cliente coincide con la búsqueda."}
        </div>
      ) : (
        <>
          {/* Tabla desktop */}
          <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Saldo pendiente</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listaMostrada.map((c) => (
                  <tr key={c.id} className="hover:bg-surface/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/clientes/${c.id}`} className="font-medium hover:text-primary transition-colors">
                          {c.nombre}
                        </Link>
                        {c.archivado && (
                          <span className="text-xs px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                            Archivado
                          </span>
                        )}
                        {c.sub_clientes.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            · {c.sub_clientes.length} sub-cliente{c.sub_clientes.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", TIPO_BADGE[c.tipo])}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.saldo_pendiente > 0 ? (
                        <span className="text-amber-400 font-medium">{formatSaldo(c.saldo_pendiente)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Al día</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/clientes/${c.id}`}>
                          <Button size="icon-sm" variant="ghost" title="Ver detalle">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        {!c.archivado && (
                          <>
                            <Button size="icon-sm" variant="ghost" onClick={() => openEdit(c)} title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => confirmArchive(c)}
                              title="Archivar"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {c.archivado && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleDesarchivar(c)}
                            title="Desarchivar"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="flex flex-col gap-2 sm:hidden">
            {listaMostrada.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Link href={`/clientes/${c.id}`} className="font-medium hover:text-primary">
                      {c.nombre}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", TIPO_BADGE[c.tipo])}>
                        {c.tipo}
                      </span>
                      {c.archivado && (
                        <span className="text-xs px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                          Archivado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {c.saldo_pendiente > 0 ? (
                      <span className="text-amber-400 font-medium text-sm">{formatSaldo(c.saldo_pendiente)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Al día</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 border-t border-border pt-2">
                  <Link href={`/clientes/${c.id}`} className="flex-1">
                    <Button size="sm" variant="ghost" className="w-full text-xs">Ver detalle</Button>
                  </Link>
                  {!c.archivado && (
                    <>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => openEdit(c)}>Editar</Button>
                      <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => confirmArchive(c)}>Archivar</Button>
                    </>
                  )}
                  {c.archivado && (
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => handleDesarchivar(c)}>Desarchivar</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ClienteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editingCliente}
      />

      <DeleteConfirm
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="¿Archivar cliente?"
        description={`"${toArchive?.nombre}" dejará de aparecer en la lista. Podés verlo activando "Ver archivados".`}
        onConfirm={handleArchive}
        isDeleting={isArchiving}
      />
      {archiveError && <p className="text-sm text-destructive">{archiveError}</p>}
    </div>
  );
}
