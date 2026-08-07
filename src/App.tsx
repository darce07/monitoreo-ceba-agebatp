import { useState } from 'react';
import { useProfile } from './lib/useProfile';
import Login from './pages/Login';
import UploadFicha from './pages/UploadFicha';
import Dashboard from './pages/Dashboard';
import FichasAdmin from './pages/FichasAdmin';
import Docentes from './pages/Docentes';
import AdminShell, { type AdminTab } from './components/AdminShell';

const TAB_TITLES: Record<AdminTab, string> = {
  resumen: 'Plataforma de Monitoreo Pedagógico',
  fichas: 'Gestión de Fichas',
  docentes: 'Directorio de Docentes',
};

export default function App() {
  const { session, profile, loading } = useProfile();
  const [tab, setTab] = useState<AdminTab>('resumen');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-body-sm text-on-surface-variant bg-background">
        Cargando...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <p className="text-body-sm text-on-surface-variant text-center max-w-sm">
          Tu cuenta aún no está asociada a ninguna CEBA. Contacta al especialista de AGEBATP para que te habilite
          el acceso.
        </p>
      </div>
    );
  }

  if (profile.role === 'admin') {
    return (
      <AdminShell tab={tab} onTabChange={setTab} title={TAB_TITLES[tab]}>
        {tab === 'resumen' && <Dashboard />}
        {tab === 'fichas' && <FichasAdmin />}
        {tab === 'docentes' && <Docentes />}
      </AdminShell>
    );
  }

  return <UploadFicha profile={profile} />;
}
