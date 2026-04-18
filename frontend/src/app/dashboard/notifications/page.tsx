'use client';
import { useState, useEffect } from 'react';

type TypeCible = 'ROLE' | 'CLASSE' | 'INDIVIDUEL';

type ClasseFiltre = {
  ufr: string;
  departement: string;
  filiere: string;
  niveau: string;
  annee_academique: string;
};

type OptionsClasse = {
  ufrs: string[];
  departements: string[];
  filieres: string[];
  niveaux: string[];
  annees: string[];
};

export default function BroadcastPage() {
  const [typeCible, setTypeCible] = useState<TypeCible>('ROLE');
  const [message, setMessage] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [classeFiltre, setClasseFiltre] = useState<ClasseFiltre>({
    ufr: '',
    departement: '',
    filiere: '',
    niveau: '',
    annee_academique: '',
  });
  
  // État pour stocker les options venues de la base de données
  const [options, setOptions] = useState<OptionsClasse>({
    ufrs: [],
    departements: [],
    filieres: [],
    niveaux: [],
    annees: [],
  });

  const [destinataires, setDestinataires] = useState<string[]>([]);
  const [destInput, setDestInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Charger les options de classe depuis la base de données au montage
  useEffect(() => {
  const fetchOptions = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/inscriptions/notifications/options-classes/', {
        headers: { 'Authorization': `Bearer ${token?.trim()}` }
      });
      
      if (!res.ok) {
        console.error("Erreur serveur:", res.status);
        return;
      }

      const data = await res.json();
      console.log("Données reçues :", data); // Vérifie ceci dans ta console F12
      setOptions(data);
    } catch (err) {
      console.error("Erreur réseau :", err);
    }
  };
  fetchOptions();
}, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = destInput.trim().replace(',', '');
      if (val && !destinataires.includes(val)) {
        setDestinataires(prev => [...prev, val]);
        setDestInput('');
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const token = localStorage.getItem('access_token');
    const payload: any = { type_cible: typeCible, message: message };

    if (typeCible === 'ROLE') {
      if (!selectedRole) {
        setFeedback({ type: 'error', text: "Veuillez sélectionner un rôle." });
        return;
      }
      payload.valeur = selectedRole;
    } 
    else if (typeCible === 'CLASSE') {
      payload.filtre = classeFiltre;
    } 
    else if (typeCible === 'INDIVIDUEL') {
      const finalDest = [...destinataires];
      if (destInput.trim()) finalDest.push(destInput.trim());
      if (finalDest.length === 0) {
        setFeedback({ type: 'error', text: "Veuillez saisir au moins un destinataire." });
        return;
      }
      payload.valeur = finalDest;
    }

    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/inscriptions/notifications/diffuser/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `Erreur ${res.status}`);

      setFeedback({ type: 'success', text: `Succès ! Envoyé à ${result.sent} utilisateur(s).` });
      setMessage('');
      setDestinataires([]);
      setDestInput('');
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl py-8 px-4 mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Diffusion de notifications</h1>
        <p className="text-sm text-slate-500 mt-1">Interface d'administration UADB.</p>
      </div>

      <form onSubmit={handleSend} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {/* Type de ciblage */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Ciblage</label>
          <select
            value={typeCible}
            onChange={e => setTypeCible(e.target.value as TypeCible)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
          >
            <option value="ROLE">Par groupe (rôle)</option>
            <option value="CLASSE">Par classe académique</option>
            <option value="INDIVIDUEL">Utilisateur spécifique</option>
          </select>
        </div>

        <hr className="border-slate-100" />

        {/* SECTION CLASSE DYNAMIQUE */}
        {typeCible === 'CLASSE' && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">UFR</label>
              <select 
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={classeFiltre.ufr}
                onChange={e => setClasseFiltre({...classeFiltre, ufr: e.target.value})}
              >
                <option value="">Toutes</option>
                {options.ufrs.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Département</label>
              <select 
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={classeFiltre.departement}
                onChange={e => setClasseFiltre({...classeFiltre, departement: e.target.value})}
              >
                <option value="">Tous</option>
                {options.departements.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Filière</label>
              <select 
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={classeFiltre.filiere}
                onChange={e => setClasseFiltre({...classeFiltre, filiere: e.target.value})}
              >
                <option value="">Toutes</option>
                {options.filieres.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Niveau</label>
              <select 
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={classeFiltre.niveau}
                onChange={e => setClasseFiltre({...classeFiltre, niveau: e.target.value})}
              >
                <option value="">Tous</option>
                {options.niveaux.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Année Académique</label>
              <select 
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={classeFiltre.annee_academique}
                onChange={e => setClasseFiltre({...classeFiltre, annee_academique: e.target.value})}
              >
                <option value="">Toutes</option>
                {options.annees.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Section ROLE */}
        {typeCible === 'ROLE' && (
          <div className="flex flex-wrap gap-2.5 animate-in fade-in">
            {['etudiant', 'medecin', 'bibliothecaire'].map(r => (
              <button
                key={r} type="button" onClick={() => setSelectedRole(r)}
                className={`px-4 py-2 border rounded-lg text-sm transition-all ${selectedRole === r ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}s
              </button>
            ))}
          </div>
        )}

        {/* Section INDIVIDUEL */}
        {typeCible === 'INDIVIDUEL' && (
          <div className="animate-in fade-in">
            <label className="block text-sm text-slate-600 mb-1">Destinataires (Entrée pour valider)</label>
            <div className="border border-slate-200 rounded-lg p-2 focus-within:border-indigo-400 transition-all">
              <div className="flex flex-wrap gap-2 mb-1">
                {destinataires.map(d => (
                  <span key={d} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs flex items-center gap-1">
                    {d} <button type="button" onClick={() => setDestinataires(p => p.filter(x => x !== d))} className="font-bold">×</button>
                  </span>
                ))}
              </div>
              <input value={destInput} onChange={e => setDestInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Email ou ID..." className="w-full text-sm outline-none bg-transparent" />
            </div>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Message</label>
          <textarea
            required value={message} onChange={e => setMessage(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-3 text-sm h-32 resize-none focus:border-indigo-400 outline-none"
            placeholder="Écrivez votre message..."
          />
        </div>

        {feedback && (
          <div className={`p-4 rounded-lg text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {feedback.text}
          </div>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {loading ? 'Envoi...' : 'Diffuser'}
        </button>
      </form>
    </div>
  );
}