import { supabase } from './supabase';

async function firmarUrl(storagePath: string, download: boolean) {
  const { data, error } = await supabase.storage
    .from('fichas_monitoreo')
    .createSignedUrl(storagePath, 300, download ? { download: true } : undefined);
  if (error || !data?.signedUrl) {
    return { url: null, error: `No se pudo generar el enlace del documento: ${error?.message ?? 'error desconocido'}` };
  }
  return { url: data.signedUrl, error: null };
}

export async function abrirFichaPdf(storagePath: string, download: boolean): Promise<string | null> {
  const { url, error } = await firmarUrl(storagePath, download);
  if (!url) return error;
  window.open(url, '_blank');
  return null;
}

export async function obtenerUrlVistaPrevia(storagePath: string): Promise<{ url: string | null; error: string | null }> {
  return firmarUrl(storagePath, false);
}
