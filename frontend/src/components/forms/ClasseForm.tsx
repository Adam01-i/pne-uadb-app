'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Classe } from '@/lib/types';

interface Props {
  item?: Classe;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  ufr: string;
  departement: string;
  filiere: string;
  niveau: string;
  annee_academique: string;
}

const EMPTY: FormState = { ufr: '', departement: '', filiere: '', niveau: '', annee_academique: '' };

// ── Choix conformes au système LMD / UADB ────────────────
const UFR_OPTIONS = [
  'SATIC',
  'UFR Sciences et Technologies',
  'UFR Sciences Économiques et de Gestion',
  'UFR Sciences Humaines et Sociales',
  'UFR Santé',
  'UFR Sciences Agronomiques',
];

const DEPARTEMENT_OPTIONS: Record<string, string[]> = {
  // ── SATIC ──
  'SATIC': ['TIC'],

  // ── Autres UFR ──
  'UFR Sciences et Technologies': [
    'Département Informatique',
    'Département Mathématiques',
    'Département Physique-Chimie',
    'Département Génie Civil',
  ],
  'UFR Sciences Économiques et de Gestion': [
    'Département Économie',
    'Département Gestion',
    'Département Comptabilité-Finance',
  ],
  'UFR Sciences Humaines et Sociales': [
    'Département Sociologie',
    'Département Lettres Modernes',
    'Département Histoire-Géographie',
  ],
  'UFR Santé': [
    'Département Médecine',
    'Département Pharmacie',
    'Département Infirmerie',
  ],
  'UFR Sciences Agronomiques': [
    'Département Agronomie',
    'Département Agroalimentaire',
  ],
};

const FILIERE_OPTIONS: Record<string, string[]> = {
  // ── SATIC / TIC ──
  'TIC': ['D2A', 'SRT', 'SI', 'SR'],

  // ── Autres départements ──
  'Département Informatique': [
    'Licence Informatique',
    'Master Informatique',
    'Licence Génie Logiciel',
    'Master Réseaux et Systèmes',
    'Licence Systèmes Intelligents',
  ],
  'Département Mathématiques': [
    'Licence Mathématiques',
    'Master Mathématiques Appliquées',
  ],
  'Département Physique-Chimie': [
    'Licence Physique-Chimie',
    'Master Physique',
  ],
  'Département Génie Civil': [
    'Licence Génie Civil',
    'Master Génie Civil',
  ],
  'Département Économie': [
    'Licence Économie',
    'Master Économie',
  ],
  'Département Gestion': [
    'Licence Gestion',
    'Master Management',
  ],
  'Département Comptabilité-Finance': [
    'Licence Comptabilité-Finance',
    'Master Finance',
  ],
  'Département Sociologie': [
    'Licence Sociologie',
    'Master Sciences Sociales',
  ],
  'Département Lettres Modernes': [
    'Licence Lettres Modernes',
    'Master Lettres',
  ],
  'Département Histoire-Géographie': [
    'Licence Histoire-Géographie',
    'Master Histoire',
  ],
  'Département Médecine': ['Médecine Générale'],
  'Département Pharmacie': ['Pharmacie'],
  'Département Infirmerie': ['Licence Sciences Infirmières'],
  'Département Agronomie': ['Licence Agronomie', 'Master Agronomie'],
  'Département Agroalimentaire': ['Licence Agroalimentaire'],
};

// Niveaux LMD standard
const NIVEAUX_LICENCE = ['L1', 'L2', 'L3'];
const NIVEAUX_MASTER  = ['M1', 'M2'];
const NIVEAUX_ALL     = [...NIVEAUX_LICENCE, ...NIVEAUX_MASTER];

function getNiveauxPourFiliere(filiere: string): string[] {
  // Filières SATIC explicites
  if (['D2A', 'SRT'].includes(filiere)) return NIVEAUX_LICENCE;
  if (['SI', 'SR'].includes(filiere))   return NIVEAUX_MASTER;
  // Autres filières : détection par préfixe
  const f = filiere.toLowerCase();
  if (f.startsWith('master') || f.startsWith('m ')) return NIVEAUX_MASTER;
  if (f.startsWith('licence') || f.startsWith('l ')) return NIVEAUX_LICENCE;
  return NIVEAUX_ALL;
}

function getCurrentAcademicYears(): string[] {
  const now = new Date().getFullYear();
  return [
    `${now - 1}-${now}`,
    `${now}-${now + 1}`,
    `${now + 1}-${now + 2}`,
    `${now + 2}-${now + 3}`,
    `${now + 3}-${now + 4}`,
  ];
}

export default function ClasseForm({ item, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setForm({
        ufr: item.ufr,
        departement: item.departement,
        filiere: item.filiere,
        niveau: item.niveau,
        annee_academique: item.annee_academique,
      });
    }
  }, [item]);

  function setField(field: keyof FormState, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'ufr')         { next.departement = ''; next.filiere = ''; next.niveau = ''; }
      if (field === 'departement') { next.filiere = ''; next.niveau = ''; }
      if (field === 'filiere')     { next.niveau = ''; }
      return next;
    });
  }

  const departements = DEPARTEMENT_OPTIONS[form.ufr] ?? [];
  const filieres     = FILIERE_OPTIONS[form.departement] ?? [];
  const niveaux      = form.filiere ? getNiveauxPourFiliere(form.filiere) : NIVEAUX_ALL;
  const annees       = getCurrentAcademicYears();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (item) {
        await api.patch(`/api/classes/${item.id}/`, form);
      } else {
        await api.post('/api/classes/', form);
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

      {/* UFR */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">UFR *</label>
        <select
          className="input-field"
          value={form.ufr}
          onChange={e => setField('ufr', e.target.value)}
          required
        >
          <option value="">— Sélectionner une UFR —</option>
          {UFR_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Département */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Département *</label>
        {departements.length > 0 ? (
          <select
            className="input-field"
            value={form.departement}
            onChange={e => setField('departement', e.target.value)}
            required
            disabled={!form.ufr}
          >
            <option value="">— Sélectionner un département —</option>
            {departements.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input
            className="input-field"
            value={form.departement}
            onChange={e => setField('departement', e.target.value)}
            required
            placeholder="Département…"
          />
        )}
      </div>

      {/* Filière */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Filière *</label>
        {filieres.length > 0 ? (
          <select
            className="input-field"
            value={form.filiere}
            onChange={e => setField('filiere', e.target.value)}
            required
            disabled={!form.departement}
          >
            <option value="">— Sélectionner une filière —</option>
            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        ) : (
          <input
            className="input-field"
            value={form.filiere}
            onChange={e => setField('filiere', e.target.value)}
            required
            placeholder="ex : Licence Informatique"
          />
        )}
      </div>

      {/* Niveau + Année */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Niveau *</label>
          <select
            className="input-field"
            value={form.niveau}
            onChange={e => setField('niveau', e.target.value)}
            required
            disabled={!form.filiere && !item}
          >
            <option value="">— Niveau —</option>
            {niveaux.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            {NIVEAUX_LICENCE.includes(form.niveau) && 'Licence → 25 000 FCFA'}
            {NIVEAUX_MASTER.includes(form.niveau)  && 'Master → 50 000 FCFA'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Année académique *</label>
          <select
            className="input-field"
            value={form.annee_academique}
            onChange={e => setField('annee_academique', e.target.value)}
            required
          >
            <option value="">— Année —</option>
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
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