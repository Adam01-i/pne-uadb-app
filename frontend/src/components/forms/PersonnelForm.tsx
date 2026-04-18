'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AgentScolarite, Bibliothecaire, Medecin } from '@/lib/types';

type PersonnelItem = AgentScolarite | Bibliothecaire | Medecin;
type PersonnelType = 'agents' | 'bibliothecaires' | 'medecins';

interface Props {
  type: PersonnelType;
  item?: PersonnelItem;
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
}

const EMPTY: FormState = { prenom: '', nom: '', email: '', password: '', adresse: '', telephone: '' };

export default function PersonnelForm({ type, item, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setForm({
        prenom: item.user.first_name,
        nom: item.user.last_name,
        email: item.user.email,
        password: '',
        adresse: item.user.adresse,
        telephone: item.user.telephone,
      });
    }
  }, [item]);

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        ...(form.adresse && { adresse: form.adresse }),
        ...(form.telephone && { telephone: form.telephone }),
      };

      if (item) {
        if (form.password) payload.password = form.password;
        await api.patch(`/api/${type}/${item.id}/`, payload);
      } else {
        payload.password = form.password;
        await api.post(`/api/${type}/`, payload);
      }

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
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
        <button type="button" className="btn-secondary" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Enregistrement…' : item ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
