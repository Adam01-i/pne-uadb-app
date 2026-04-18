'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Etudiant, PaiementDetail, PaiementMethod, PaiementStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getMontant(niveau: string): number {
  const n = niveau.toLowerCase();
  if (n.startsWith('m') || n.includes('master')) return 50000;
  return 25000;
}

const METHOD_OPTIONS: { value: PaiementMethod; label: string; color: string }[] = [
  { value: 'orange_money', label: 'Orange Money', color: 'bg-orange-500' },
  { value: 'wave',         label: 'Wave',         color: 'bg-blue-500'   },
  { value: 'card',         label: 'Carte bancaire', color: 'bg-slate-700' },
];

// ── Simulation UI (remplace PayTech en dev) ──────────────
function SimulationPaiement({
  montant, method, onSuccess, onCancel,
}: {
  montant: number;
  method: PaiementMethod;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<'saisie' | 'attente' | 'succes'>('saisie');
  const [numero, setNumero] = useState('');

  function handleConfirmer(e: React.FormEvent) {
    e.preventDefault();
    setStep('attente');
    setTimeout(() => { setStep('succes'); }, 1500);
  }

  if (step === 'succes') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Paiement confirmé !</h2>
          <p className="text-slate-500 text-sm">{montant.toLocaleString('fr-FR')} FCFA reçus.</p>
          <button onClick={onSuccess} className="btn-primary w-full">Continuer</button>
        </div>
      </div>
    );
  }

  if (step === 'attente') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-sm">Traitement en cours…</p>
        </div>
      </div>
    );
  }

  const methodLabel = METHOD_OPTIONS.find(m => m.value === method)?.label ?? method;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* En-tête */}
        <div className="bg-indigo-600 px-6 py-5 text-white">
          <p className="text-xs uppercase tracking-widest opacity-70 mb-1">PNE UADB — Paiement simulé</p>
          <p className="text-2xl font-bold">{montant.toLocaleString('fr-FR')} FCFA</p>
          <p className="text-sm opacity-80 mt-0.5">via {methodLabel}</p>
        </div>

        <form onSubmit={handleConfirmer} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {method === 'card' ? 'Numéro de carte' : 'Numéro de téléphone'}
            </label>
            <input
              className="input-field"
              value={numero}
              onChange={e => setNumero(e.target.value)}
              placeholder={method === 'card' ? '0000 0000 0000 0000' : '77 000 00 00'}
              required
              minLength={8}
            />
          </div>

          {method !== 'card' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code OTP</label>
              <input
                className="input-field tracking-widest text-center text-lg"
                placeholder="• • • • • •"
                maxLength={6}
                required
              />
              <p className="text-xs text-slate-400 mt-1">Code de test : 000000</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" className="btn-primary flex-1">
              Payer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────
export default function PaiementsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [myProfile, setMyProfile] = useState<Etudiant | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [method, setMethod] = useState<PaiementMethod>('orange_money');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showSim, setShowSim] = useState(false);
  const [currentRef, setCurrentRef] = useState('');
  const [dejaPaye, setDejaPaye] = useState<{ montant: number; reference: string; method: string } | null>(null);

  const isEtudiant = user?.role === 'etudiant';

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const [etudiants, statut] = await Promise.all([
          api.get<Etudiant[]>('/api/etudiants/'),
          api.get<{ paye: boolean; montant?: number; reference?: string; method?: string }>('/api/services/paytech/statut/'),
        ]);
        if (etudiants.length > 0) setMyProfile(etudiants[0]);
        else setLoadError('Profil étudiant introuvable. Contactez l\'administration.');
        if (statut.paye && statut.montant && statut.reference) {
          setDejaPaye({ montant: statut.montant, reference: statut.reference, method: statut.method ?? '' });
        }
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : 'Impossible de charger votre profil.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const montant = myProfile ? getMontant(myProfile.classe?.niveau ?? '') : 0;

  async function handlePayer(e: React.FormEvent) {
    e.preventDefault();
    if (!myProfile) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const data = await api.post<{ ref_command?: string; error?: string }>(
        '/api/services/paytech/init/',
        { etudiant_id: myProfile.id, montant, method }
      );
      if (data.error) { setSubmitError(data.error); return; }
      if (data.ref_command) {
        setCurrentRef(data.ref_command);
        setShowSim(true);
      }
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur lors de l\'initiation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSimSuccess() {
    setShowSim(false);
    try {
      await fetch(`${API_URL}/api/services/paytech/callback/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_command: currentRef, status: 'success' }),
      });
    } catch { /* ignore */ }
    router.push(`/dashboard/paiement-succes?ref=${currentRef}`);
  }

  // ── Vue étudiant ─────────────────────────────────────────
  if (isEtudiant) {
    return (
      <div className="max-w-md">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Paiement des frais</h1>
          <p className="text-slate-500 text-sm mt-1">Réglez vos frais d&apos;inscription</p>
        </div>

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div className="card p-5 text-center text-sm text-red-600">{loadError}</div>
        )}

        {!loading && !loadError && dejaPaye && (
          <div className="card overflow-hidden">
            <div className="bg-emerald-600 px-6 py-5 text-white">
              <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Paiement effectué</p>
              <p className="text-3xl font-bold">{dejaPaye.montant.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                <svg className="w-6 h-6 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-emerald-800">Vos frais d&apos;inscription ont été réglés.</p>
              </div>
              <p className="text-xs text-slate-500 font-mono">Réf : {dejaPaye.reference}</p>
              <p className="text-xs text-slate-500">Mode : {METHOD_OPTIONS.find(m => m.value === dejaPaye.method)?.label ?? dejaPaye.method}</p>
            </div>
          </div>
        )}

        {!loading && !loadError && myProfile && !dejaPaye && (
          <div className="card overflow-hidden">
            {/* Montant prédéfini */}
            <div className="bg-indigo-600 px-6 py-5 text-white">
              <p className="text-xs uppercase tracking-widest opacity-70 mb-1">
                Frais — {myProfile.classe?.niveau ?? 'Licence'}
              </p>
              <p className="text-3xl font-bold">{montant.toLocaleString('fr-FR')} FCFA</p>
              <p className="text-sm opacity-75 mt-1">
                {montant === 50000 ? 'Master' : 'Licence'}
              </p>
            </div>

            <form onSubmit={handlePayer} className="p-6 space-y-4">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mode de paiement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {METHOD_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMethod(opt.value)}
                      className={`py-3 px-2 rounded-lg border-2 text-xs font-medium transition-all ${
                        method === opt.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3"
              >
                {submitting ? 'Préparation...' : `Payer ${montant.toLocaleString('fr-FR')} FCFA`}
              </button>
            </form>
          </div>
        )}

        {showSim && (
          <SimulationPaiement
            montant={montant}
            method={method}
            onSuccess={handleSimSuccess}
            onCancel={() => setShowSim(false)}
          />
        )}
      </div>
    );
  }

  // ── Vue agent ─────────────────────────────────────────────
  return <AgentPaiementsView />;
}

const STATUS_LABELS: Record<PaiementStatus, { label: string; className: string }> = {
  success:    { label: 'Validé',      className: 'bg-emerald-100 text-emerald-700' },
  pending:    { label: 'En attente',  className: 'bg-amber-100 text-amber-700' },
  processing: { label: 'En cours',    className: 'bg-blue-100 text-blue-700' },
  failed:     { label: 'Échoué',      className: 'bg-red-100 text-red-700' },
};

function AgentPaiementsView() {
  const [paiements, setPaiements] = useState<PaiementDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<PaiementDetail[]>('/api/services/paiements/')
      .then(setPaiements)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = paiements.filter(p => {
    const q = search.toLowerCase();
    return !q || p.etudiant_nom.toLowerCase().includes(q) || p.etudiant_code.toLowerCase().includes(q);
  });

  const total = paiements.filter(p => p.status === 'success').reduce((s, p) => s + p.montant, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Paiements</h1>
          <p className="text-slate-500 text-sm mt-1">Suivi des paiements des étudiants</p>
        </div>
        <div className="card px-4 py-2 text-right">
          <p className="text-xs text-slate-500">Total perçu</p>
          <p className="text-lg font-bold text-emerald-600">{total.toLocaleString('fr-FR')} FCFA</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            className="input-field pl-9"
            placeholder="Rechercher par nom ou code permanent…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4">
                <div className="h-4 bg-slate-100 rounded w-40 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-24 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-20 animate-pulse ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            {search ? 'Aucun résultat.' : 'Aucun paiement enregistré.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Étudiant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Classe</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Méthode</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => {
                  const { label, className } = STATUS_LABELS[p.status];
                  const method = METHOD_OPTIONS.find(m => m.value === p.method)?.label ?? p.method;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{p.etudiant_nom}</p>
                        <p className="text-xs text-slate-500 font-mono">{p.etudiant_code}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{p.etudiant_classe}</td>
                      <td className="px-5 py-3.5 text-slate-600">{method}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {p.montant.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {new Date(p.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
