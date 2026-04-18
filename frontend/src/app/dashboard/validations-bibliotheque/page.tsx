'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ValidationBibliotheque, Etudiant, Bibliothecaire } from '@/lib/types';

export default function ValidationsBiblioPage() {
  const { user } = useAuth();
  const [validations, setValidations] = useState<ValidationBibliotheque[]>([]);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [bibliothecaires, setBibliothecaires] = useState<Bibliothecaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validatingId, setValidatingId] = useState<number | null>(null);

  const [form, setForm] = useState({ etudiant_id: '', bibliothecaire_id: '' });

  const isBiblio = user?.role === 'biblio';

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<ValidationBibliotheque[]>('/api/services/validations-bibliotheque/');
      setValidations(data);
      if (isBiblio) {
        const [ets, biblis] = await Promise.all([
          api.get<Etudiant[]>('/api/etudiants/'),
          api.get<Bibliothecaire[]>('/api/bibliothecaires/'),
        ]);
        setEtudiants(ets);
        setBibliothecaires(biblis);
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
    try {
      await api.post('/api/services/validations-bibliotheque/', {
        etudiant_id: Number(form.etudiant_id),
        bibliothecaire_id: Number(form.bibliothecaire_id),
      });
      setShowForm(false);
      setForm({ etudiant_id: '', bibliothecaire_id: '' });
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
          <button onClick={() => setShowForm(v => !v)} className="btn-primary">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Bibliothécaire</label>
              <select
                className="input-field"
                value={form.bibliothecaire_id}
                onChange={e => setForm(f => ({ ...f, bibliothecaire_id: e.target.value }))}
                required
              >
                <option value="">Sélectionner un bibliothécaire</option>
                {bibliothecaires.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.user.first_name} {b.user.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
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
                  v.en_regle
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
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
