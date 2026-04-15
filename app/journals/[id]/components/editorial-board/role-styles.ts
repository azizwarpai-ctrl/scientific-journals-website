const LEGACY_ALIASES: Record<string, string> = { "256": "17", "512": "19" }

export type RoleTier = "chief" | "standard" | "default"

export interface RoleConfig {
  priority: number
  label: string
  tier: RoleTier
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  "17": { priority: 1, label: "Editor-in-Chief",        tier: "chief"    },
  "18": { priority: 2, label: "Associate Editor",       tier: "standard" },
  "19": { priority: 3, label: "Editorial Board Member", tier: "standard" },
}

const DEFAULT_CONFIG: RoleConfig = {
  priority: 10,
  label: "Board Member",
  tier: "default",
}

export function getRoleConfig(roleId: number): RoleConfig {
  const key = LEGACY_ALIASES[String(roleId)] ?? String(roleId)
  return ROLE_CONFIGS[key] ?? DEFAULT_CONFIG
}
