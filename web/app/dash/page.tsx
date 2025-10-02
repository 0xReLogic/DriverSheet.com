'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StatsCard from "@/components/StatsCard";
import LogsTable from "@/components/LogsTable";
import TrialBanner from "@/components/TrialBanner";
import { Copy, Download, DollarSign, TrendingUp, Calendar, Route, Check } from "lucide-react";
import { fetchLogs, type BackendLogEntry } from "@/lib/backend";

const DAY_MS = 86_400_000;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function computeTrialDays(created: string, paid: boolean): number | null {
  if (paid || !created) {
    return null;
  }

  const createdDate = new Date(`${created}Z`);
  const trialEnds = createdDate.getTime() + 7 * DAY_MS;
  const now = Date.now();
  
  return Math.ceil((trialEnds - now) / DAY_MS);
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<BackendLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
    }
  }, [status, router]);

  useEffect(() => {
    async function loadLogs() {
      if (!session?.user?.id) return;

      try {
        setIsLoadingLogs(true);
        const logs = await fetchLogs(session.user.id);
        setLogs(logs);
      } catch (err: any) {
        console.error('Failed to load logs:', err);
        if (err.message === 'payment_required') {
          setError('payment_required');
        } else {
          setError('Failed to load logs');
        }
      } finally {
        setIsLoadingLogs(false);
      }
    }

    if (status === 'authenticated') {
      loadLogs();
    }
  }, [session, status]);

  const computeStats = () => {
    if (logs.length === 0) {
      return {
        totalGross: 0,
        totalTips: 0,
        deliveries: 0,
        totalMiles: 0,
      };
    }

    const totalGross = logs.reduce((sum, log) => sum + log.gross, 0);
    const totalTips = logs.reduce((sum, log) => sum + log.tips, 0);
    const deliveries = logs.length;
    const totalMiles = logs.reduce((sum, log) => sum + (log.mileage || 0), 0);

    return { totalGross, totalTips, deliveries, totalMiles };
  };

  const downloadCSV = () => {
    const csvContent = [
      ['Date', 'Gross', 'Tips', 'Mileage', 'Parsed At'],
      ...logs.map(log => [
        log.orderDate,
        log.gross.toString(),
        log.tips.toString(),
        log.mileage?.toString() || '',
        log.parsedAt,
      ])
    ].map(row => row.join(',')).join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driversheet-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleUpgrade = () => {
    if (session?.user?.lemonPaymentUrl) {
      window.open(session.user.lemonPaymentUrl, '_blank');
    }
  };

  const handleCopy = () => {
    if (session?.user?.forwardAddress) {
      navigator.clipboard.writeText(session.user.forwardAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === 'loading' || isLoadingLogs) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  const stats = computeStats();
  const trialDays = computeTrialDays(session.user.created || '', session.user.paid || false);

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <section className="border-b bg-white py-8">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Track your delivery earnings and insights
              </p>
            </div>
            {session.user.lemonPaymentUrl && !session.user.paid && (
              <Link
                href={session.user.lemonPaymentUrl}
                target="_blank"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Upgrade Now
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 mt-8 space-y-8">
        {trialDays !== null && trialDays >= 0 && (
          <TrialBanner daysRemaining={trialDays} onUpgrade={handleUpgrade} />
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Your Forwarding Address</h2>
          <div className="flex items-center gap-4">
            <code className="flex-1 bg-slate-100 px-4 py-2 rounded-md text-sm">
              {session.user.forwardAddress}
            </code>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Forward your payout emails to this address to automatically track your earnings
          </p>
        </Card>

        {error === 'payment_required' ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-2">Trial Expired</h3>
              <p className="text-muted-foreground mb-6">
                Your 7-day trial has ended. Upgrade to continue tracking your earnings.
              </p>
              {session.user.lemonPaymentUrl && (
                <Button onClick={handleUpgrade} size="lg">
                  Upgrade Now
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Gross"
                value={formatCurrency(stats.totalGross)}
                icon={DollarSign}
              />
              <StatsCard
                title="Total Tips"
                value={formatCurrency(stats.totalTips)}
                icon={TrendingUp}
              />
              <StatsCard
                title="Deliveries"
                value={stats.deliveries.toString()}
                icon={Calendar}
              />
              <StatsCard
                title="Miles Driven"
                value={stats.totalMiles.toFixed(1)}
                icon={Route}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Logs</h2>
                {logs.length > 0 && (
                  <Button
                    onClick={downloadCSV}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>

              <LogsTable logs={logs} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
