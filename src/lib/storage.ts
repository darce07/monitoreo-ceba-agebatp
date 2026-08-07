import { supabase } from './supabase';

export async function abrirFichaPdf(storagePath: string, download: boolean) {
  const { data, error } = await supabase.storage
    .from('fichas_monitoreo')
    .createSignedUrl(storagePath, 60, download ? { download: true } : undefined);
  if (error || !data?.signedUrl) {
    alert(`No se pudo generar el enlace del PDF: ${error?.message ?? 'error desconocido'}`);
    return;
  }
  window.open(data.signedUrl, '_blank');
}
