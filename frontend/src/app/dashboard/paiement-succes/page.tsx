'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaiementSuccesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) {
          clearInterval(timer);
          router.replace('/dashboard/dossier');
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-slate-800 mb-2">Paiement confirmé !</h1>
        <p className="text-slate-500 text-sm mb-1">
          Votre paiement a bien été reçu et votre dossier mis à jour.
        </p>
        {ref && (
          <p className="text-xs text-slate-400 mb-6 font-mono">Réf : {ref}</p>
        )}

        <p className="text-sm text-slate-500 mb-4">
          Redirection vers votre dossier dans <span className="font-semibold text-slate-700">{countdown}s</span>…
        </p>

        <Link href="/dashboard/dossier" className="btn-primary">
          Voir mon dossier maintenant
        </Link>
      </div>
    </div>
  );
}
