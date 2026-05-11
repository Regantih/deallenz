import Link from 'next/link';

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-4xl w-full space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-400">
            Pay only for the analysis you run. No subscriptions, no surprises.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Free */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="text-4xl font-bold">$0</p>
            <p className="text-gray-400 text-sm">Get started with no credit card.</p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ 1 deal memo / month</li>
              <li>✓ All 14 chapters</li>
              <li>✓ PDF + link ingestion</li>
            </ul>
            <Link
              href="/login"
              className="block text-center mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-blue-950 rounded-2xl p-6 border border-blue-700 space-y-4 relative">
            <span className="absolute top-4 right-4 text-xs bg-blue-600 px-2 py-0.5 rounded-full">Popular</span>
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="text-4xl font-bold">$49<span className="text-lg text-gray-400">/mo</span></p>
            <p className="text-gray-400 text-sm">For active angel investors.</p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ 20 deal memos / month</li>
              <li>✓ Priority processing</li>
              <li>✓ Export to PDF</li>
              <li>✓ Email support</li>
            </ul>
            <Link
              href="/login"
              className="block text-center mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Team */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
            <h2 className="text-xl font-semibold">Team</h2>
            <p className="text-4xl font-bold">$199<span className="text-lg text-gray-400">/mo</span></p>
            <p className="text-gray-400 text-sm">For VC funds and syndicates.</p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ Unlimited deal memos</li>
              <li>✓ Team seats (up to 5)</li>
              <li>✓ API access</li>
              <li>✓ Dedicated support</li>
            </ul>
            <Link
              href="/login"
              className="block text-center mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              Contact Us
            </Link>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
