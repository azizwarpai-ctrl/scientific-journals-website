import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface MemberAvatarProps {
  name: string
  imageUrl?: string | null
  size?: "sm" | "md" | "lg"
}

const SIZE_CLASS = {
  sm: "size-9",
  md: "size-11",
  lg: "size-14",
} as const

export function MemberAvatar({ name, imageUrl, size = "md" }: MemberAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Avatar className={`${SIZE_CLASS[size]} shrink-0`}>
      <AvatarImage src={imageUrl || undefined} alt={name} className="object-cover" />
      <AvatarFallback className="text-sm font-semibold bg-primary/8 text-primary/70">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
