import { supabase } from './supabase';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;

export type UsuarioAdmin = {
  id: string;
  role: 'admin' | 'director';
  ceba_id: string | null;
  nombre: string;
  email: string | null;
  cebas: { codigo: string; nombre: string } | null;
};

async function llamar<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sesión no válida');

  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Error desconocido');
  return json as T;
}

export const listarUsuarios = () => llamar<{ users: UsuarioAdmin[] }>('list');

export const crearUsuario = (datos: { email: string; password: string; nombre: string; role: 'admin' | 'director'; ceba_id: string | null }) =>
  llamar<{ id: string }>('create', datos);

export const resetearPassword = (user_id: string, password: string) => llamar<{ ok: true }>('reset_password', { user_id, password });

export const eliminarUsuario = (user_id: string) => llamar<{ ok: true }>('delete', { user_id });
