'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ValidationBibliotheque, Etudiant } from '@/lib/types';

interface ClassesDisponibles {
  ufrs: string[];
  departements: string[];
  niveaux: string[];
  classes: { id: number; ufr: string; departement: string; niveau: string; filiere: string; annee_academique: string }[];
}

export default function ValidationsBiblioPage() {
  const { user } = useAuth();
  const isBiblio = user?.role === 'biblio';

  const [validations, setValidations] = useState<ValidationBibliotheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validatingId, setValidatingId] = useState<number | null>(null);

  // — filtres classe
  const [classesData, setClassesData] = useState<ClassesDisponibles | null>(null);
  const [ufr, setUfr] = useState('');
  const [departement, setDepartement] = useState('');
  const [niveau, setNiveau] = useState('');
  const [etudiantsFiltres, setEtudiantsFiltres] = useState<Etudiant[]>([]);
  const [loadingEtudiants, setLoadingEtudiants] = useState(false);
  const [codeRecherche, setCodeRecherche] = useState('');

  // — sélection finale
  const [bibliothecaireId, setBibliothecaireId] = useState('');
  const [etudiantId, setEtudiantId] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<ValidationBibliotheque[]>('/api/services/validations-bibliotheque/');
      setValidations(data);
      if (isBiblio && !bibliothecaireId) {
        const biblis = await api.get<{ id: number; user: { id: number } }[]>('/api/bibliothecaires/');
        const moi = biblis.find(b => b.user.id === user?.id);
        if (moi) setBibliothecaireId(String(moi.id));
      }
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
    setEtudiantsFiltres([]); setCodeRecherche(''); setEtudiantId('');
    if (!classesData) {
      const data = await api.get<ClassesDisponibles>('/api/services/classes-disponibles/');
      setClassesData(data);
    }
  }

  async function chargerEtudiants(u: string, d: string, n: string) {
    if (!u || !d || !n) return;
    setLoadingEtudiants(true);
    setEtudiantId('');
    setCodeRecherche('');
    try {
      const ets = await api.get<Etudiant[]>(
        `/api/services/etudiants-par-classe/?ufr=${encodeURIComponent(u)}&departement=${encodeURIComponent(d)}&niveau=${encodeURIComponent(n)}`,
      );
      setEtudiantsFiltres(ets);
    } finally {
      setLoadingEtudiants(false);
    }
  }

  function handleNiveauChange(n: string) {
    setNiveau(n);
    chargerEtudiants(ufr, departement, n);
  }

  const etudiantsAffiches = useMemo(() => {
    const q = codeRecherche.trim().toLowerCase();
    if (!q) return etudiantsFiltres;
    return etudiantsFiltres.filter(
      et =>
        et.code_permanent.toLowerCase().includes(q) ||
        `${et.user.last_name} ${et.user.first_name}`.toLowerCase().includes(q),
    );
  }, [etudiantsFiltres, codeRecherche]);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!etudiantId) { setError('Veuillez sélectionner un étudiant.'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/services/validations-bibliotheque/', {
        etudiant_id: Number(etudiantId),
        bibliothecaire_id: Number(bibliothecaireId),
      });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleValider(id: number, enRegle: boolean) {
    setValidatingId(id);
    try {
      await api.patch(`/api/services/validations-bibliotheque/${id}/valider/`, { en_regle: enRegle });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la validation');
    } finally {
      setValidatingId(null);
    }
  }

  const etudiantSelectionne = etudiantsFiltres.find(e => String(e.id) === etudiantId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Validations Bibliothèque</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isBiblio ? 'Gérer la conformité bibliothèque des étudiants' : 'Votre statut bibliothèque'}
          </p>
        </div>
        {isBiblio && (
          <button
            onClick={showForm ? () => setShowForm(false) : ouvrirForm}
            className={showForm ? 'btn-secondary' : 'btn-primary'}
          >
            {showForm ? 'Annuler' : '+ Nouvelle validation'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isBiblio && showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Créer une validation</h2>

          {/* Filtres UFR → Département → Niveau */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">UFR</label>
              <select
                className="input-field"
                value={ufr}
                onChange={e => { setUfr(e.target.value); setDepartement(''); setNiveau(''); setEtudiantsFiltres([]); setEtudiantId(''); }}
              >
                <option value="">Sélectionner une UFR</option>
                {(classesData?.ufrs ?? []).map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Département</label>
              <select
                className="input-field"
                value={departement}
                onChange={e => { setDepartement(e.target.value); setNiveau(''); setEtudiantsFiltres([]); setEtudiantId(''); }}
                disabled={!ufr}
              >
                <option value="">Sélectionner un département</option>
                {departementsFiltes.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
              <select
                className="input-field"
                value={niveau}
                onChange={e => handleNiveauChange(e.target.value)}
                disabled={!departement}
              >
                <option value="">Sélectionner un niveau</option>
                {niveauxFiltres.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recherche + liste étudiants */}
          {niveau && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Étudiant</label>
              <input
                type="text"
                className="input-field"
                placeholder="Filtrer par code permanent ou nom..."
                value={codeRecherche}
                onChange={e => { setCodeRecherche(e.target.value); setEtudiantId(''); }}
              />
              {loadingEtudiants ? (
                <p className="text-xs text-slate-400 py-2">Chargement...</p>
              ) : (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {etudiantsAffiches.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 text-center">Aucun étudiant trouvé</p>
                  ) : (
                    etudiantsAffiches.map(et => (
                      <button
                        key={et.id}
                        type="button"
                        onClick={() => { setEtudiantId(String(et.id)); setCodeRecherche(''); }}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors hover:bg-slate-50 ${
                          etudiantId === String(et.id) ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <span className="text-sm text-slate-700">
                          {et.user.last_name} {et.user.first_name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{et.code_permanent}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {etudiantSelectionne && (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
                  <span className="font-medium">
                    {etudiantSelectionne.user.last_name} {etudiantSelectionne.user.first_name}
                  </span>
                  <span className="text-indigo-500 font-mono text-xs">{etudiantSelectionne.code_permanent}</span>
                  <button
                    type="button"
                    onClick={() => setEtudiantId('')}
                    className="ml-auto text-indigo-400 hover:text-indigo-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !etudiantId || !bibliothecaireId}
              className="btn-primary"
            >
              {submitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card divide-y divide-slate-100">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 flex gap-4">
              <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse" />
            </div>
          ))}
        </div>
      ) : validations.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          Aucune validation bibliothèque trouvée.
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {validations.map(v => (
            <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">{v.etudiant_nom}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bibliothécaire : {v.bibliothecaire_nom} ·{' '}
                  {new Date(v.date_validation).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  v.en_regle ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {v.en_regle ? 'En règle' : 'Non en règle'}
                </span>
                {isBiblio && (
                  <button
                    onClick={() => handleValider(v.id, !v.en_regle)}
                    disabled={validatingId === v.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {validatingId === v.id ? '...' : v.en_regle ? 'Marquer non en règle' : 'Valider'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
