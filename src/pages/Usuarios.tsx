import { useEffect, useState } from "react";
import { UserPlus, KeyRound, Trash2 } from "lucide-react";
import { supabase, type Ceba } from "../lib/supabase";
import { listarUsuarios, crearUsuario, resetearPassword, eliminarUsuario, type UsuarioAdmin } from "../lib/adminUsers";
import { Card, Button, Select, Input, Badge, Alert, PageHeader, Skeleton } from "../components/ui";
import { Field } from "../components/form-field";
import { ConfirmDialog } from "../components/confirm-dialog";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"director" | "admin">("director");
  const [cebaId, setCebaId] = useState("");
  const [creando, setCreando] = useState(false);

  const [resetUser, setResetUser] = useState<UsuarioAdmin | null>(null);
  const [nuevaClave, setNuevaClave] = useState("");
  const [reseteando, setReseteando] = useState(false);

  const [borrarUser, setBorrarUser] = useState<UsuarioAdmin | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function cargar() {
    setError(null);
    try {
      const [{ users }, cebasRes] = await Promise.all([listarUsuarios(), supabase.from("cebas").select("*").order("nombre")]);
      setUsuarios(users);
      setCebas((cebasRes.data as Ceba[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la lista de usuarios.");
    }
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    setError(null);
    setOk(null);
    try {
      await crearUsuario({ email, password, nombre, role, ceba_id: role === "director" ? cebaId : null });
      setOk(`Usuario ${email} creado correctamente.`);
      setNombre("");
      setEmail("");
      setPassword("");
      setCebaId("");
      setMostrarAlta(false);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el usuario.");
    }
    setCreando(false);
  }

  async function handleReset() {
    if (!resetUser) return;
    setReseteando(true);
    try {
      await resetearPassword(resetUser.id, nuevaClave);
      setOk(`Contraseña actualizada para ${resetUser.email}.`);
      setResetUser(null);
      setNuevaClave("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    }
    setReseteando(false);
  }

  async function handleEliminar() {
    if (!borrarUser) return;
    setBorrando(true);
    try {
      await eliminarUsuario(borrarUser.id);
      setBorrarUser(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el usuario.");
      setBorrarUser(null);
    }
    setBorrando(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <PageHeader title="Usuarios" description={`${usuarios.length} cuenta(s) registrada(s) — directores y administradores.`} />
        <Button onClick={() => setMostrarAlta((v) => !v)}>
          <UserPlus className="size-4" /> Nuevo usuario
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {ok && <Alert variant="info">{ok}</Alert>}

      {mostrarAlta && (
        <Card className="p-6">
          <form onSubmit={handleCrear} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre completo" className="block">
                <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full" />
              </Field>
              <Field label="Correo institucional" className="block">
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
              </Field>
              <Field label="Contraseña asignada" hint="Mínimo 8 caracteres." className="block">
                <Input required type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" />
              </Field>
              <Field label="Rol" className="block">
                <Select value={role} onChange={(e) => setRole(e.target.value as "director" | "admin")} className="w-full">
                  <option value="director">Director de CEBA</option>
                  <option value="admin">Especialista AGEBATP (admin)</option>
                </Select>
              </Field>
              {role === "director" && (
                <Field label="CEBA asignada" className="block sm:col-span-2">
                  <Select required value={cebaId} onChange={(e) => setCebaId(e.target.value)} className="w-full">
                    <option value="" disabled>
                      Selecciona una CEBA
                    </option>
                    {cebas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} · {c.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setMostrarAlta(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={creando}>
                Crear usuario
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="table-scroll">
          <table className="w-full border-collapse whitespace-nowrap text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">CEBA</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usuarios.map((u) => (
                <tr key={u.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{u.nombre}</td>
                  <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="px-4 py-2">
                    <Badge tone={u.role === "admin" ? "blue" : "slate"}>{u.role === "admin" ? "Especialista AGEBATP" : "Director"}</Badge>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">{u.cebas ? `${u.cebas.codigo} · ${u.cebas.nombre}` : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <button onClick={() => setResetUser(u)} className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-[var(--brand)] dark:hover:bg-teal-950" title="Cambiar contraseña">
                        <KeyRound className="size-[18px]" />
                      </button>
                      <button onClick={() => setBorrarUser(u)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" title="Eliminar usuario">
                        <Trash2 className="size-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {resetUser && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setResetUser(null)}>
          <Card className="w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Cambiar contraseña</h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{resetUser.email}</p>
            <Input type="text" minLength={8} placeholder="Nueva contraseña (mín. 8 caracteres)" value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} autoFocus className="w-full" />
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setResetUser(null)}>
                Cancelar
              </Button>
              <Button loading={reseteando} onClick={handleReset} disabled={nuevaClave.length < 8}>
                Guardar
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!borrarUser}
        onOpenChange={(open) => !open && setBorrarUser(null)}
        title="¿Eliminar usuario?"
        description={`Se eliminará la cuenta de "${borrarUser?.nombre}" (${borrarUser?.email}) por completo. No podrá volver a iniciar sesión.`}
        loading={borrando}
        onConfirm={handleEliminar}
      />
    </div>
  );
}
