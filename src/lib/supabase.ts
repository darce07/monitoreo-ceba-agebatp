import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  role: 'admin' | 'especialista' | 'director';
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

export type Monitoreo = {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at: string;
};

export type Ficha = {
  id: string;
  ceba_id: string;
  monitoreo_id: string | null;
  director_id: string | null;
  docente: string;
  docente_id: string | null;
  area: string;
  fecha_monitoreo: string;
  n_monitoreo: string;
  nombre_pdf: string;
  storage_path: string;
  estado: 'Pendiente' | 'Recibido' | 'Observado';
  observaciones: string | null;
  deleted_at: string | null;
  created_at: string;
  titulo: string | null;
};

export type FichaAnexo = {
  id: string;
  ficha_id: string;
  nombre_archivo: string;
  storage_path: string;
  created_at: string;
};

export type Docente = {
  id: string;
  ceba_id: string;
  nombre: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  created_at: string;
};
