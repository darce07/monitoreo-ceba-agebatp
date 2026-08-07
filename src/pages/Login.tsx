import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
    }
  }

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface min-h-screen flex flex-col relative antialiased">
      <main className="flex-grow flex items-center justify-center p-4 sm:p-8 z-10">
        <div className="w-full max-w-[420px] bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-primary" />
          <div className="p-8 sm:p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center mb-4 text-on-primary font-bold text-headline-lg">
                U6
              </div>
              <h1 className="text-headline-md text-primary tracking-tight">Monitoreo CEBA</h1>
              <p className="text-body-sm text-on-surface-variant mt-1">Plataforma de Monitoreo Pedagógico UGEL 06</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-label-md text-on-surface mb-1" htmlFor="email">
                  Correo institucional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@ugel06.gob.pe"
                    className="w-full h-10 pl-10 pr-3 bg-surface border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md transition-colors placeholder:text-outline/70"
                  />
                </div>
              </div>

              <div>
                <label className="block text-label-md text-on-surface mb-1" htmlFor="password">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-10 bg-surface border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md transition-colors placeholder:text-outline/70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-outline hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-body-sm text-error">{error}</p>}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 flex items-center justify-center gap-2 bg-primary text-on-primary text-label-md rounded-md hover:bg-surface-tint active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm"
                >
                  <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>
              <p className="text-label-sm text-on-surface-variant text-center">
                ¿Olvidaste tu contraseña? Contacta al especialista de AGEBATP.
              </p>
            </form>
          </div>

          <div className="bg-surface-container-low px-8 py-4 border-t border-outline-variant flex items-center justify-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            <span className="text-label-sm text-on-surface-variant">Acceso restringido para personal autorizado</span>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 px-4 z-10 flex flex-col items-center justify-center gap-1 border-t border-outline-variant/30 bg-surface/50 backdrop-blur-sm">
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">
          Unidad de Gestión Educativa Local N° 06
        </p>
      </footer>
    </div>
  );
}
