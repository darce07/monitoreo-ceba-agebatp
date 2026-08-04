import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  role: 'admin' | 'director';
  ceba_id: string | null;
  nombre: string | null;
};

export type Ceba = {
  id: string;
  codigo: string;
  nombre: string;
  director_nombre: string | null;
  correo_institucional: string | null;
};

export type Ficha = {
  id: string;
  ceba_id: string;
  director_id: string | null;
  docente: string;
  area: string;
  fecha_monitoreo: string;
  n_monitoreo: string;
  nombre_pdf: string;
  storage_path: string;
  estado: 'Pendiente' | 'Recibido' | 'Observado';
  observaciones: string | null;
  created_at: string;
};
