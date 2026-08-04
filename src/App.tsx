import { Routes, Route } from 'react-router-dom';
import { useProfile } from './lib/useProfile';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import UploadFicha from './pages/UploadFicha';
import Dashboard from './pages/Dashboard';

export default function App() {
  const { session, profile, loading } = useProfile();

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
      <Routes>
        {profile.role === 'admin' ? (
          <Route path="*" element={<Dashboard />} />
        ) : (
          <Route path="*" element={<UploadFicha profile={profile} />} />
        )}
      </Routes>
    </div>
  );
}
