import type { Grupo, Persona } from "@/types/supabase";

export type GrupoConMiembros = Grupo & { miembros: Persona[] };
