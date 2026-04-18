'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Etudiant, Classe } from '@/lib/types';

interface Props {
  item?: Etudiant;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  adresse: string;
  telephone: string;
  code_permanent: string;
  classe_id: string;
}

const EMPTY: FormState = {
  prenom: '', nom: '', email: '', password: '',
  adresse: '', telephone: '', code_permanent: '', classe_id: '',
};

export default function EtudiantForm({ item, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Classe[]>('/api/classes/').then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    if (item) {
      setForm({
        prenom: item.user.first_name,
        nom: item.user.last_name,
        email: item.user.email,
        password: '',
        adresse: item.user.adresse,
        telephone: item.user.telephone,
        code_permanent: item.code_permanent,
        classe_id: String(item.classe.id),
      });
    }
  }, [item]);

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        code_permanent: form.code_permanent,
        classe_id: Number(form.classe_id),
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        ...(form.adresse && { adresse: form.adresse }),
        ...(form.telephone && { telephone: form.telephone }),
      };

      if (item) {
        // Mise à jour partielle — pas de changement de mdp si vide
        if (form.password) payload.password = form.password;
        await api.patch(`/api/etudiants/${item.id}/`, payload);
      } else {
        payload.password = form.password;
        await api.post('/api/etudiants/', payload);
      }

      onSuccess();
    } catch (err) {
      let msg = (err as Error).message;
      try { msg = JSON.parse(msg).__all__?.[0] ?? msg; } catch { /* ignore */ }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
          <input className="input-field" value={form.prenom} onChange={set('prenom')} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
          <input className="input-field" value={form.nom} onChange={set('nom')} required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
        <input type="email" className="input-field" value={form.email} onChange={set('email')} required />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {item ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
        </label>
        <input
          type="password"
          className="input-field"
          value={form.password}
          onChange={set('password')}
          required={!item}
          placeholder={item ? '••••••••' : ''}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Code permanent *</label>
        <input className="input-field" value={form.code_permanent} onChange={set('code_permanent')} required />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Classe *</label>
        <select className="input-field" value={form.classe_id} onChange={set('classe_id')} required>
          <option value="">— Sélectionner —</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.filiere} – {c.niveau} ({c.annee_academique})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
          <input className="input-field" value={form.adresse} onChange={set('adresse')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
          <input className="input-field" value={form.telephone} onChange={set('telephone')} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Enregistrement…' : item ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
