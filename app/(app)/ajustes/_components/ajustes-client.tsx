"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Profile, Cuenta, Tarjeta, Categoria, Persona, PlantillaRecurrente } from "@/types/supabase";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import { PerfilTab } from "./perfil-tab";
import { CuentasTab } from "./cuentas-tab";
import { TarjetasTab } from "./tarjetas-tab";
import { CategoriasTab } from "./categorias-tab";
import { PersonasGruposTab } from "./personas-grupos-tab";
import { PlantillasTab } from "./plantillas-tab";

interface Props {
  profile: Profile | null;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  profesiones: { nombre: string; slug: string }[];
  personas: Persona[];
  grupos: GrupoConMiembros[];
  clientes: { id: string; nombre: string }[];
  servicios: { id: string; cliente_id: string; nombre: string }[];
  plantillas: PlantillaRecurrente[];
}

export function AjustesClient({
  profile,
  cuentas,
  tarjetas,
  categorias,
  profesiones,
  personas,
  grupos,
  clientes,
  servicios,
  plantillas,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurá tu cuenta y herramientas.
        </p>
      </div>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="cuentas">Cuentas</TabsTrigger>
          <TabsTrigger value="tarjetas">Tarjetas</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="personas">Personas y grupos</TabsTrigger>
          <TabsTrigger value="plantillas">Recurrentes</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <PerfilTab profile={profile} profesiones={profesiones} />
        </TabsContent>

        <TabsContent value="cuentas" className="mt-6">
          <CuentasTab cuentas={cuentas} />
        </TabsContent>

        <TabsContent value="tarjetas" className="mt-6">
          <TarjetasTab tarjetas={tarjetas} cuentas={cuentas} />
        </TabsContent>

        <TabsContent value="categorias" className="mt-6">
          <CategoriasTab categorias={categorias} />
        </TabsContent>

        <TabsContent value="personas" className="mt-6">
          <PersonasGruposTab personas={personas} grupos={grupos} />
        </TabsContent>

        <TabsContent value="plantillas" className="mt-6">
          <PlantillasTab
            plantillas={plantillas}
            cuentas={cuentas}
            tarjetas={tarjetas}
            categorias={categorias}
            clientes={clientes}
            servicios={servicios}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
