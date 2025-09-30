import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLogs, type BackendLogEntry } from "@/lib/backend";
import { CopyableField } from "@/components/copyable-field";

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
  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }
  const trialEnds = createdDate.getTime() + 7 * DAY_MS;
  const remaining = trialEnds - Date.now();
  return Math.max(0, Math.ceil(remaining / DAY_MS));
}

async function getLogs(userId: number): Promise<{ logs: BackendLogEntry[]; paymentRequired: boolean }> {
  try {
    const logs = await fetchLogs(userId);
    return { logs, paymentRequired: false };
  } catch (error) {
    if (error instanceof Error && error.message === "payment_required") {
      return { logs: [], paymentRequired: true };
    }
    console.error("Failed to load logs", error);
    return { logs: [], paymentRequired: false };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth");
  }

  const { logs, paymentRequired } = await getLogs(session.user.id);
  const trialDays = computeTrialDays(session.user.created, session.user.paid);
  const sheetHref = session.user.sheetId
    ? `https://docs.google.com/spreadsheets/d/${session.user.sheetId}`
    : null;

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900">Welcome back, {session.user.email}</h1>
            <p className="text-sm text-slate-500">
              Forward your payout emails to the address below and watch your Google Sheet update in seconds.
            </p>
          </div>
          {session.user.lemonPaymentUrl && !session.user.paid && (
            <Link
              href={session.user.lemonPaymentUrl}
              className="inline-flex items-center rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Upgrade for $4/mo
            </Link>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-10 px-6 pt-10 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <CopyableField label="Forwarding address" value={session.user.forwardAddress || ""} />

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trial status</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {session.user.paid
                  ? "Pro subscriber"
                  : paymentRequired || session.user.trialExpired
                  ? "Trial expired"
                  : trialDays !== null
                  ? `${trialDays} day${trialDays === 1 ? "" : "s"} left`
                  : "Trial active"}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {session.user.paid
                ? "Thanks for supporting DriverSheet. You’re unlocked for unlimited logs."
                : paymentRequired || session.user.trialExpired
                ? "Your 7-day trial is over. Upgrade to keep syncing new payouts."
                : "Trial includes every feature. We’ll remind you before the week is up."}
            </p>
            {!session.user.paid && session.user.lemonPaymentUrl && (
              <Link
                href={session.user.lemonPaymentUrl}
                className="inline-flex w-full items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
              >
                Go to checkout
              </Link>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Google Sheet</p>
            {sheetHref ? (
              <Link
                href={sheetHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Open Sheet ↗
              </Link>
            ) : (
              <p className="text-sm text-slate-600">
                No Sheet connected yet. We’ll prompt you after sign-in or paste a Sheet URL inside settings (coming soon).
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Recent payouts</h2>
                <p className="text-xs text-slate-500">Showing the last 30 ingested earnings emails.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {logs.length} rows
              </span>
            </div>
            {paymentRequired ? (
              <div className="px-6 py-12 text-center text-sm text-slate-600">
                Your trial ended. Upgrade to resume syncing and unlock your history.
              </div>
            ) : logs.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-600">
                No logs yet. Forward your next payout email to see it appear here automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3">Order date</th>
                      <th className="px-6 py-3">Gross</th>
                      <th className="px-6 py-3">Tips</th>
                      <th className="px-6 py-3">Mileage</th>
                      <th className="px-6 py-3">Parsed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="text-slate-700">
                        <td className="px-6 py-3">{formatDate(log.orderDate)}</td>
                        <td className="px-6 py-3">{formatCurrency(log.gross)}</td>
                        <td className="px-6 py-3">{formatCurrency(log.tips)}</td>
                        <td className="px-6 py-3">{log.mileage ? `${log.mileage.toFixed(1)} mi` : "–"}</td>
                        <td className="px-6 py-3 text-xs text-slate-500">{formatDate(log.parsedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
