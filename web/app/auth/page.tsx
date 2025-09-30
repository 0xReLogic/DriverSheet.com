'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signIn('google', { callbackUrl: '/dash' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-xl shadow-indigo-100/40">
        <div className="flex flex-col gap-6 text-center">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Sign in to DriverSheet</h1>
            <p className="mt-2 text-sm text-slate-500">
              Connect with Google to link your Sheet and start your 7-day free trial. We only request access to the Sheet you pick—nothing else.
            </p>
          </div>
          <div className="flex flex-col gap-4 text-left text-sm text-slate-600">
            <p className="rounded-lg bg-slate-50 px-4 py-3">
              <strong className="text-slate-900">Need a Sheet?</strong> We create one if you don’t have it yet. You can swap to your own later inside the dashboard.
            </p>
            <p className="rounded-lg bg-slate-50 px-4 py-3">
              <strong className="text-slate-900">Privacy first.</strong> Your PDFs become rows in your Sheet. No ads, no resale. Delete your account to purge all logs from our database.
            </p>
          </div>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>
          <p className="text-xs text-slate-400">
            Problems signing in? Email <a href="mailto:founders@driversheet.com" className="underline">founders@driversheet.com</a> and we’ll get you sorted.
          </p>
        </div>
      </div>
    </main>
  );
}
