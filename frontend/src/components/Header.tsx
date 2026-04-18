'use client';

import { User, Role } from '@/lib/types';
import NotificationBell from './NotificationBell';

const ROLE_LABEL: Record<Role, string> = {
  etudiant: 'Étudiant',
  agent: 'Agent de Scolarité',
  biblio: 'Bibliothécaire',
  medecin: 'Médecin',
};

export default function Header({ user }: { user: User }) {
  const name =
    user.first_name || user.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.username;

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between shrink-0">
      <p className="text-slate-500 text-sm capitalize">{dateStr}</p>

      <div className="flex items-center gap-3">
        {user.role === 'etudiant' && <NotificationBell />}

        <span className="text-sm text-slate-600 font-medium hidden sm:block">
          {ROLE_LABEL[user.role]}
        </span>
        <div className="h-4 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
            {name[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-medium text-slate-800 hidden md:block">{name}</span>
        </div>
      </div>
    </header>
  );
}
