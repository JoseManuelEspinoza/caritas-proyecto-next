"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  FileText,
  Bell,
  Menu,
  X,
  LogOut,
  GraduationCap,
  ClipboardList,
  Map,
  Package,
  History as HistoryIcon,
  Database,
  ChevronDown,
  HandHeart,
  Church,
} from "lucide-react";
import { NavLink } from "./nav-link";
import { logout } from "@/app/actions/auth";
import { getRoleLabel, getInitials, type FrontendRole } from "@/app/lib/roles";
import { Toaster } from "sonner";

const ALL_NAV = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    exact: true,
    roles: ["admin", "especialistaGRD", "comite", "jefaOGP"],
  },
  {
    href: "/grd",
    icon: AlertTriangle,
    label: "Incidencias GRD",
    exact: false,
    roles: ["admin", "especialistaGRD", "brigadista", "jefaOGP"],
  },
  {
    href: "/donaciones",
    icon: HandHeart,
    label: "Donaciones",
    exact: false,
    roles: ["admin", "comite"],
  },
  {
    href: "/capacitaciones",
    icon: GraduationCap,
    label: "Capacitaciones",
    exact: false,
    roles: ["admin", "especialistaGRD", "brigadista"],
  },
  { href: "/brigadistas", icon: Users, label: "Brigadistas", exact: false, roles: ["admin", "especialistaGRD"] },
  { href: "/parroquias", icon: Church, label: "Parroquias", exact: false, roles: ["admin", "especialistaGRD"] },
  { href: "/planes", icon: ClipboardList, label: "Planes GRD", exact: false, roles: ["admin"] },
  {
    href: "/simulacros",
    icon: Map,
    label: "Simulacros",
    exact: false,
    roles: ["admin", "especialistaGRD", "brigadista"],
  },
  { href: "/kits", icon: Package, label: "Kits de Emergencia", exact: false, roles: ["admin", "comite"] },
  { href: "/catalogos", icon: Database, label: "Catálogos", exact: false, roles: ["admin"] },
  { href: "/auditoria", icon: HistoryIcon, label: "Auditoría", exact: false, roles: ["admin"] },
  { href: "/usuarios", icon: Users, label: "Gestión de Usuarios", exact: false, roles: ["admin"] },
  {
    href: "/reportes",
    icon: FileText,
    label: "Reportes",
    exact: false,
    roles: ["admin", "especialistaGRD", "comite", "jefaOGP"],
  },
];

interface ShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: string;
  frontendRole: FrontendRole;
}

// ─── Campana de notificaciones ───────────────────────────────────────────────

type Notif = {
  idNotificacion: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  leida: boolean;
  createdAt: string;
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones", { cache: "no-store" });
      if (res.ok) setNotifs(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Cierra al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const noLeidas = notifs.filter((n) => !n.leida).length;

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && noLeidas > 0) {
      await fetch("/api/notificaciones", { method: "PATCH", body: JSON.stringify({}) });
      setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    }
  }

  function fmtRelativo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1) return "Ahora mismo";
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Hace ${h}h`;
    return `Hace ${Math.floor(h / 24)}d`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-4 h-4" />
        {noLeidas > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Notificaciones</span>
            {noLeidas === 0 && notifs.length > 0 && (
              <span className="text-[10px] text-gray-400">Todo leído</span>
            )}
          </div>

          {notifs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Sin notificaciones</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifs.map((n) => (
                <li key={n.idNotificacion}>
                  {n.enlace ? (
                    <a
                      href={n.enlace}
                      onClick={() => setOpen(false)}
                      className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.leida ? "bg-blue-50/60" : ""}`}
                    >
                      {!n.leida && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <div className={!n.leida ? "" : "ml-5"}>
                        <p className="text-xs font-semibold text-gray-800">{n.titulo}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{fmtRelativo(n.createdAt)}</p>
                      </div>
                    </a>
                  ) : (
                    <div className={`flex gap-3 px-4 py-3 ${!n.leida ? "bg-blue-50/60" : ""}`}>
                      {!n.leida && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <div className={!n.leida ? "" : "ml-5"}>
                        <p className="text-xs font-semibold text-gray-800">{n.titulo}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{fmtRelativo(n.createdAt)}</p>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function DashboardShell({
  children,
  userName,
  userEmail,
  userRole,
  frontendRole,
}: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else {
        setSidebarOpen(true);
        setMobileMenuOpen(false);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const navItems = ALL_NAV.filter((item) => item.roles.includes(frontendRole));
  const closeMobile = () => {
    if (isMobile === true) setMobileMenuOpen(false);
  };
  const collapsed = isMobile === false && !sidebarOpen;
  const roleLabel = getRoleLabel(userRole);
  const initials = getInitials(userName);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {isMobile === true && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile === true ? "fixed inset-y-0 left-0 z-50 w-64" : collapsed ? "w-20" : "w-64"}
          ${isMobile === true && !mobileMenuOpen ? "-translate-x-full" : "translate-x-0"}
          bg-white border-r border-[#DDDDDD] transition-all duration-300 flex flex-col
        `}
      >
        {/* Logo */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-[#DDDDDD]">
          {(isMobile !== true && !collapsed) || (isMobile === true && mobileMenuOpen) ? (
            <Image
              src="/caritas-logo.png"
              alt="Cáritas Lima"
              width={120}
              height={28}
              className="h-7 w-auto"
              style={{ width: "auto" }}
            />
          ) : (
            <div className="mx-auto">
              <Image
                src="/caritas-symbol.png"
                alt="Cáritas"
                width={24}
                height={24}
                className="h-6 w-6"
              />
            </div>
          )}
          {isMobile === false && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-700 p-0.5"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          )}
          {isMobile === true && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-500 hover:text-gray-700 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
              exact={item.exact}
              onClick={closeMobile}
            />
          ))}
        </nav>

        {/* Version footer */}
        {!collapsed && (
          <div className="p-4 border-t border-[#DDDDDD]">
            <div className="text-xs text-gray-400 text-center">Versión 1.0.0</div>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-[#DDDDDD] flex items-center justify-between px-3 md:px-6">
          {isMobile === true && (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            {/* Notifications */}
            <NotificationBell />

            {/* User menu */}
            <div className="relative">
              <button
                suppressHydrationWarning
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 hover:bg-gray-50 py-1 px-1.5 rounded-lg transition-colors"
              >
                <div className="w-7 h-7 bg-[#009850] rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-[10px]">{initials}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-100" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-110">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-[#DDDDDD]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#009850] rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">{initials}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{userName}</div>
                          <div className="text-sm text-gray-500">{userEmail}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{roleLabel}</div>
                        </div>
                      </div>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-[#DDDDDD] pt-2">
                      <form action={logout}>
                        <button
                          type="submit"
                          className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">Cerrar Sesión</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}
