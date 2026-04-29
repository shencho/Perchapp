"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Profile, Cuenta, Tarjeta, Categoria } from "@/types/supabase";
import { PerfilTab } from "./perfil-tab";
import { CuentasTab } from "./cuentas-tab";
import { TarjetasTab } from "./tarjetas-tab";
import { CategoriasTab } from "./categorias-tab";

interface Props {
  profile: Profile | null;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  profesiones: { nombre: string; slug: string }[];
}

export function AjustesClient({
  profile,
  cuentas,
  tarjetas,
  categorias,
  profesiones,
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
      </Tabs>
    </div>
  );
}
