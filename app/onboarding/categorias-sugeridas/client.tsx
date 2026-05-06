"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ImportarTemplateModal } from "@/app/(app)/ajustes/_components/importar-template-modal";
import type { Categoria } from "@/types/supabase";
import { Sparkles } from "lucide-react";

interface Props {
  categorias: Categoria[];
}

export function CategoriasSuperidasClient({ categorias }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">¡Ya estás dentro!</h1>
          <p className="text-sm text-muted-foreground">
            Podés importar categorías predefinidas para empezar a registrar movimientos más rápido, o ir directo al dashboard y crearlas después.
          </p>
        </div>
        <div className="flex flex-col w-full gap-3">
          <Button onClick={() => setModalOpen(true)} className="w-full">
            Ver categorías sugeridas
          </Button>
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="w-full">
            Más tarde
          </Button>
        </div>
      </div>

      <ImportarTemplateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        categorias={categorias}
        onDone={() => router.push("/dashboard")}
      />
    </div>
  );
}
