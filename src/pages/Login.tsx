import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button, Card, Input, Alert } from "../components/ui";
import { Field } from "../components/form-field";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
    }
  }

  return (
    <div
      className="relative grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950 sm:p-8"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      <Card className="animate-scale-in w-full max-w-[420px] overflow-hidden">
        <div className="h-1.5 w-full bg-[var(--brand)]" />
        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-[var(--brand)] text-lg font-black text-white shadow-lg shadow-teal-900/20">
              U6
            </div>
            <h1 className="font-serif text-xl font-bold text-slate-950 dark:text-white">Monitoreo CEBA</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Plataforma de Monitoreo Pedagógico UGEL 06</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Correo institucional" className="block">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ugel06.gob.pe"
                  className="pl-10"
                />
              </div>
            </Field>

            <Field label="Contraseña" className="block">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
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

            {error && <Alert variant="error">{error}</Alert>}

            <Button type="submit" loading={loading} className="w-full">
              {!loading && (
                <>
                  Iniciar Sesión <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-slate-400">¿Olvidaste tu contraseña? Contacta al especialista de AGEBATP.</p>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-8 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <ShieldCheck className="size-4 text-[var(--brand)]" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Acceso restringido para personal autorizado</span>
        </div>
      </Card>
    </div>
  );
}
