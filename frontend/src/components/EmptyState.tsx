import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './EmptyState.scss'

interface Props {
  message?: string
  hint?:    string
  icon?:    LucideIcon
}

export default function EmptyState({
  message = 'Sin información disponible',
  hint,
  icon,
}: Props) {
  const Icon = icon ?? Inbox
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div className="empty-state__message">{message}</div>
      {hint && <div className="empty-state__hint">{hint}</div>}
    </div>
  )
}
