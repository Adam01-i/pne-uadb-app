'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function PaiementSuccesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(n => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      router.replace('/dashboard/dossier');
    }
  }, [countdown, router]);

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

export default function PaiementSuccesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <PaiementSuccesContent />
    </Suspense>
  );
}
