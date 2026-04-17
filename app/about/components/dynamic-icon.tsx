import {
  Target, Eye, Award, Globe, BookOpen, Users, FileText, BarChart3,
  Shield, Cpu, Zap, Activity, LayoutTemplate, Sparkles, Building2, Workflow,
} from "lucide-react"

const ICON_MAP: Record<string, React.ElementType> = {
  Globe, Award, Target, Eye, Users, Shield, Cpu, Zap, Activity,
  Sparkles, Building2, Workflow, LayoutTemplate
}

export function DynamicIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = name && ICON_MAP[name] ? ICON_MAP[name] : Globe
  return <Icon className={className} />
}
