'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

interface NavLinkProps {
  href: string
  icon: LucideIcon
  label: string
  collapsed: boolean
  exact?: boolean
  onClick?: () => void
}

export function NavLink({ href, icon: Icon, label, collapsed, exact, onClick }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 mx-2 transition-all rounded-lg ${
        isActive
          ? 'bg-[#009850]/10 text-[#009850]'
          : 'text-[#49494A] hover:bg-[#F5F5F5]'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </Link>
  )
}
