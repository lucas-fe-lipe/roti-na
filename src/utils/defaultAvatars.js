// src/utils/defaultAvatars.js

export const DEFAULT_AVATARS = [
  {
    id: 'boy-cap',
    name: 'Garoto de Boné',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100" height="100" fill="#000000"/>
      <path d="M30 85 C30 70 70 70 70 85 Z" fill="#1c1917"/>
      <circle cx="50" cy="45" r="22" fill="#18181b"/>
      <path d="M32 45 C32 60 68 60 68 45 Z" fill="#121212"/>
      <path d="M26 40 Q50 20 74 40 L78 32 Q50 15 22 32 Z" fill="#3f3f46"/>
      <rect x="35" y="30" width="30" height="12" rx="4" fill="#52525b"/>
      <path d="M30 36 L70 36 L75 42 L25 42 Z" fill="#27272a"/>
    </svg>`
  },
  {
    id: 'girl-bow',
    name: 'Garota com Laço',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100" height="100" fill="#000000"/>
      <path d="M28 40 Q25 80 35 90 L65 90 Q75 80 72 40 Z" fill="#27272a"/>
      <path d="M30 85 C30 70 70 70 70 85 Z" fill="#1c1917"/>
      <circle cx="50" cy="48" r="20" fill="#18181b"/>
      <path d="M50 28 L40 20 L40 36 Z" fill="#f43f5e"/>
      <path d="M50 28 L60 20 L60 36 Z" fill="#f43f5e"/>
      <circle cx="50" cy="28" r="4" fill="#fb7185"/>
    </svg>`
  },
  {
    id: 'neutral',
    name: 'Neutro',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100" height="100" fill="#000000"/>
      <path d="M25 90 C25 70 75 70 75 90 Z" fill="#27272a"/>
      <circle cx="50" cy="45" r="22" fill="#18181b"/>
      <path d="M28 50 Q50 35 72 50 Q75 75 50 75 Q25 75 28 50 Z" fill="#18181b"/>
      <circle cx="50" cy="45" r="16" fill="#09090b"/>
      <circle cx="50" cy="45" r="6" fill="#52525b"/>
    </svg>`
  }
];

export function getInitials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const name = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}