type RoleStyle = {
  dot: string
  text: string
  badge: string
}

const ROLE_STYLES: Record<string, RoleStyle> = {
  "17": {
    dot: "bg-primary",
    text: "text-primary",
    badge: "bg-primary/10 dark:bg-primary/20 text-primary border-primary/20 dark:border-primary/30",
  },
  "18": {
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
    badge: "bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  "19": {
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-400",
    badge: "bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  default: {
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
  },
}

const LEGACY_ALIASES: Record<string, string> = { "256": "17", "512": "19" }

export type RoleTier = "featured" | "standard" | "default"

export interface RoleConfig extends RoleStyle {
  priority: number
  label: string
  tier: RoleTier
}

const ROLE_CONFIGS: Record<string, Omit<RoleConfig, keyof RoleStyle>> = {
  "17": {
    priority: 1,
    label: "Editor-in-Chief",
    tier: "featured",
  },
  "18": {
    priority: 2,
    label: "Associate Editor",
    tier: "standard",
  },
  "19": {
    priority: 3,
    label: "Editorial Board Member",
    tier: "standard",
  },
}

export type { RoleStyle }

export function getRoleStyle(roleId: number): RoleStyle {
  const key = LEGACY_ALIASES[String(roleId)] ?? String(roleId)
  return ROLE_STYLES[key] ?? ROLE_STYLES.default
}

export function getRoleConfig(roleId: number): RoleConfig {
  const style = getRoleStyle(roleId)
  const aliasId = LEGACY_ALIASES[String(roleId)] ?? String(roleId)
  const config = ROLE_CONFIGS[aliasId] ?? {
    priority: 10,
    label: "Board Member",
    tier: "default" as RoleTier,
  }
  return { ...style, ...config }
}
