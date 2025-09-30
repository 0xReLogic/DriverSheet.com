import Link from "next/link";

const features = [
  {
    title: "Auto Google Sheet updates",
    description: "Forward any gig payout email and watch your Sheet update instantly—no manual typing.",
  },
  {
    title: "PDF earnings parsed",
    description: "We extract gross, tips, and mileage using battle-tested regex tuned for Uber, Lyft, DoorDash, and Instacart PDFs.",
  },
  {
    title: "7-day free trial",
    description: "Two users cover our hosting bill. Help us ship faster by becoming one of them.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <header className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-24 pt-20 sm:pt-28 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-4 py-1 text-xs font-semibold text-indigo-700">
            MVP ships in 24 hours.
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Forward gig emails → Google Sheet auto-updates
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            DriverSheet turns your weekly Uber, DoorDash, Lyft, and Instacart payout PDFs into clean rows in your own Google Sheet. Forward the email, we parse it, and the numbers just appear.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <Link
              href="/auth"
              className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Start 7-day trial
            </Link>
            <Link
              href="#demo"
              className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Watch 30s demo
            </Link>
          </div>
          <dl className="grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                <dt className="text-sm font-semibold text-slate-900">{feature.title}</dt>
                <dd className="mt-2 text-sm text-slate-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex-1">
          <div
            id="demo"
            className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-900"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">30s Demo</span>
              <p className="max-w-sm text-center text-sm text-white/70">
                Loom coming soon. For now, picture forwarding “Uber Weekly Earnings” into DriverSheet—Sheet updates instantly.
              </p>
            </div>
          </div>
        </div>
      </header>
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Zero copy/paste weekends.</h2>
            <p className="mt-4 text-slate-600">
              We built DriverSheet because our own spreadsheets were always stale. Gig drivers deserve clean books without midnight data entry. Ship your weekly PDF to us and get back on the road.
            </p>
          </div>
          <ul className="space-y-4 text-sm text-slate-600">
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <strong className="block text-slate-900">Works with Gmail auto-forward.</strong>
              Point `from:(uber|doordash|lyft)` to your DriverSheet address. Done.
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <strong className="block text-slate-900">Own your data.</strong>
              Everything lands in your Google Sheet. Delete us anytime—your history stays put.
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <strong className="block text-slate-900">$4/mo after trial.</strong>
              Lemon Squeezy handles billing. Two happy drivers keep the lights on.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
