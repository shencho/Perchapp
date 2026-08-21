import { cache } from "react";
import { createClient } from "./server";

/**
 * Auth deduplicada por render.
 *
 * Antes, cada page/layout/action helper abría su propio cliente y llamaba a
 * auth.getUser(), que es una llamada HTTP a Supabase: una sola navegación al
 * dashboard encadenaba 8 getUser() + 3 lecturas del mismo perfil.
 *
 * `cache()` de React memoiza por pase de render, así que layout, page y todos
 * los helpers que corren en el mismo request comparten UNA sola llamada.
 * No persiste entre requests (la auth no debe cachearse entre usuarios).
 */

export const getSupabase = cache(async () => createClient());

/** Usuario autenticado, o null. Una sola llamada de red por render. */
export const getAuthUser = cache(async () => {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export interface PerfilBasico {
  onboarding_completado: boolean | null;
  asistente_nombre: string | null;
  es_admin: boolean | null;
}

/** Fila de `profiles` del usuario actual. Una sola query por render. */
export const getPerfil = cache(async (): Promise<PerfilBasico | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completado, asistente_nombre, es_admin")
    .eq("id", user.id)
    .single();
  return (data as PerfilBasico) ?? null;
});
