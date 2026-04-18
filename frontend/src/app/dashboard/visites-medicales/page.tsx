'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { VisiteMedicale, Etudiant, PlanningVisiteMedicale } from '@/lib/types';

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface ClassesDisponibles {
  ufrs: string[];
  departements: string[];
  niveaux: string[];
  classes: { id: number; ufr: string; departement: string; niveau: string; filiere: string; annee_academique: string }[];
}

interface GroupeLocal {
  numero: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  etudiants: Etudiant[];
  codeFiltreRecherche: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function repartirAlphabetique(etudiants: Etudiant[], nbGroupes: number): Etudiant[][] {
  const tries = [...etudiants].sort((a, b) =>
    `${a.user.last_name}${a.user.first_name}`.localeCompare(
      `${b.user.last_name}${b.user.first_name}`,
      'fr',
    ),
  );
  const groupes: Etudiant[][] = Array.from({ length: nbGroupes }, () => []);
  tries.forEach((et, i) => groupes[i % nbGroupes].push(et));
  return groupes;
}

// ─── CarteGroupe (wizard étape 2) ─────────────────────────────────────────────

function CarteGroupe({
  groupe,
  onChange,
}: {
  groupe: GroupeLocal;
  onChange: (g: Partial<GroupeLocal>) => void;
}) {
  const etudiantsFiltres = useMemo(() => {
    const q = groupe.codeFiltreRecherche.trim().toLowerCase();
    if (!q) return groupe.etudiants;
    return groupe.etudiants.filter(
      et =>
        et.code_permanent.toLowerCase().includes(q) ||
        `${et.user.last_name} ${et.user.first_name}`.toLowerCase().includes(q),
    );
  }, [groupe.etudiants, groupe.codeFiltreRecherche]);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm">
          Groupe {groupe.numero}
          <span className="ml-2 text-slate-400 font-normal">({groupe.etudiants.length} étudiant{groupe.etudiants.length > 1 ? 's' : ''})</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input type="date" className="input-field text-sm" value={groupe.date} onChange={e => onChange({ date: e.target.value })} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Heure début</label>
          <input type="time" className="input-field text-sm" value={groupe.heure_debut} onChange={e => onChange({ heure_debut: e.target.value })} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Heure fin</label>
          <input type="time" className="input-field text-sm" value={groupe.heure_fin} onChange={e => onChange({ heure_fin: e.target.value })} required />
        </div>
      </div>

      <input
        type="text"
        className="input-field text-sm"
        placeholder="Filtrer par code permanent ou nom..."
        value={groupe.codeFiltreRecherche}
        onChange={e => onChange({ codeFiltreRecherche: e.target.value })}
      />

      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
        {etudiantsFiltres.length === 0 ? (
          <p className="p-3 text-xs text-slate-400 text-center">Aucun étudiant trouvé</p>
        ) : (
          etudiantsFiltres.map(et => (
            <div key={et.id} className="px-3 py-2 flex items-center justify-between">
              <span className="text-sm text-slate-700">{et.user.last_name} {et.user.first_name}</span>
              <span className="text-xs text-slate-400 font-mono">{et.code_permanent}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Section validation visites (par planning) ───────────────────────────────

function ValidationPlanningSection({
  planning,
  medecinId,
  visitesExistantes,
  onVisiteCreee,
}: {
  planning: PlanningVisiteMedicale;
  medecinId: string;
  visitesExistantes: VisiteMedicale[];
  onVisiteCreee: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [enCours, setEnCours] = useState<number | null>(null);
  const [erreur, setErreur] = useState('');

  // index des étudiants déjà visités (par nom complet — car VisiteMedicale ne retourne pas l'id)
  const nomsDejaPasses = new Set(visitesExistantes.map(v => v.etudiant_nom));

  async function valider(etudiant: Etudiant, aptitude: boolean) {
    if (!medecinId) {
      setErreur('Identifiant médecin introuvable. Rechargez la page.');
      return;
    }
    setEnCours(etudiant.id);
    setErreur('');
    try {
      await api.post('/api/services/visites-medicales/', {
        etudiant_id: etudiant.id,
        medecin_id: Number(medecinId),
        date_visite: new Date().toISOString(),
        aptitude,
        resultat: aptitude ? 'Apte à la réinscription' : 'Inapte — voir médecin',
      });
      onVisiteCreee();
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : 'Erreur lors de la validation');
    } finally {
      setEnCours(null);
    }
  }

  const totalEtudiants = planning.creneaux.reduce((s, c) => s + c.etudiants.length, 0);
  const totalValides = planning.creneaux
    .flatMap(c => c.etudiants)
    .filter(et => nomsDejaPasses.has(`${et.user.first_name} ${et.user.last_name}`.trim())).length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* En-tête planning */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div>
          <p className="font-medium text-slate-800 text-sm">{planning.classe_info}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Dr. {planning.medecin_nom} · {new Date(planning.created_at).toLocaleDateString('fr-FR')}
            {' · '}
            <span className={totalValides === totalEtudiants && totalEtudiants > 0 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
              {totalValides}/{totalEtudiants} validé(s)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
            {planning.creneaux.length} groupe{planning.creneaux.length > 1 ? 's' : ''}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Corps : groupes + étudiants */}
      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {erreur && (
            <div className="px-4 py-2 bg-red-50 text-red-700 text-xs">{erreur}</div>
          )}
          {planning.creneaux.map(creneau => (
            <div key={creneau.id} className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Groupe {creneau.numero_groupe} — {new Date(creneau.date).toLocaleDateString('fr-FR')} · {creneau.heure_debut}–{creneau.heure_fin}
              </p>
              <div className="space-y-2">
                {creneau.etudiants.map(et => {
                  const nom = `${et.user.first_name} ${et.user.last_name}`.trim();
                  const visite = visitesExistantes.find(v => v.etudiant_nom === nom);
                  const loading = enCours === et.id;

                  return (
                    <div key={et.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm text-slate-700 font-medium">{et.user.last_name} {et.user.first_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{et.code_permanent}</p>
                      </div>
                      <div className="shrink-0">
                        {visite ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${visite.aptitude ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {visite.aptitude ? '✓ Apte' : '✗ Inapte'}
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              disabled={loading}
                              onClick={() => valider(et, true)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors border border-emerald-200"
                            >
                              {loading ? '…' : '✓ Apte'}
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => valider(et, false)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
                            >
                              {loading ? '…' : '✗ Inapte'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function VisitesMedicalesPage() {
  const { user } = useAuth();
  const isMedecin = user?.role === 'medecin';

  const [visites, setVisites] = useState<VisiteMedicale[]>([]);
  const [plannings, setPlannings] = useState<PlanningVisiteMedicale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showWizard, setShowWizard] = useState(false);
  const [etape, setEtape] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  const [classesData, setClassesData] = useState<ClassesDisponibles | null>(null);
  const [ufr, setUfr] = useState('');
  const [departement, setDepartement] = useState('');
  const [niveau, setNiveau] = useState('');
  const [etudiantsClasse, setEtudiantsClasse] = useState<Etudiant[]>([]);
  const [loadingEtudiants, setLoadingEtudiants] = useState(false);

  const [medecinId, setMedecinId] = useState('');
  const [nbGroupes, setNbGroupes] = useState(3);
  const [groupes, setGroupes] = useState<GroupeLocal[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [visits, plans] = await Promise.all([
        api.get<VisiteMedicale[]>('/api/services/visites-medicales/'),
        api.get<PlanningVisiteMedicale[]>('/api/services/plannings-visites/'),
      ]);
      setVisites(visits);
      setPlannings(plans);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (isMedecin && !medecinId) {
      api.get<{ id: number; user: { id: number } }[]>('/api/medecins/')
        .then(meds => {
          const moi = meds.find(m => m.user.id === user?.id);
          if (moi) setMedecinId(String(moi.id));
        })
        .catch(() => {});
    }
  }, [user]);

  async function ouvrirWizard() {
    setShowWizard(true);
    setEtape(1);
    setUfr(''); setDepartement(''); setNiveau('');
    setEtudiantsClasse([]); setGroupes([]);

    if (!classesData) {
      const data = await api.get<ClassesDisponibles>('/api/services/classes-disponibles/');
      setClassesData(data);
    }
    if (!medecinId) {
      const meds = await api.get<{ id: number; user: { id: number } }[]>('/api/medecins/');
      const moi = meds.find(m => m.user.id === user?.id);
      if (moi) setMedecinId(String(moi.id));
    }
  }

  async function chargerEtudiants() {
    if (!ufr || !departement || !niveau) return;
    setLoadingEtudiants(true);
    try {
      const ets = await api.get<Etudiant[]>(
        `/api/services/etudiants-par-classe/?ufr=${encodeURIComponent(ufr)}&departement=${encodeURIComponent(departement)}&niveau=${encodeURIComponent(niveau)}`,
      );
      setEtudiantsClasse(ets);
      if (ets.length === 0) { setError('Aucun étudiant trouvé pour cette classe.'); return; }
      setError('');
      setEtape(2);
      diviserGroupes(ets, nbGroupes);
    } finally {
      setLoadingEtudiants(false);
    }
  }

  function diviserGroupes(ets: Etudiant[], nb: number) {
    const partitions = repartirAlphabetique(ets, nb);
    setGroupes(partitions.map((part, i) => ({
      numero: i + 1, date: '', heure_debut: '', heure_fin: '',
      etudiants: part, codeFiltreRecherche: '',
    })));
  }

  function updateGroupe(index: number, patch: Partial<GroupeLocal>) {
    setGroupes(prev => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function changerNbGroupes(nb: number) {
    setNbGroupes(nb);
    if (etudiantsClasse.length > 0) diviserGroupes(etudiantsClasse, nb);
  }

  async function validerPlanning() {
    if (!medecinId) { setError('Médecin introuvable.'); return; }
    const classeCorrespondante = classesData?.classes.find(
      c => c.ufr === ufr && c.departement === departement && c.niveau === niveau,
    );
    if (!classeCorrespondante) { setError('Classe introuvable.'); return; }
    if (groupes.some(g => !g.date || !g.heure_debut || !g.heure_fin)) {
      setError('Veuillez renseigner la date et les horaires de chaque groupe.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/services/plannings-visites/', {
        medecin_id: Number(medecinId),
        classe_id: classeCorrespondante.id,
        creneaux: groupes.map(g => ({
          numero_groupe: g.numero,
          date: g.date,
          heure_debut: g.heure_debut,
          heure_fin: g.heure_fin,
          etudiant_ids: g.etudiants.map(e => e.id),
        })),
      });
      setShowWizard(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création du planning');
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
    return [...new Set(classesData.classes.filter(c => c.ufr === ufr && c.departement === departement).map(c => c.niveau))].sort();
  }, [classesData, ufr, departement]);

  return (
    <div>
      {/* ── En-tête ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Visites Médicales</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isMedecin ? 'Planifier et valider les visites médicales' : 'Vos visites médicales'}
          </p>
        </div>
        {isMedecin && !showWizard && (
          <button onClick={ouvrirWizard} className="btn-primary">+ Nouveau planning</button>
        )}
        {isMedecin && showWizard && (
          <button onClick={() => setShowWizard(false)} className="btn-secondary">Annuler</button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* ── Wizard ───────────────────────────────────────── */}
      {isMedecin && showWizard && (
        <div className="card p-5 mb-6 space-y-5">
          <div className="flex items-center gap-2 text-sm">
            {(['1. Classe', '2. Groupes', '3. Confirmation'] as const).map((label, i) => (
              <span key={label} className={`px-3 py-1 rounded-full text-xs font-medium ${
                etape === i + 1 ? 'bg-indigo-100 text-indigo-700'
                : etape > i + 1 ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-400'
              }`}>{label}</span>
            ))}
          </div>

          {etape === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800">Sélectionner la classe</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">UFR</label>
                  <select className="input-field" value={ufr} onChange={e => { setUfr(e.target.value); setDepartement(''); setNiveau(''); }} required>
                    <option value="">Sélectionner une UFR</option>
                    {(classesData?.ufrs ?? []).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Département</label>
                  <select className="input-field" value={departement} onChange={e => { setDepartement(e.target.value); setNiveau(''); }} required disabled={!ufr}>
                    <option value="">Sélectionner un département</option>
                    {departementsFiltes.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
                  <select className="input-field" value={niveau} onChange={e => setNiveau(e.target.value)} required disabled={!departement}>
                    <option value="">Sélectionner un niveau</option>
                    {niveauxFiltres.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={chargerEtudiants} disabled={!ufr || !departement || !niveau || loadingEtudiants} className="btn-primary">
                  {loadingEtudiants ? 'Chargement...' : 'Charger les étudiants →'}
                </button>
              </div>
            </div>
          )}

          {etape === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">
                  Configurer les groupes
                  <span className="ml-2 text-sm font-normal text-slate-500">({etudiantsClasse.length} étudiants — {ufr} › {departement} › {niveau})</span>
                </h2>
                <button onClick={() => setEtape(1)} className="text-xs text-indigo-600 hover:underline">← Modifier la classe</button>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Nombre de groupes :</label>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => changerNbGroupes(n)} className={`w-8 h-8 rounded-full text-sm font-medium border transition-colors ${
                    nbGroupes === n ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                  }`}>{n}</button>
                ))}
              </div>
              <div className="space-y-4">
                {groupes.map((g, i) => (
                  <CarteGroupe key={g.numero} groupe={g} onChange={patch => updateGroupe(i, patch)} />
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={() => setEtape(3)} className="btn-primary">Prévisualiser →</button>
              </div>
            </div>
          )}

          {etape === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Confirmation du planning</h2>
                <button onClick={() => setEtape(2)} className="text-xs text-indigo-600 hover:underline">← Modifier les groupes</button>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
                <p><span className="font-medium">Classe :</span> {ufr} › {departement} › {niveau}</p>
                <p><span className="font-medium">Médecin :</span> Dr. {user?.last_name} {user?.first_name}</p>
                <p><span className="font-medium">Groupes :</span> {groupes.length} ({etudiantsClasse.length} étudiants au total)</p>
              </div>
              <div className="space-y-3">
                {groupes.map(g => (
                  <div key={g.numero} className="border border-slate-200 rounded-lg p-3 text-sm">
                    <p className="font-medium text-slate-800 mb-1">
                      Groupe {g.numero} — {g.date} de {g.heure_debut} à {g.heure_fin}
                      <span className="ml-2 text-slate-400 font-normal">({g.etudiants.length} étudiants)</span>
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {g.etudiants.slice(0, 5).map(e => `${e.user.last_name} ${e.user.first_name}`).join(', ')}
                      {g.etudiants.length > 5 && ` … +${g.etudiants.length - 5} autres`}
                    </p>
                  </div>
                ))}
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800">
                En validant, chaque étudiant recevra une notification interne avec les détails de son créneau.
              </div>
              <div className="flex justify-end">
                <button onClick={validerPlanning} disabled={submitting} className="btn-primary">
                  {submitting ? 'Envoi en cours...' : 'Valider et envoyer les notifications'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Plannings : validation des visites ───────────── */}
      {isMedecin && !loading && plannings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Valider les visites</h2>
          <div className="space-y-3">
            {plannings.map(p => (
              <ValidationPlanningSection
                key={p.id}
                planning={p}
                medecinId={medecinId}
                visitesExistantes={visites}
                onVisiteCreee={load}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Visites individuelles ─────────────────────────── */}
      {!isMedecin && (
        <>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Mes visites médicales</h2>
          {loading ? (
            <div className="card divide-y divide-slate-100">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 flex gap-4">
                  <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse" />
                </div>
              ))}
            </div>
          ) : visites.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">Aucune visite médicale trouvée.</div>
          ) : (
            <div className="card divide-y divide-slate-100">
              {visites.map(v => (
                <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{v.etudiant_nom}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Médecin : {v.medecin_nom} · {new Date(v.date_visite).toLocaleString('fr-FR')}
                    </p>
                    {v.resultat && <p className="text-xs text-slate-600 mt-1 italic">{v.resultat}</p>}
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${v.aptitude ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {v.aptitude ? 'Apte' : 'Inapte'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isMedecin && !loading && plannings.length === 0 && (
        <div className="card p-8 text-center text-slate-500 text-sm">
          Aucun planning créé. Commencez par créer un planning pour planifier les visites.
        </div>
      )}
    </div>
  );
}
