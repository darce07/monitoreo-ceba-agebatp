import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { useProfile } from "./lib/useProfile";
import Login from "./pages/Login";
import UploadFicha from "./pages/UploadFicha";
import { AdminLayout } from "./components/layout/AdminLayout";
import { Skeleton } from "./components/ui";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const FichasAdmin = lazy(() => import("./pages/FichasAdmin"));
const Docentes = lazy(() => import("./pages/Docentes"));

export default function App() {
  const { session, profile, loading } = useProfile();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-400 dark:bg-slate-950">Cargando...</div>;
  }

  if (!session) {
    return <Login />;
  }

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 dark:bg-slate-950">
        <p className="max-w-sm text-center text-sm text-slate-500 dark:text-slate-400">
          Tu cuenta aún no está asociada a ninguna CEBA. Contacta al especialista de AGEBATP para que te habilite
          el acceso.
        </p>
      </div>
    );
  }

  if (profile.role === "admin") {
    return (
      <Routes>
        <Route element={<AdminLayout profile={profile} />}>
          <Route
            index
            element={
              <Suspense fallback={<Skeleton className="h-64" />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="fichas"
            element={
              <Suspense fallback={<Skeleton className="h-64" />}>
                <FichasAdmin />
              </Suspense>
            }
          />
          <Route
            path="docentes"
            element={
              <Suspense fallback={<Skeleton className="h-64" />}>
                <Docentes />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    );
  }

  return <UploadFicha profile={profile} />;
}
