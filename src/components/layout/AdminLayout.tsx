import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, LayoutDashboard, FileText, Users, UserCog, UploadCloud, CalendarDays, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, X, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase, type Profile } from "../../lib/supabase";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function navGroupsPara(role: Profile["role"]): NavGroup[] {
  if (role === "director") {
    return [
      {
        label: "Principal",
        items: [
          { label: "Registrar Fichas", href: "/", icon: UploadCloud, end: true },
          { label: "Fichas", href: "/fichas", icon: FileText },
          { label: "Gestión Docente", href: "/docentes", icon: Users },
        ],
      },
    ];
  }
  const items: NavItem[] = [
    { label: "Inicio", href: "/", icon: LayoutDashboard, end: true },
    { label: "Fichas", href: "/fichas", icon: FileText },
    { label: "Gestión Docente", href: "/docentes", icon: Users },
    { label: "Monitoreos", href: "/monitoreos", icon: CalendarDays },
  ];
  if (role === "admin") items.push({ label: "Usuarios", href: "/usuarios", icon: UserCog });
  return [{ label: "Principal", items }];
}

const ROL_LABEL: Record<Profile["role"], string> = {
  admin: "Administrador",
  especialista: "Especialista AGEBATP",
  director: "Director de CEBA",
};

export function AdminLayout({ profile }: { profile: Profile }) {
  const location = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = profile.nombre ?? "Especialista";
  const initials =
    displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
  const navGroups = navGroupsPara(profile.role);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {mobileOpen && (
        <button
          aria-label="Cerrar menú"
          className="animate-fade-in fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "safe-top safe-bottom fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-950 text-slate-200 transition-all duration-300 ease-out",
          sidebarCollapsed ? "w-[84px]" : "w-[272px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--brand)] font-black text-white shadow-lg shadow-teal-950/40">U6</div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-base font-black tracking-wide text-white">UGEL 06</p>
                <p className="truncate text-xs text-slate-400">Monitoreo CEBA</p>
              </div>
            )}
          </Link>
          <button aria-label="Cerrar menú" className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{group.label}</p>
              )}
              <div className="space-y-1">
                {group.items.map(({ label, href, icon: Icon, end }) => (
                  <NavLink
                    key={href}
                    to={href}
                    end={end}
                    title={sidebarCollapsed ? label : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-[var(--brand)] text-white shadow-md shadow-black/30"
                          : "text-slate-400 hover:bg-slate-900 hover:text-white hover:pl-3.5",
                        sidebarCollapsed && "justify-center px-0 hover:pl-0",
                      )
                    }
                  >
                    <Icon className="size-[18px] shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
            className="hidden h-10 w-full items-center justify-center gap-2 rounded-xl text-sm text-slate-400 transition-colors hover:bg-slate-900 hover:text-white lg:flex"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <>
                <PanelLeftClose className="size-5" />
                <span>Contraer menú</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div className={cn("min-h-screen min-w-0 transition-all duration-300", sidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[272px]")}>
        <header className="safe-top sticky top-0 z-30 flex h-20 items-center border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 sm:px-6">
          <button aria-label="Abrir menú" className="mr-3 rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </button>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              className="grid size-10 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <button className="relative grid size-10 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              <Bell className="size-5" />
            </button>
            <div className="ml-1 flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                <button onClick={() => supabase.auth.signOut()} className="text-xs text-slate-500 transition-colors hover:text-[var(--brand)] dark:text-slate-400">
                  {ROL_LABEL[profile.role]} · Salir
                </button>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-teal-100 text-sm font-bold text-teal-800 ring-2 ring-white dark:bg-teal-950 dark:text-teal-300 dark:ring-slate-950">
                {initials}
              </div>
            </div>
          </div>
        </header>
        <main className="animate-fade-in min-w-0 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-5 lg:px-8" key={location.pathname}>
          <Outlet context={profile} />
        </main>
      </div>
    </div>
  );
}
