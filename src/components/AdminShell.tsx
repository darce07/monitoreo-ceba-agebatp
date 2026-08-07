import type { ReactNode } from 'react';
import { LayoutDashboard, FileText, Users, Bell, HelpCircle, ChevronDown, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export type AdminTab = 'resumen' | 'fichas' | 'docentes';

const NAV_ITEMS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'resumen', label: 'Inicio', icon: LayoutDashboard },
  { id: 'fichas', label: 'Fichas', icon: FileText },
  { id: 'docentes', label: 'Gestión Docente', icon: Users },
];

export default function AdminShell({
  tab,
  onTabChange,
  title,
  children,
}: {
  tab: AdminTab;
  onTabChange: (t: AdminTab) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen w-full flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col py-gutter fixed left-0 top-0 h-screen w-sidebar-width bg-surface-container-highest border-r border-outline-variant z-40">
        <div className="px-6 pb-6 border-b border-outline-variant/50 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-on-primary font-bold text-headline-sm">
              U6
            </div>
            <div>
              <h1 className="text-headline-md font-bold text-primary">UGEL 06</h1>
              <p className="text-label-md text-on-surface-variant">Monitoreo CEBA</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto flex flex-col gap-1 text-label-md">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mx-2 transition-colors text-left ${
                  active
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main wrapper */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-sidebar-width">
        <header className="flex justify-between items-center px-gutter w-full sticky top-0 z-30 h-topbar-height bg-surface border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-headline-sm font-bold text-on-surface hidden sm:block">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors relative">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full" />
            </button>
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors hidden sm:block">
              <HelpCircle size={22} />
            </button>
            <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 hover:bg-surface-container-low pl-2 pr-3 py-1.5 rounded-full transition-colors text-on-surface-variant"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
              <span className="text-label-md hidden sm:block">Salir</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-container-padding pb-24 lg:pb-container-padding">
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-surface border-t border-outline-variant shadow-lg">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center px-4 py-1 rounded-full transition-colors text-label-sm ${
                active ? 'text-primary bg-primary-container/30' : 'text-on-surface-variant'
              }`}
            >
              <Icon size={22} />
              <span className="mt-1">{item.label === 'Gestión Docente' ? 'Docentes' : item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
