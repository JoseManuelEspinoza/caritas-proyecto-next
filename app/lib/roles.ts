export type FrontendRole = 'admin' | 'especialistaGRD' | 'brigadista' | 'comite' | 'jefaOGP'

const DB_TO_FRONTEND: Record<string, FrontendRole> = {
  ADMINISTRADOR:    'admin',
  ESPECIALISTAGRD:  'especialistaGRD',
  BRIGADISTA:       'brigadista',
  COMITEDONACIONES: 'comite',
  JEFAOGP:          'jefaOGP',
}

export const ROLE_LABELS: Record<FrontendRole, string> = {
  admin:           'Administrador',
  especialistaGRD: 'Especialista GRD',
  brigadista:      'Brigadista',
  comite:          'Comité de Donaciones',
  jefaOGP:         'Jefa OGP',
}

export const ROLE_COLORS: Record<string, string> = {
  ADMINISTRADOR:    '#EF4444',
  ESPECIALISTAGRD:  '#009850',
  BRIGADISTA:       '#3B82F6',
  COMITEDONACIONES: '#9155A8',
  JEFAOGP:          '#F59E0B',
}

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ADMINISTRADOR:    'Admin',
  ESPECIALISTAGRD:  'Especialistas',
  BRIGADISTA:       'Brigadistas',
  COMITEDONACIONES: 'Comité',
  JEFAOGP:          'Jefa OGP',
}

export function toFrontendRole(dbRole: string): FrontendRole {
  return DB_TO_FRONTEND[dbRole] ?? 'brigadista'
}

export function getRoleLabel(dbRole: string): string {
  return ROLE_LABELS[toFrontendRole(dbRole)] ?? dbRole
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}
