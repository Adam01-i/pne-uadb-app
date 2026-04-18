'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { VisiteMedicale, Etudiant, Medecin, CreneauVisite } from '@/lib/types';
import Modal from '@/components/Modal';

const UFR_OPTIONS = [
  'SATIC',
  'UFR Sciences et Technologies',
  'UFR Sciences Économiques et de Gestion',
  'UFR Sciences Humaines et Sociales',
  'UFR Santé',
  'UFR Sciences Agronomiques',
];

const DEPARTEMENT_OPTIONS: Record<string, string[]> = {
  'SATIC': ['TIC'],
  'UFR Sciences et Technologies': ['Département Informatique','Département Mathématiques','Département Physique-Chimie','Département Génie Civil'],
  'UFR Sciences Économiques et de Gestion': ['Département Économie','Département Gestion','Département Comptabilité-Finance'],
  'UFR Sciences Humaines et Sociales': ['Département Sociologie','Département Lettres Modernes','Département Histoire-Géographie'],
  'UFR Santé': ['Département Médecine','Département Pharmacie','Département Infirmerie'],
  'UFR Sciences Agronomiques': ['Département Agronomie','Département Agroalimentaire'],
};

const FILIERE_OPTIONS: Record<string, string[]> = {
  'TIC': ['D2A','SRT','SI','SR'],
  'Département Informatique': ['Licence Informatique','Master Informatique','Licence Génie Logiciel','Master Réseaux et Systèmes','Licence Systèmes Intelligents'],
  'Département Mathématiques': ['Licence Mathématiques','Master Mathématiques Appliquées'],
  'Département Physique-Chimie': ['Licence Physique-Chimie','Master Physique'],
  'Département Génie Civil': ['Licence Génie Civil','Master Génie Civil'],
  'Département Économie': ['Licence Économie','Master Économie'],
  'Département Gestion': ['Licence Gestion','Master Management'],
  'Département Comptabilité-Finance': ['Licence Comptabilité-Finance','Master Finance'],
  'Département Sociologie': ['Licence Sociologie','Master Sciences Sociales'],
  'Département Lettres Modernes': ['Licence Lettres Modernes','Master Lettres'],
  'Département Histoire-Géographie': ['Licence Histoire-Géographie','Master Histoire'],
  'Département Médecine': ['Médecine Générale'],
  'Département Pharmacie': ['Pharmacie'],
  'Département Infirmerie': ['Licence Sciences Infirmières'],
  'Département Agronomie': ['Licence Agronomie','Master Agronomie'],
  'Département Agroalimentaire': ['Licence Agroalimentaire'],
};

const NIVEAUX_LICENCE = ['L1','L2','L3'];
const NIVEAUX_MASTER  = ['M1','M2'];
const NIVEAUX_ALL     = [...NIVEAUX_LICENCE,...NIVEAUX_MASTER];

function getNiveaux(filiere: string): string[] {
  if (['D2A','SRT'].includes(filiere)) return NIVEAUX_LICENCE;
  if (['SI','SR'].includes(filiere))   return NIVEAUX_MASTER;
  const f = filiere.toLowerCase();
  if (f.startsWith('master'))  return NIVEAUX_MASTER;
  if (f.startsWith('licence')) return NIVEAUX_LICENCE;
  return NIVEAUX_ALL;
}

type Tab = 'creneau' | 'visite';

export default function VisitesMedicalesPage() {
  const { user } = useAuth();
  const isMedecin = user?.role === 'medecin';

  const [tab, setTab] = useState<Tab>('creneau');

  // ── Filtres partagés ──────────────────────────────────────
  const [ufr,         setUfr]         = useState('');
  const [departement, setDepartement] = useState('');
  const [filiere,     setFiliere]     = useState('');
  const [niveau,      setNiveau]      = useState('');

  // ── Créneau ───────────────────────────────────────────────
  const [creneauForm, setCreneauForm] = useState({ medecin_id: '', date_debut: '', date_fin: '' });
  const [creneaux,    setCreneaux]    = useState<CreneauVisite[]>([]);
  const [savingCreneau, setSavingCreneau] = useState(false);
  const [creneauSuccess, setCreneauSuccess] = useState('');

  // ── Recherche étudiant ────────────────────────────────────
  const [codePermanent,  setCodePermanent]  = useState('');
  const [etudiantTrouve, setEtudiantTrouve] = useState<Etudiant | null>(null);
  const [rechercheFaite, setRechercheFaite] = useState(false);
  const [allEtudiants,   setAllEtudiants]   = useState<Etudiant[]>([]);

  // ── Données ───────────────────────────────────────────────
  const [medecins,       setMedecins]       = useState<Medecin[]>([]);
  const [visites,        setVisites]        = useState<VisiteMedicale[]>([]);
  const [loadingVisites, setLoadingVisites] = useState(true);
  const [error,          setError]          = useState('');

  // ── Modal visite ──────────────────────────────────────────
  const [activeEtudiant, setActiveEtudiant] = useState<Etudiant | null>(null);
  const [visitForm, setVisitForm] = useState({ medecin_id: '', date_visite: '', resultat: '', aptitude: false });
  const [submitting, setSubmitting] = useState(false);

  async function loadVisites() {
    setLoadingVisites(true);
    try {
      const data = await api.get<VisiteMedicale[]>('/api/services/visites-medicales/');
      setVisites(data);
    } catch { setError('Erreur de chargement des visites'); }
    finally { setLoadingVisites(false); }
  }

  async function loadCreneaux() {
    try {
      const data = await api.get<CreneauVisite[]>('/api/services/creneaux/');
      setCreneaux(data);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadVisites();
    loadCreneaux();
  }, []);

  useEffect(() => {
    if (isMedecin) {
      api.get<Medecin[]>('/api/medecins/').then(setMedecins).catch(() => {});
    }
  }, [isMedecin]);

  // Charger étudiants du groupe quand niveau change
  useEffect(() => {
    if (!niveau || !filiere) { setAllEtudiants([]); resetRecherche(); return; }
    api.get<Etudiant[]>('/api/etudiants/')
      .then(data => setAllEtudiants(data.filter(et =>
        et.classe.ufr === ufr &&
        et.classe.departement === departement &&
        et.classe.filiere === filiere &&
        et.classe.niveau === niveau
      )))
      .catch(() => setError('Erreur de chargement des étudiants'));
  }, [niveau]);

  // Reset cascade
  function selectUfr(v: string)         { setUfr(v); setDepartement(''); setFiliere(''); setNiveau(''); resetRecherche(); }
  function selectDepartement(v: string) { setDepartement(v); setFiliere(''); setNiveau(''); resetRecherche(); }
  function selectFiliere(v: string)     { setFiliere(v); setNiveau(''); resetRecherche(); }
  function selectNiveau(v: string)      { setNiveau(v); resetRecherche(); }

  function resetRecherche() {
    setCodePermanent('');
    setEtudiantTrouve(null);
    setRechercheFaite(false);
  }

  function rechercherEtudiant() {
    setRechercheFaite(true);
    const trouve = allEtudiants.find(
      et => et.code_permanent.toLowerCase() === codePermanent.trim().toLowerCase()
    );
    setEtudiantTrouve(trouve ?? null);
  }

  function getVisite(nom: string) {
    return visites.find(v => v.etudiant_nom === nom);
  }

  // Soumettre créneau
  async function handleCreneauSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreneauSuccess('');
    setSavingCreneau(true);
    try {
      await api.post('/api/services/creneaux/', {
        medecin_id:  Number(creneauForm.medecin_id),
        ufr,
        departement,
        filiere,
        niveau,
        date_debut: creneauForm.date_debut,
        date_fin:   creneauForm.date_fin,
      });
      await loadCreneaux();
      setCreneauSuccess(`Créneau fixé pour ${filiere} ${niveau} du ${creneauForm.date_debut} au ${creneauForm.date_fin}`);
      setCreneauForm({ medecin_id: '', date_debut: '', date_fin: '' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSavingCreneau(false);
    }
  }

  // Soumettre visite
  async function handleVisiteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeEtudiant) return;
    setSubmitting(true);
    try {
      await api.post('/api/services/visites-medicales/', {
        etudiant_id: activeEtudiant.id,
        medecin_id:  Number(visitForm.medecin_id),
        date_visite: visitForm.date_visite,
        resultat:    visitForm.resultat,
        aptitude:    visitForm.aptitude,
      });
      await loadVisites();
      setActiveEtudiant(null);
      setVisitForm({ medecin_id: '', date_visite: '', resultat: '', aptitude: false });
      resetRecherche();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  const departements = DEPARTEMENT_OPTIONS[ufr]      ?? [];
  const filieres     = FILIERE_OPTIONS[departement]  ?? [];
  const niveaux      = filiere ? getNiveaux(filiere) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Visites Médicales</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isMedecin ? 'Gérer les créneaux et les visites médicales' : 'Vos visites médicales'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* ── Onglets (médecin seulement) ── */}
      {isMedecin && (
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setTab('creneau')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'creneau'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Fixer un créneau
          </button>
          <button
            onClick={() => setTab('visite')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'visite'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Enregistrer une visite
          </button>
        </div>
      )}

      {/* ── Filtres partagés ── */}
      {isMedecin && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-slate-700 mb-4">Sélectionner le groupe</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">UFR</label>
              <select className="input-field" value={ufr} onChange={e => selectUfr(e.target.value)}>
                <option value="">— UFR —</option>
                {UFR_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Département</label>
              <select className="input-field" value={departement} onChange={e => selectDepartement(e.target.value)} disabled={!ufr}>
                <option value="">— Département —</option>
                {departements.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Filière</label>
              <select className="input-field" value={filiere} onChange={e => selectFiliere(e.target.value)} disabled={!departement}>
                <option value="">— Filière —</option>
                {filieres.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Niveau</label>
              <select className="input-field" value={niveau} onChange={e => selectNiveau(e.target.value)} disabled={!filiere}>
                <option value="">— Niveau —</option>
                {niveaux.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Onglet Créneau ── */}
      {isMedecin && tab === 'creneau' && (
        <>
          {creneauSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
              {creneauSuccess}
            </div>
          )}

          {niveau ? (
            <div className="card p-5 mb-6">
              <h2 className="font-semibold text-slate-700 mb-4">
                Fixer un créneau pour {filiere} {niveau}
              </h2>
              <form onSubmit={handleCreneauSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Médecin responsable</label>
                    <select className="input-field" value={creneauForm.medecin_id}
                      onChange={e => setCreneauForm(f => ({ ...f, medecin_id: e.target.value }))} required>
                      <option value="">Sélectionner un médecin</option>
                      {medecins.map(m => (
                        <option key={m.id} value={m.id}>{m.user.first_name} {m.user.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
                    <input type="date" className="input-field" value={creneauForm.date_debut}
                      onChange={e => setCreneauForm(f => ({ ...f, date_debut: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date de fin</label>
                    <input type="date" className="input-field" value={creneauForm.date_fin}
                      min={creneauForm.date_debut}
                      onChange={e => setCreneauForm(f => ({ ...f, date_fin: e.target.value }))} required />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={savingCreneau} className="btn-primary">
                    {savingCreneau ? 'Enregistrement...' : 'Confirmer le créneau'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-400 text-sm mb-6">
              Sélectionnez un groupe ci-dessus pour fixer un créneau.
            </div>
          )}

          {/* Liste des créneaux existants */}
          <div className="card">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700">Créneaux enregistrés</p>
            </div>
            {creneaux.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucun créneau enregistré.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {creneaux.map(c => (
                  <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{c.filiere} — {c.niveau}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.ufr} / {c.departement} · Médecin : {c.medecin_nom}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {new Date(c.date_debut).toLocaleDateString('fr-FR')} → {new Date(c.date_fin).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Onglet Visite ── */}
      {(tab === 'visite' || !isMedecin) && (
        <>
          {isMedecin && niveau && (
            <div className="card p-5 mb-6">
              <h2 className="font-semibold text-slate-700 mb-4">
                Rechercher l'étudiant par code permanent
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Ex: ETU001"
                  value={codePermanent}
                  onChange={e => { setCodePermanent(e.target.value); setRechercheFaite(false); setEtudiantTrouve(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') rechercherEtudiant(); }}
                />
                <button onClick={rechercherEtudiant} disabled={!codePermanent.trim()} className="btn-primary px-5">
                  Rechercher
                </button>
              </div>

              {rechercheFaite && (
                <div className="mt-4">
                  {etudiantTrouve ? (() => {
                    const nom    = `${etudiantTrouve.user.first_name} ${etudiantTrouve.user.last_name}`;
                    const visite = getVisite(nom);
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 text-sm">{nom}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {etudiantTrouve.code_permanent} · {etudiantTrouve.classe.filiere} {etudiantTrouve.classe.niveau}
                          </p>
                        </div>
                        {visite ? (
                          <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            visite.aptitude ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {visite.aptitude ? 'Visite enregistrée — Apte' : 'Visite enregistrée — Inapte'}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveEtudiant(etudiantTrouve);
                              setVisitForm({ medecin_id: '', date_visite: '', resultat: '', aptitude: false });
                            }}
                            className="btn-primary text-xs py-1.5 px-3 shrink-0"
                          >
                            Enregistrer visite
                          </button>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                      Aucun étudiant trouvé avec le code <strong>{codePermanent}</strong> dans ce groupe.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Toutes les visites */}
          <div className="card">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700">Toutes les visites enregistrées</p>
            </div>
            {loadingVisites ? (
              <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
            ) : visites.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucune visite enregistrée.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visites.map(v => (
                  <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{v.etudiant_nom}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Médecin : {v.medecin_nom} · {new Date(v.date_visite).toLocaleString('fr-FR')}
                      </p>
                      {v.resultat && <p className="text-xs text-slate-600 mt-1 italic">{v.resultat}</p>}
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      v.aptitude ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {v.aptitude ? 'Apte' : 'Inapte'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modal formulaire visite ── */}
      <Modal
        open={!!activeEtudiant}
        title={`Visite — ${activeEtudiant?.user.first_name} ${activeEtudiant?.user.last_name}`}
        onClose={() => setActiveEtudiant(null)}
      >
        <form onSubmit={handleVisiteSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Médecin</label>
              <select className="input-field" value={visitForm.medecin_id}
                onChange={e => setVisitForm(f => ({ ...f, medecin_id: e.target.value }))} required>
                <option value="">Sélectionner un médecin</option>
                {medecins.map(m => (
                  <option key={m.id} value={m.id}>{m.user.first_name} {m.user.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de visite</label>
              <input type="datetime-local" className="input-field" value={visitForm.date_visite}
                onChange={e => setVisitForm(f => ({ ...f, date_visite: e.target.value }))} required />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="aptitude" checked={visitForm.aptitude}
                onChange={e => setVisitForm(f => ({ ...f, aptitude: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
              <label htmlFor="aptitude" className="text-sm font-medium text-slate-700">Étudiant apte</label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Résultat / Observations</label>
              <textarea className="input-field resize-none" rows={3} value={visitForm.resultat}
                onChange={e => setVisitForm(f => ({ ...f, resultat: e.target.value }))}
                placeholder="Observations médicales..." />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setActiveEtudiant(null)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}