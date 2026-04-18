'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { DossierReinscription, StatutDossier, Etudiant } from '@/lib/types';

const STATUT_STYLES: Record<StatutDossier, { label: string; className: string }> = {
  EN_ATTENTE: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  VALIDE:     { label: 'Validé',     className: 'bg-emerald-100 text-emerald-700' },
  REJETE:     { label: 'Rejeté',     className: 'bg-red-100 text-red-700' },
};

function StatutBadge({ statut, label }: { statut: StatutDossier; label?: string }) {
  const s = STATUT_STYLES[statut];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.className}`}>
      {label ? `${label} : ${s.label}` : s.label}
    </span>
  );
}

export default function DossierPage() {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState<DossierReinscription[]>([]);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [etudiantId, setEtudiantId] = useState('');

  const isEtudiant = user?.role === 'etudiant';
  const isAgent = user?.role === 'agent';

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<DossierReinscription[]>('/api/inscriptions/dossiers/');
      setDossiers(data);
      if (isAgent) {
        const ets = await api.get<Etudiant[]>('/api/etudiants/');
        setEtudiants(ets);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/inscriptions/dossiers/', { etudiant_id: Number(etudiantId) });
      setShowForm(false);
      setEtudiantId('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  }

  const dossier = isEtudiant && dossiers.length > 0 ? dossiers[0] : null;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Vue étudiant ──────────────────────────────────────────
  if (isEtudiant) {
    if (!dossier) {
      return (
        <div>
          <h1 className="text-xl font-bold text-slate-800 mb-6">Mon dossier de réinscription</h1>
          <div className="card p-8 text-center text-slate-500 text-sm">
            Aucun dossier trouvé. Contactez l&apos;administration.
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-slate-800 mb-6">Mon dossier de réinscription</h1>

        <div className="card divide-y divide-slate-100 mb-6">
          <div className="flex px-5 py-3.5 items-center">
            <span className="w-44 text-sm font-medium text-slate-500 shrink-0">Visite médicale</span>
            <StatutBadge statut={dossier.statusVisite} />
          </div>
          <div className="flex px-5 py-3.5 items-center">
            <span className="w-44 text-sm font-medium text-slate-500 shrink-0">Bibliothèque</span>
            <StatutBadge statut={dossier.statusValidation} />
          </div>
          <div className="flex px-5 py-3.5 items-center">
            <span className="w-44 text-sm font-medium text-slate-500 shrink-0">Paiement</span>
            <StatutBadge statut={dossier.statusPaiement} />
          </div>
          {dossier.montant > 0 && (
            <div className="flex px-5 py-3.5">
              <span className="w-44 text-sm font-medium text-slate-500 shrink-0">Montant payé</span>
              <span className="text-sm text-slate-800">{dossier.montant.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
          {dossier.operateur && (
            <div className="flex px-5 py-3.5">
              <span className="w-44 text-sm font-medium text-slate-500 shrink-0">Opérateur</span>
              <span className="text-sm text-slate-800">{dossier.operateur}</span>
            </div>
          )}
          <div className="flex px-5 py-3.5">
            <span className="w-44 text-sm font-medium text-slate-500 shrink-0">Créé le</span>
            <span className="text-sm text-slate-800">
              {new Date(dossier.dateCreation).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>

        {(dossier.notifications ?? []).length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Notifications</h2>
            <div className="space-y-2">
              {(dossier.notifications ?? []).map(n => (
                <div key={n.idNotification} className="card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">{n.emetteur}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(n.dateEnvoie).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vue agent ─────────────────────────────────────────────
  // Étudiants qui ont déjà un dossier
  const etudiantsAvecDossier = new Set(
    dossiers.map(d => d.etudiant_nom)
  );
  // Pour le select, filtrer ceux qui n'ont pas encore de dossier
  const etudiantsSansDossier = etudiants.filter(
    et => !dossiers.some(d => d.etudiant_nom === `${et.user.first_name} ${et.user.last_name}`.trim())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dossiers de réinscription</h1>
          <p className="text-slate-500 text-sm mt-1">{dossiers.length} dossier(s)</p>
        </div>
        {isAgent && (
          <button onClick={() => setShowForm(v => !v)} className="btn-primary">
            {showForm ? 'Annuler' : '+ Créer un dossier'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isAgent && showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Nouveau dossier de réinscription</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Étudiant</label>
            <select
              className="input-field"
              value={etudiantId}
              onChange={e => setEtudiantId(e.target.value)}
              required
            >
              <option value="">Sélectionner un étudiant</option>
              {etudiantsSansDossier.map(et => (
                <option key={et.id} value={et.id}>
                  {et.user.first_name} {et.user.last_name} — {et.code_permanent}
                </option>
              ))}
            </select>
            {etudiantsSansDossier.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Tous les étudiants ont déjà un dossier.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !etudiantId}
              className="btn-primary"
            >
              {submitting ? 'Création...' : 'Créer le dossier'}
            </button>
          </div>
        </form>
      )}

      {dossiers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          Aucun dossier créé. Cliquez sur &quot;+ Créer un dossier&quot; pour commencer.
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {dossiers.map(d => (
            <div key={d.idDossier} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">{d.etudiant_nom}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Créé le {new Date(d.dateCreation).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <StatutBadge statut={d.statusVisite} label="Visite" />
                <StatutBadge statut={d.statusValidation} label="Biblio" />
                <StatutBadge statut={d.statusPaiement} label="Paiement" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
