'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { Notification } from '@/lib/types';

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Notification[]>('/api/inscriptions/notifications/');
      setNotifs(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  // Fermer en cliquant hors du dropdown
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function handleOpen() {
    setOpen(o => !o);
    if (!open && nonLues > 0) {
      try {
        await api.patch('/api/inscriptions/notifications/tout-marquer-lu/', {});
        setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
      } catch { /* ignore */ }
    }
  }

  const nonLues = notifs.filter(n => !n.lu).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {notifs.length > 0 && (
              <span className="text-xs text-slate-400">{notifs.length} au total</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                Aucune notification
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.idNotification}
                  className={`px-4 py-3 ${!n.lu ? 'bg-indigo-50/60' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.lu ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500 mb-0.5">{n.emetteur}</p>
                      <p className="text-sm text-slate-700 leading-snug">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(n.dateEnvoie).toLocaleString('fr-FR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
