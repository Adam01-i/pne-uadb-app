'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Etudiant, Classe } from '@/lib/types';
import Modal from '@/components/Modal';
import EtudiantForm from '@/components/forms/EtudiantForm';

// ── CSV import types ──────────────────────────────────────
interface CsvRow {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  code_permanent: string;
  classe_id: string;
}

interface ImportResult {
  row: CsvRow;
  status: 'ok' | 'error';
  message?: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Etudiant[];
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return {
      prenom: obj.prenom ?? '',
      nom: obj.nom ?? '',
      email: obj.email ?? '',
      password: obj.password ?? '',
      code_permanent: obj.code_permanent ?? '',
      classe_id: obj.classe_id ?? '',
    };
  }).filter(r => r.email);
}

// ── CSV Import Modal ──────────────────────────────────────
function CsvImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get<Classe[]>('/api/classes/').then(setClasses).catch(() => {});
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setRows(parseCsv(text));
      setResults([]);
      setDone(false);
    };
    reader.readAsText(file);
  }

  function className(id: string) {
    const c = classes.find(c => String(c.id) === id);
    return c ? `${c.filiere} – ${c.niveau}` : id || '—';
  }

  async function handleImport() {
    setImporting(true);
    const res: ImportResult[] = [];
    for (const row of rows) {
      try {
        await api.post('/api/etudiants/', {
          prenom: row.prenom,
          nom: row.nom,
          email: row.email,
          password: row.password,
          code_permanent: row.code_permanent,
          classe_id: Number(row.classe_id),
        });
        res.push({ row, status: 'ok' });
      } catch (err) {
        res.push({ row, status: 'error', message: (err as Error).message });
      }
    }
    setResults(res);
    setImporting(false);
    setDone(true);
    if (res.every(r => r.status === 'ok')) onDone();
  }

  const okCount = results.filter(r => r.status === 'ok').length;
  const errCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 font-mono">
        prenom,nom,email,password,code_permanent,classe_id
      </div>
      <div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        <button className="btn-secondary w-full" onClick={() => fileRef.current?.click()}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Choisir un fichier CSV
        </button>
      </div>

      {rows.length > 0 && !done && (
        <>
          <p className="text-sm text-slate-600">{rows.length} ligne{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''}</p>
          <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {['Prénom','Nom','Email','Mot de passe','Code perm.','Classe'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{r.prenom}</td>
                    <td className="px-3 py-2">{r.nom}</td>
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2 text-slate-400">{'•'.repeat(Math.min(r.password.length, 8))}</td>
                    <td className="px-3 py-2 font-mono">{r.code_permanent}</td>
                    <td className="px-3 py-2">{className(r.classe_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? 'Importation…' : `Importer ${rows.length} étudiant${rows.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}

      {done && (
        <>
          <div className={`p-3 rounded-lg text-sm font-medium ${errCount === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {okCount} importé{okCount > 1 ? 's' : ''} avec succès{errCount > 0 ? `, ${errCount} erreur${errCount > 1 ? 's' : ''}` : ' !'}
          </div>
          {errCount > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.filter(r => r.status === 'error').map((r, i) => (
                <div key={i} className="text-xs bg-red-50 border border-red-100 rounded p-2 text-red-700">
                  <span className="font-medium">{r.row.email}</span> — {r.message}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => { onDone(); onClose(); }}>Fermer</button>
          </div>
        </>
      )}

      {rows.length === 0 && !done && (
        <p className="text-xs text-slate-400 text-center">Aucune ligne lue. Vérifiez le format du fichier.</p>
      )}
    </div>
  );
}

export default function EtudiantsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Etudiant[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; item?: Etudiant }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<Etudiant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCsv, setShowCsv] = useState(false);

  const PAGE_SIZE = 25;

  // Debounce search input — reset to page 1 on new query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (currentPage: number, query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage) });
      if (query) params.set('search', query);
      const data = await api.get<PaginatedResponse>(`/api/etudiants/?${params.toString()}`);
      setItems(data.results);
      setCount(data.count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, debouncedSearch);
  }, [load, page, debouncedSearch]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/etudiants/${confirmDelete.id}/`);
      setConfirmDelete(null);
      load(page, debouncedSearch);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);
  const isAgent = user?.role === 'agent';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Étudiants</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {count} étudiant{count !== 1 ? 's' : ''}
            {debouncedSearch && ` · résultats pour "${debouncedSearch}"`}
          </p>
        </div>
        {isAgent && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowCsv(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Importer CSV
            </button>
            <button className="btn-primary" onClick={() => setModal({ open: true })}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nouvel étudiant
            </button>
          </div>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            className="input-field pl-9"
            placeholder="Rechercher par nom, email, code permanent, filière…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setSearch('')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-50">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-48 animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded w-32 animate-pulse" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-20 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-16 animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <p className="font-medium">Aucun étudiant trouvé</p>
            <p className="text-sm mt-1">{debouncedSearch ? 'Essayez un autre terme de recherche.' : 'Commencez par ajouter un étudiant.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Étudiant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code permanent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Classe</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Niveau</th>
                  {isAgent && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(e => {
                  const name = `${e.user.first_name} ${e.user.last_name}`.trim() || e.user.username;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
                            {name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{name}</p>
                            <p className="text-xs text-slate-500">{e.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                          {e.code_permanent}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{e.classe?.filiere ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="badge bg-indigo-50 text-indigo-700">{e.classe?.niveau ?? '—'}</span>
                      </td>
                      {isAgent && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setModal({ open: true, item: e })}
                              className="btn-ghost text-xs py-1.5 px-2.5 text-slate-500 hover:text-indigo-600"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                              Modifier
                            </button>
                            <button
                              onClick={() => setConfirmDelete(e)}
                              className="btn-ghost text-xs py-1.5 px-2.5 text-slate-500 hover:text-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-slate-500">
            Page {page} sur {totalPages} · {count} résultat{count !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary py-1.5 px-3 text-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Précédent
            </button>
            <button
              className="btn-secondary py-1.5 px-3 text-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      <Modal
        open={modal.open}
        title={modal.item ? 'Modifier un étudiant' : 'Nouvel étudiant'}
        onClose={() => setModal({ open: false })}
        size="lg"
      >
        <EtudiantForm
          item={modal.item}
          onSuccess={() => { setModal({ open: false }); load(page, debouncedSearch); }}
          onCancel={() => setModal({ open: false })}
        />
      </Modal>

      {/* Modal import CSV */}
      <Modal open={showCsv} title="Importer des étudiants via CSV" onClose={() => setShowCsv(false)} size="lg">
        <CsvImportModal onClose={() => setShowCsv(false)} onDone={() => load(1, debouncedSearch)} />
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal open={!!confirmDelete} title="Confirmer la suppression" onClose={() => setConfirmDelete(null)} size="sm">
        <p className="text-slate-600 text-sm mb-6">
          Voulez-vous vraiment supprimer l&apos;étudiant{' '}
          <strong>{confirmDelete?.user.first_name} {confirmDelete?.user.last_name}</strong> ?
          Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Annuler</button>
          <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
