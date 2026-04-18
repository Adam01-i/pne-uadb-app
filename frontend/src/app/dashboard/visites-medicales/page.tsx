'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { VisiteMedicale, Etudiant, Medecin } from '@/lib/types';

export default function VisitesMedicalesPage() {
  const { user } = useAuth();
  const [visites, setVisites] = useState<VisiteMedicale[]>([]);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [medecins, setMedecins] = useState<Medecin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    etudiant_id: '',
    medecin_id: '',
    date_visite: '',
    resultat: '',
    aptitude: false,
  });

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<VisiteMedicale[]>('/api/services/visites-medicales/');
      setVisites(data);
      if (user?.role === 'medecin') {
        const [ets, meds] = await Promise.all([
          api.get<Etudiant[]>('/api/etudiants/'),
          api.get<Medecin[]>('/api/medecins/'),
        ]);
        setEtudiants(ets);
        setMedecins(meds);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/services/visites-medicales/', {
        etudiant_id: Number(form.etudiant_id),
        medecin_id: Number(form.medecin_id),
        date_visite: form.date_visite,
        resultat: form.resultat,
        aptitude: form.aptitude,
      });
      setShowForm(false);
      setForm({ etudiant_id: '', medecin_id: '', date_visite: '', resultat: '', aptitude: false });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  }

  const isMedecin = user?.role === 'medecin';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Visites Médicales</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isMedecin ? 'Gérer les visites médicales des étudiants' : 'Vos visites médicales'}
          </p>
        </div>
        {isMedecin && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-primary"
          >
            {showForm ? 'Annuler' : '+ Nouvelle visite'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isMedecin && showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Nouvelle visite médicale</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Étudiant</label>
              <select
                className="input-field"
                value={form.etudiant_id}
                onChange={e => setForm(f => ({ ...f, etudiant_id: e.target.value }))}
                required
              >
                <option value="">Sélectionner un étudiant</option>
                {etudiants.map(et => (
                  <option key={et.id} value={et.id}>
                    {et.user.first_name} {et.user.last_name} — {et.code_permanent}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Médecin</label>
              <select
                className="input-field"
                value={form.medecin_id}
                onChange={e => setForm(f => ({ ...f, medecin_id: e.target.value }))}
                required
              >
                <option value="">Sélectionner un médecin</option>
                {medecins.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.user.first_name} {m.user.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de visite</label>
              <input
                type="datetime-local"
                className="input-field"
                value={form.date_visite}
                onChange={e => setForm(f => ({ ...f, date_visite: e.target.value }))}
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="aptitude"
                checked={form.aptitude}
                onChange={e => setForm(f => ({ ...f, aptitude: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600"
              />
              <label htmlFor="aptitude" className="text-sm font-medium text-slate-700">
                Étudiant apte
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Résultat / Observations</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                value={form.resultat}
                onChange={e => setForm(f => ({ ...f, resultat: e.target.value }))}
                placeholder="Observations médicales..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
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
      ) : visites.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          Aucune visite médicale trouvée.
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {visites.map(v => (
            <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">{v.etudiant_nom}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Médecin : {v.medecin_nom} · {new Date(v.date_visite).toLocaleString('fr-FR')}
                </p>
                {v.resultat && (
                  <p className="text-xs text-slate-600 mt-1 italic">{v.resultat}</p>
                )}
              </div>
              <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                v.aptitude
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {v.aptitude ? 'Apte' : 'Inapte'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
