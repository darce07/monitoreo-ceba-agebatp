import { useEffect, useState } from "react";
import { UserPlus, KeyRound, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase, type Ceba } from "../lib/supabase";
import { listarUsuarios, crearUsuario, resetearPassword, eliminarUsuario, cambiarRol, type UsuarioAdmin } from "../lib/adminUsers";
import { Card, Button, Select, Input, Badge, Alert, PageHeader, Skeleton } from "../components/ui";
import { Field } from "../components/form-field";
import { ConfirmDialog } from "../components/confirm-dialog";
import { useToast } from "../components/toast";

export default function Usuarios() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"director" | "especialista" | "admin">("director");
  const [cebaId, setCebaId] = useState("");
  const [creando, setCreando] = useState(false);

  const [resetUser, setResetUser] = useState<UsuarioAdmin | null>(null);
  const [nuevaClave, setNuevaClave] = useState("");
  const [showNuevaClave, setShowNuevaClave] = useState(false);
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
    try {
      await crearUsuario({ email, password, nombre, role, ceba_id: role === "director" ? cebaId : null });
      toast.success(`Usuario ${email} creado correctamente.`);
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
      toast.success(`Contraseña actualizada para ${resetUser.email}.`);
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
      toast.success("Usuario eliminado.");
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

      {mostrarAlta && (
        <Card className="animate-slide-up p-6">
          <form onSubmit={handleCrear} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre completo" className="block">
                <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full" />
              </Field>
              <Field label="Correo institucional" className="block">
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
              </Field>
              <Field label="Contraseña asignada" hint="Mínimo 8 caracteres." className="block">
                <div className="relative">
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Rol" className="block">
                <Select value={role} onChange={(e) => setRole(e.target.value as "director" | "especialista" | "admin")} className="w-full">
                  <option value="director">Director de CEBA</option>
                  <option value="especialista">Especialista AGEBATP (solo ver)</option>
                  <option value="admin">Administrador (permiso total)</option>
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
                <FilaUsuario
                  key={u.id}
                  usuario={u}
                  cebas={cebas}
                  onRolCambiado={(msg) => {
                    toast.success(msg);
                    cargar();
                  }}
                  onError={setError}
                  onResetPassword={() => setResetUser(u)}
                  onEliminar={() => setBorrarUser(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {resetUser && (
        <div className="animate-fade-in fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setResetUser(null)}>
          <Card className="animate-scale-in w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Cambiar contraseña</h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{resetUser.email}</p>
            <div className="relative">
              <Input
                type={showNuevaClave ? "text" : "password"}
                minLength={8}
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                value={nuevaClave}
                onChange={(e) => setNuevaClave(e.target.value)}
                autoFocus
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNuevaClave((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600"
              >
                {showNuevaClave ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
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

function FilaUsuario({
  usuario,
  cebas,
  onRolCambiado,
  onError,
  onResetPassword,
  onEliminar,
}: {
  usuario: UsuarioAdmin;
  cebas: Ceba[];
  onRolCambiado: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onResetPassword: () => void;
  onEliminar: () => void;
}) {
  const [rolPendiente, setRolPendiente] = useState<"admin" | "especialista" | "director" | null>(null);
  const [cebaPendiente, setCebaPendiente] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function aplicar(role: "admin" | "especialista" | "director", ceba_id: string | null) {
    setGuardando(true);
    try {
      await cambiarRol(usuario.id, role, ceba_id);
      onRolCambiado(`Rol de ${usuario.email} actualizado.`);
      setRolPendiente(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo cambiar el rol.");
    }
    setGuardando(false);
  }

  function handleSelectRol(nuevo: "admin" | "especialista" | "director") {
    if (nuevo === usuario.role) return;
    if (nuevo === "director") {
      setRolPendiente("director");
      setCebaPendiente(usuario.ceba_id ?? "");
      return;
    }
    aplicar(nuevo, null);
  }

  return (
    <tr className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{usuario.nombre}</td>
      <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">{usuario.email}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Select value={usuario.role} onChange={(e) => handleSelectRol(e.target.value as "admin" | "especialista" | "director")} disabled={guardando} className="w-44">
            <option value="director">Director de CEBA</option>
            <option value="especialista">Especialista AGEBATP</option>
            <option value="admin">Administrador</option>
          </Select>
          <Badge tone={usuario.role === "admin" ? "violet" : usuario.role === "especialista" ? "blue" : "slate"}>
            {usuario.role === "admin" ? "Admin" : usuario.role === "especialista" ? "Especialista" : "Director"}
          </Badge>
        </div>
        {rolPendiente === "director" && (
          <div className="mt-2 flex items-center gap-2">
            <Select value={cebaPendiente} onChange={(e) => setCebaPendiente(e.target.value)} className="w-44">
              <option value="" disabled>
                Elegí la CEBA
              </option>
              {cebas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.nombre}
                </option>
              ))}
            </Select>
            <Button size="sm" loading={guardando} disabled={!cebaPendiente} onClick={() => aplicar("director", cebaPendiente)}>
              Guardar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRolPendiente(null)}>
              Cancelar
            </Button>
          </div>
        )}
      </td>
      <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">{usuario.cebas ? `${usuario.cebas.codigo} · ${usuario.cebas.nombre}` : "—"}</td>
      <td className="px-4 py-2 text-right">
        <div className="flex justify-end gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button onClick={onResetPassword} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-teal-50 hover:text-[var(--brand)] dark:hover:bg-teal-950" title="Cambiar contraseña">
            <KeyRound className="size-[18px]" />
          </button>
          <button onClick={onEliminar} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" title="Eliminar usuario">
            <Trash2 className="size-[18px]" />
          </button>
        </div>
      </td>
    </tr>
  );
}
