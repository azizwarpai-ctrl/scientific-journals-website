import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { UserCircle2 } from "lucide-react"

interface MemberAvatarProps {
  name: string
  imageUrl?: string | null
}

export function MemberAvatar({ name, imageUrl }: MemberAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Avatar className="size-14 shrink-0 ring-1 ring-border/30">
      <AvatarImage src={imageUrl || undefined} alt={name} className="object-cover" />
      <AvatarFallback className="text-sm font-semibold text-muted-foreground">
        {initials || <UserCircle2 className="h-5 w-5" />}
      </AvatarFallback>
    </Avatar>
  )
}
