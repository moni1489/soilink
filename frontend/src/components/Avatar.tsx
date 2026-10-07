import type { CSSProperties } from 'react';
import { initials } from '@/auth/accounts';
import { useAvatar } from '@/auth/avatar';

export function Avatar({ userId, name, className = '', style }: { userId: string; name: string; className?: string; style?: CSSProperties }) {
  const photo = useAvatar(userId);
  return photo
    ? <img src={photo} alt={name} className={`object-cover ${className}`} />
    : <div className={`flex items-center justify-center ${className}`} style={style}>{initials(name)}</div>;
}
