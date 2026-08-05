import { useState } from 'react';
import { useProfile } from './lib/useProfile';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import UploadFicha from './pages/UploadFicha';
import Dashboard from './pages/Dashboard';
import FichasAdmin from './pages/FichasAdmin';
import Docentes from './pages/Docentes';

const ADMIN_TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'fichas', label: 'Fichas' },
  { id: 'docentes', label: 'Docentes' },
] as const;

type AdminTab = (typeof ADMIN_TABS)[number]['id'];

export default function App() {
  const { session, profile, loading } = useProfile();
  const [tab, setTab] = useState<AdminTab>('resumen');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">Cargando...</div>;
  }

  if (!session) {
    return <Login />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Tu cuenta aún no está asociada a ninguna CEBA. Contacta al especialista de AGEBATP para que te habilite
          el acceso.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-brand-700 text-sm">Monitoreo CEBA · AGEBATP</span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Cerrar sesión
        </button>
      </nav>

      {profile.role === 'admin' ? (
        <>
          <div className="bg-white border-b border-slate-200 px-6 flex gap-1">
            {ADMIN_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 ${
                  tab === t.id
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'resumen' && <Dashboard />}
          {tab === 'fichas' && <FichasAdmin />}
          {tab === 'docentes' && <Docentes />}
        </>
      ) : (
        <UploadFicha profile={profile} />
      )}
    </div>
  );
}
