import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// La raíz redirige según si hay sesión activa o no.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
