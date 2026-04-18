'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { DossierReinscription, StatutDossier } from '@/lib/types';

interface ClassesDisponibles {
  ufrs: string[];
  departements: string[];
  niveaux: string[];
  classes: { id: number; ufr: string; departement: string; niveau: string; filiere: string; annee_academique: string }[];
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // — filtres classe (mode "toute la classe")
  const [classesData, setClassesData] = useState<ClassesDisponibles | null>(null);
  const [ufr, setUfr] = useState('');
  const [departement, setDepartement] = useState('');
  const [niveau, setNiveau] = useState('');
  const [resultatClasse, setResultatClasse] = useState<{ crees: number; ignores: number; total: number } | null>(null);

  const isEtudiant = user?.role === 'etudiant';
  const isAgent = user?.role === 'agent';

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<DossierReinscription[]>('/api/inscriptions/dossiers/');
      setDossiers(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  async function ouvrirForm() {
    setShowForm(true);
    setUfr(''); setDepartement(''); setNiveau('');
    setResultatClasse(null);
    if (!classesData) {
      const data = await api.get<ClassesDisponibles>('/api/services/classes-disponibles/');
      setClassesData(data);
    }
  }

  async function handleCreerClasse(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setResultatClasse(null);
    try {
      const res = await api.post<{ crees: number; ignores: number; total_etudiants: number }>(
        '/api/inscriptions/dossiers/creer-classe/',
        { ufr, departement, niveau },
      );
      setResultatClasse({ crees: res.crees, ignores: res.ignores, total: res.total_etudiants });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  }

  const departementsFiltes = useMemo(() => {
    if (!classesData || !ufr) return [];
    return [...new Set(classesData.classes.filter(c => c.ufr === ufr).map(c => c.departement))].sort();
  }, [classesData, ufr]);

  const niveauxFiltres = useMemo(() => {
    if (!classesData || !ufr || !departement) return [];
    return [...new Set(
      classesData.classes.filter(c => c.ufr === ufr && c.departement === departement).map(c => c.niveau),
    )].sort();
  }, [classesData, ufr, departement]);

  const dossier = isEtudiant && dossiers.length > 0 ? dossiers[0] : null;
  const toutValide =
    dossier?.statusVisite === 'VALIDE' &&
    dossier?.statusValidation === 'VALIDE' &&
    dossier?.statusPaiement === 'VALIDE';

  async function telechargerCertificat() {
    setDownloading(true);
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/inscriptions/certificat/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Impossible de générer le certificat.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificat_inscription.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  }

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-800">Mon dossier de réinscription</h1>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Rafraîchir
          </button>
        </div>

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

        {toutValide && (
          <div className="card p-5 flex flex-col sm:flex-row items-center gap-4 bg-emerald-50 border border-emerald-200">
            <div className="flex-1">
              <p className="font-semibold text-emerald-800 text-sm">Dossier complet — Toutes les étapes sont validées</p>
              <p className="text-emerald-700 text-xs mt-1">Vous pouvez télécharger votre certificat d&apos;inscription.</p>
            </div>
            <button
              onClick={telechargerCertificat}
              disabled={downloading}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {downloading ? 'Génération...' : 'Télécharger le certificat PDF'}
            </button>
          </div>
        )}

        {(dossier.notifications ?? []).length > 0 && (
          <div className="mt-6">
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
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dossiers de réinscription</h1>
          <p className="text-slate-500 text-sm mt-1">{dossiers.length} dossier(s)</p>
        </div>
        {isAgent && (
          <button
            onClick={showForm ? () => setShowForm(false) : ouvrirForm}
            className={showForm ? 'btn-secondary' : 'btn-primary'}
          >
            {showForm ? 'Annuler' : '+ Créer des dossiers'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isAgent && showForm && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-slate-800 mb-1">Créer les dossiers d&apos;une classe</h2>
          <p className="text-sm text-slate-500 mb-4">
            Crée d&apos;un seul coup les dossiers de tous les étudiants de la classe sélectionnée
            et notifie automatiquement le médecin et le bibliothécaire.
          </p>

          <form onSubmit={handleCreerClasse} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">UFR</label>
                <select
                  className="input-field"
                  value={ufr}
                  onChange={e => { setUfr(e.target.value); setDepartement(''); setNiveau(''); setResultatClasse(null); }}
                >
                  <option value="">Sélectionner une UFR</option>
                  {(classesData?.ufrs ?? []).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Département</label>
                <select
                  className="input-field"
                  value={departement}
                  disabled={!ufr}
                  onChange={e => { setDepartement(e.target.value); setNiveau(''); setResultatClasse(null); }}
                >
                  <option value="">Sélectionner un département</option>
                  {departementsFiltes.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
                <select
                  className="input-field"
                  value={niveau}
                  disabled={!departement}
                  onChange={e => { setNiveau(e.target.value); setResultatClasse(null); }}
                >
                  <option value="">Sélectionner un niveau</option>
                  {niveauxFiltres.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {resultatClasse && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-emerald-800">
                  {resultatClasse.crees} dossier(s) créé(s) sur {resultatClasse.total} étudiant(s)
                </p>
                {resultatClasse.ignores > 0 && (
                  <p className="text-xs text-emerald-700">{resultatClasse.ignores} ignoré(s) (dossier déjà existant)</p>
                )}
                <p className="text-xs text-emerald-700">Médecin et bibliothécaire notifiés.</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Fermer</button>
              <button type="submit" disabled={submitting || !niveau || !!resultatClasse} className="btn-primary">
                {submitting ? 'Création en cours...' : 'Créer tous les dossiers'}
              </button>
            </div>
          </form>
        </div>
      )}

      {dossiers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          Aucun dossier créé. Cliquez sur &quot;+ Créer des dossiers&quot; pour commencer.
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
