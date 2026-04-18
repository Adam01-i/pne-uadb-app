'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Classe } from '@/lib/types';
import Modal from '@/components/Modal';
import ClasseForm from '@/components/forms/ClasseForm';

export default function ClassesPage() {
  const [items, setItems] = useState<Classe[]>([]);
  const [filtered, setFiltered] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; item?: Classe }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<Classe | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Classe[]>('/api/classes/');
      setItems(data);
      setFiltered(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    if (!q) { setFiltered(items); return; }
    setFiltered(items.filter(c =>
      c.filiere.toLowerCase().includes(q) ||
      c.departement.toLowerCase().includes(q) ||
      c.ufr.toLowerCase().includes(q) ||
      c.niveau.toLowerCase().includes(q)
    ));
  }, [search, items]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/classes/${confirmDelete.id}/`);
      setConfirmDelete(null);
      load();
    } catch { /* ignore */ } finally { setDeleting(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Classes</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} classe{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true })}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouvelle classe
        </button>
      </div>

      <div className="card p-4 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input className="input-field pl-9" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-64 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-40 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="font-medium">Aucune classe trouvée</p>
            <p className="text-sm mt-1">{search ? 'Essayez un autre terme.' : 'Ajoutez une première classe.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Filière</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">UFR</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Département</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Niveau</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Année</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{c.filiere}</td>
                    <td className="px-5 py-3.5 text-slate-600">{c.ufr}</td>
                    <td className="px-5 py-3.5 text-slate-600">{c.departement}</td>
                    <td className="px-5 py-3.5"><span className="badge bg-emerald-50 text-emerald-700">{c.niveau}</span></td>
                    <td className="px-5 py-3.5 text-slate-600">{c.annee_academique}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setModal({ open: true, item: c })} className="btn-ghost text-xs py-1.5 px-2.5 text-slate-500 hover:text-indigo-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                          Modifier
                        </button>
                        <button onClick={() => setConfirmDelete(c)} className="btn-ghost text-xs py-1.5 px-2.5 text-slate-500 hover:text-red-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal.open} title={modal.item ? 'Modifier la classe' : 'Nouvelle classe'} onClose={() => setModal({ open: false })}>
        <ClasseForm item={modal.item} onSuccess={() => { setModal({ open: false }); load(); }} onCancel={() => setModal({ open: false })} />
      </Modal>

      <Modal open={!!confirmDelete} title="Confirmer la suppression" onClose={() => setConfirmDelete(null)} size="sm">
        <p className="text-slate-600 text-sm mb-6">Supprimer la classe <strong>{confirmDelete?.filiere} – {confirmDelete?.niveau}</strong> ? Cette action est irréversible.</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Annuler</button>
          <button className="btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Suppression…' : 'Supprimer'}</button>
        </div>
      </Modal>
    </div>
  );
}
