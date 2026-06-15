"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  exact?: boolean;
  onClick?: () => void;
}

export function NavLink({ href, icon: Icon, label, collapsed, exact, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative group flex items-center gap-3 px-4 py-2.5 mx-2 transition-all rounded-lg ${
        isActive ? "bg-[#009850]/10 text-[#009850]" : "text-[#49494A] hover:bg-[#F5F5F5]"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}

      {/* Tooltip: solo visible cuando el sidebar está colapsado */}
      {collapsed && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[9999] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="flex items-center">
            {/* Flecha */}
            <div
              className="w-0 h-0"
              style={{
                borderTop: "5px solid transparent",
                borderBottom: "5px solid transparent",
                borderRight: "6px solid #009850",
              }}
            />
            {/* Etiqueta */}
            <div className="bg-[#009850] text-white text-xs font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-lg tracking-wide">
              {label}
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
