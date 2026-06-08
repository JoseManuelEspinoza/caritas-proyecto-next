"use client";

import { useState, useEffect } from "react";
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
  User,
  GraduationCap,
  ClipboardList,
  Map,
  Package,
  History as HistoryIcon,
  Database,
  ChevronDown,
  HandHeart,
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
    roles: ["admin", "comite", "jefaOGP"],
  },
  {
    href: "/capacitaciones",
    icon: GraduationCap,
    label: "Capacitaciones",
    exact: false,
    roles: ["admin", "especialistaGRD", "brigadista"],
  },
  { href: "/brigadistas", icon: Users, label: "Brigadistas", exact: false, roles: ["admin"] },
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
    roles: ["admin", "comite", "jefaOGP"],
  },
];

interface ShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: string;
  frontendRole: FrontendRole;
}

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
  const [isMobile, setIsMobile] = useState(false);

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
    if (isMobile) setMobileMenuOpen(false);
  };
  const collapsed = !isMobile && !sidebarOpen;
  const roleLabel = getRoleLabel(userRole);
  const initials = getInitials(userName);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? "fixed inset-y-0 left-0 z-50 w-64" : collapsed ? "w-20" : "w-64"}
          ${isMobile && !mobileMenuOpen ? "-translate-x-full" : "translate-x-0"}
          bg-white border-r border-[#DDDDDD] transition-all duration-300 flex flex-col
        `}
      >
        {/* Logo */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-[#DDDDDD]">
          {(!isMobile && !collapsed) || (isMobile && mobileMenuOpen) ? (
            <Image
              src="/caritas-logo.png"
              alt="Cáritas Lima"
              width={120}
              height={28}
              className="h-7 w-auto"
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
          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-700 p-0.5"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          )}
          {isMobile && (
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
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            {/* Notifications */}
            <button className="relative p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
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
                  <div className="fixed inset-0 z-[100]" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[110]">
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

                    {/* Profile link */}
                    <div className="py-2">
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
                        <User className="w-4 h-4" />
                        <span className="text-sm">Mi Perfil</span>
                      </button>
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
