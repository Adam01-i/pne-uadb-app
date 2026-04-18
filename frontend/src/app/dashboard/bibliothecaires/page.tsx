'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Bibliothecaire } from '@/lib/types';
import Modal from '@/components/Modal';
import PersonnelForm from '@/components/forms/PersonnelForm';

export default function BibliothecairesPage() {
  const [items, setItems] = useState<Bibliothecaire[]>([]);
  const [filtered, setFiltered] = useState<Bibliothecaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; item?: Bibliothecaire }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<Bibliothecaire | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await api.get<Bibliothecaire[]>('/api/bibliothecaires/'); setItems(data); setFiltered(data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    if (!q) { setFiltered(items); return; }
    setFiltered(items.filter(b =>
      b.user.first_name.toLowerCase().includes(q) ||
      b.user.last_name.toLowerCase().includes(q) ||
      b.user.email.toLowerCase().includes(q)
    ));
  }, [search, items]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try { await api.delete(`/api/bibliothecaires/${confirmDelete.id}/`); setConfirmDelete(null); load(); }
    catch { /* ignore */ } finally { setDeleting(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bibliothécaires</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} membre{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true })}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Ajouter
        </button>
      </div>

      <div className="card p-4 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input className="input-field pl-9" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-50">
            {[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4 px-5 py-4"><div className="w-9 h-9 bg-slate-100 rounded-full animate-pulse" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded w-48 animate-pulse" /></div></div>))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500"><p className="font-medium">Aucun bibliothécaire trouvé</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bibliothécaire</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Téléphone</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(b => {
                  const name = `${b.user.first_name} ${b.user.last_name}`.trim() || b.user.username;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-xs shrink-0">{name[0]?.toUpperCase()}</div>
                          <span className="font-medium text-slate-800">{name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{b.user.email}</td>
                      <td className="px-5 py-3.5 text-slate-600">{b.user.telephone || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setModal({ open: true, item: b })} className="btn-ghost text-xs py-1.5 px-2.5 text-slate-500 hover:text-indigo-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                            Modifier
                          </button>
                          <button onClick={() => setConfirmDelete(b)} className="btn-ghost text-xs py-1.5 px-2.5 text-slate-500 hover:text-red-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal.open} title={modal.item ? 'Modifier le bibliothécaire' : 'Ajouter un bibliothécaire'} onClose={() => setModal({ open: false })}>
        <PersonnelForm type="bibliothecaires" item={modal.item} onSuccess={() => { setModal({ open: false }); load(); }} onCancel={() => setModal({ open: false })} />
      </Modal>

      <Modal open={!!confirmDelete} title="Confirmer la suppression" onClose={() => setConfirmDelete(null)} size="sm">
        <p className="text-slate-600 text-sm mb-6">Supprimer <strong>{confirmDelete?.user.first_name} {confirmDelete?.user.last_name}</strong> ? Action irréversible.</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Annuler</button>
          <button className="btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Suppression…' : 'Supprimer'}</button>
        </div>
      </Modal>
    </div>
  );
}
