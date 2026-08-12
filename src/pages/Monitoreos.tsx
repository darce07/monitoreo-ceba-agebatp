import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { supabase, type Monitoreo, type Profile } from "../lib/supabase";
import { Card, Button, Input, Alert, PageHeader, EmptyState, Skeleton, Badge } from "../components/ui";
import { Field } from "../components/form-field";
import { ConfirmDialog } from "../components/confirm-dialog";

export default function Monitoreos() {
  const profile = useOutletContext<Profile>();
  const [monitoreos, setMonitoreos] = useState<Monitoreo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editando, setEditando] = useState<Monitoreo | null>(null);
  const [creando, setCreando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [borrar, setBorrar] = useState<Monitoreo | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function cargar() {
    setError(null);
    const { data, error } = await supabase.from("monitoreos_pedagogicos").select("*").order("orden");
    if (error) setError("No se pudo cargar la lista de monitoreos.");
    setMonitoreos((data as Monitoreo[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    setEditando(null);
    setCodigo("");
    setNombre("");
    setCreando(true);
  }

  function abrirEditar(m: Monitoreo) {
    setEditando(m);
    setCodigo(m.codigo);
    setNombre(m.nombre);
    setCreando(true);
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    if (editando) {
      const { error } = await supabase.from("monitoreos_pedagogicos").update({ codigo: codigo.trim(), nombre: nombre.trim() }).eq("id", editando.id);
      if (error) setError(error.message);
    } else {
      const siguienteOrden = monitoreos.length ? Math.max(...monitoreos.map((m) => m.orden)) + 1 : 1;
      const { error } = await supabase.from("monitoreos_pedagogicos").insert({ codigo: codigo.trim(), nombre: nombre.trim(), orden: siguienteOrden });
      if (error) setError(error.message);
    }
    setGuardando(false);
    setCreando(false);
    cargar();
  }

  async function alternarActivo(m: Monitoreo) {
    await supabase.from("monitoreos_pedagogicos").update({ activo: !m.activo }).eq("id", m.id);
    cargar();
  }

  async function confirmarEliminar() {
    if (!borrar) return;
    setBorrando(true);
    const { error } = await supabase.from("monitoreos_pedagogicos").delete().eq("id", borrar.id);
    setBorrando(false);
    setBorrar(null);
    if (error) setError(`No se pudo eliminar: si ya hay fichas usando este monitoreo, desactivalo en vez de borrarlo.`);
    cargar();
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <PageHeader title="Monitoreos Pedagógicos" description="Definí el cronograma de monitoreos que los directores eligen al subir una ficha." />
        {profile.role !== "director" && (
          <Button onClick={abrirNuevo}>
            <Plus className="size-4" /> Nuevo monitoreo
          </Button>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {monitoreos.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" />} title="Sin monitoreos" description="Todavía no creaste ningún monitoreo pedagógico." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {monitoreos.map((m) => (
            <Card key={m.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{m.nombre}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{m.codigo}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => alternarActivo(m)}>
                  <Badge tone={m.activo ? "green" : "slate"}>{m.activo ? "Activo" : "Inactivo"}</Badge>
                </button>
                <button onClick={() => abrirEditar(m)} className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-[var(--brand)] dark:hover:bg-teal-950" title="Editar">
                  <Pencil className="size-4" />
                </button>
                <button onClick={() => setBorrar(m)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" title="Eliminar">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {creando && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setCreando(false)}>
          <Card className="w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{editando ? "Editar monitoreo" : "Nuevo monitoreo"}</h3>
            <div className="space-y-3">
              <Field label="Código corto" hint="Se usa en el nombre del archivo. Ej: M01, 1T2026." className="block">
                <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus className="w-full" />
              </Field>
              <Field label="Nombre" hint="Lo que ve el director al elegir." className="block">
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full" />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setCreando(false)}>
                Cancelar
              </Button>
              <Button loading={guardando} disabled={!codigo.trim() || !nombre.trim()} onClick={guardar}>
                Guardar
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!borrar}
        onOpenChange={(open) => !open && setBorrar(null)}
        title="¿Eliminar monitoreo?"
        description={`Se eliminará "${borrar?.nombre}" del catálogo. Si alguna ficha ya lo usa, mejor desactivalo en vez de borrarlo.`}
        loading={borrando}
        onConfirm={confirmarEliminar}
      />
    </div>
  );
}
