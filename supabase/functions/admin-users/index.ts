import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Falta token de autenticación" }, 401);

  // Cliente "actor": valida quién llama, usando SU propio token (no el service_role).
  const actorClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: actor },
    error: actorError,
  } = await actorClient.auth.getUser();

  if (actorError || !actor) return json({ error: "Sesión inválida" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: actorProfile } = await admin.from("profiles").select("role").eq("id", actor.id).single();
  if (actorProfile?.role !== "admin") return json({ error: "Solo un administrador puede gestionar usuarios" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  const action = body.action as string;

  try {
    if (action === "list") {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("id, role, ceba_id, nombre, cebas(codigo, nombre)")
        .order("role")
        .order("nombre");
      if (error) throw error;

      const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (authError) throw authError;

      const emailById = new Map(authUsers.users.map((u) => [u.id, u.email]));
      const result = (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? null }));
      return json({ users: result });
    }

    if (action === "create") {
      const { email, password, nombre, role, ceba_id } = body as {
        email: string;
        password: string;
        nombre: string;
        role: "admin" | "especialista" | "director";
        ceba_id: string | null;
      };

      if (!email || !password || !nombre || !role) return json({ error: "Faltan datos obligatorios" }, 400);
      if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
      if (role === "director" && !ceba_id) return json({ error: "Un director necesita una CEBA asignada" }, 400);

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) throw createError;

      const { error: profileError } = await admin
        .from("profiles")
        .insert({ id: created.user.id, role, ceba_id: role === "director" ? ceba_id : null, nombre });
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        throw profileError;
      }

      return json({ id: created.user.id });
    }

    if (action === "reset_password") {
      const { user_id, password } = body as { user_id: string; password: string };
      if (!user_id || !password) return json({ error: "Faltan datos obligatorios" }, 400);
      if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);

      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = body as { user_id: string };
      if (!user_id) return json({ error: "Falta user_id" }, 400);
      if (user_id === actor.id) return json({ error: "No podés eliminar tu propia cuenta" }, 400);

      const { error: profileError } = await admin.from("profiles").delete().eq("id", user_id);
      if (profileError) throw profileError;
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(user_id);
      if (authDeleteError) throw authDeleteError;
      return json({ ok: true });
    }

    return json({ error: "Acción no reconocida" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Error desconocido" }, 500);
  }
});
