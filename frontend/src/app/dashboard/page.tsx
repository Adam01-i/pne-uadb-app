'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { Etudiant } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ etudiants: 0, classes: 0, agents: 0, biblio: 0, medecins: 0 });
  const [myProfile, setMyProfile] = useState<Etudiant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        if (user!.role === 'agent') {
          const [etudiants, classes, agents, biblio, medecins] = await Promise.all([
            api.get<Etudiant[]>('/api/etudiants/'),
            api.get<unknown[]>('/api/classes/'),
            api.get<unknown[]>('/api/agents/'),
            api.get<unknown[]>('/api/bibliothecaires/'),
            api.get<unknown[]>('/api/medecins/'),
          ]);
          setCounts({
            etudiants: etudiants.length,
            classes: classes.length,
            agents: agents.length,
            biblio: biblio.length,
            medecins: medecins.length,
          });
        } else if (user!.role === 'etudiant') {
          const data = await api.get<Etudiant[]>('/api/etudiants/');
          if (data.length > 0) setMyProfile(data[0]);
        } else {
          const etudiants = await api.get<Etudiant[]>('/api/etudiants/');
          setCounts(prev => ({ ...prev, etudiants: etudiants.length }));
        }
      } catch {
        // silencieux
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  if (!user) return null;

  // Vue étudiant
  if (user.role === 'etudiant') {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-slate-800 mb-6">Mon profil</h1>
        {loading ? (
          <div className="card p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : myProfile ? (
          <div className="card divide-y divide-slate-100">
            {[
              ['Nom complet', `${myProfile.user.first_name} ${myProfile.user.last_name}`.trim() || myProfile.user.username],
              ['Email', myProfile.user.email],
              ['Code permanent', myProfile.code_permanent],
              ['Filière', myProfile.classe?.filiere ?? '—'],
              ['Niveau', myProfile.classe?.niveau ?? '—'],
              ['UFR', myProfile.classe?.ufr ?? '—'],
              ['Département', myProfile.classe?.departement ?? '—'],
              ['Année académique', myProfile.classe?.annee_academique ?? '—'],
              ['Adresse', myProfile.user.adresse || '—'],
              ['Téléphone', myProfile.user.telephone || '—'],
            ].map(([label, val]) => (
              <div key={label} className="flex px-5 py-3.5">
                <span className="w-44 text-sm font-medium text-slate-500 shrink-0">{label}</span>
                <span className="text-sm text-slate-800">{val}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-slate-500 text-sm">
            Profil étudiant non trouvé.
          </div>
        )}
      </div>
    );
  }

  // Vue agent / biblio / médecin
  const name =
    user.first_name || user.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.username;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Bonjour, {name} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Vue d&apos;ensemble de la plateforme</p>
      </div>

      {user.role === 'agent' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatsCard label="Étudiants inscrits" value={counts.etudiants} color="indigo" loading={loading}
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>}
          />
          <StatsCard label="Classes" value={counts.classes} color="emerald" loading={loading}
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
          />
          <StatsCard label="Agents scolarité" value={counts.agents} color="amber" loading={loading}
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>}
          />
          <StatsCard label="Bibliothécaires" value={counts.biblio} color="purple" loading={loading}
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>}
          />
          <StatsCard label="Médecins" value={counts.medecins} color="rose" loading={loading}
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <StatsCard label="Étudiants" value={counts.etudiants} color="indigo" loading={loading}
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
          />
        </div>
      )}
    </div>
  );
}
