import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-3xl w-full text-center space-y-8">
        {/* Logo / Brand */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">
            Deal<span className="text-blue-400">Lens</span>
          </h1>
          <p className="text-gray-400 text-lg">
            AI-powered deal analysis for venture investors
          </p>
          <p className="text-gray-500 text-sm">
            by Marketlogic Investors LLC
          </p>
        </div>

        {/* Value prop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="font-semibold text-blue-300 mb-1">Upload a Deal</h2>
            <p className="text-gray-400 text-sm">
              Drop a PDF deck or paste a link. DealLens extracts the signal.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="font-semibold text-blue-300 mb-1">AI Memo</h2>
            <p className="text-gray-400 text-sm">
              14-chapter editorial memo across 5 acts — thesis, team, market, risks, verdict.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="font-semibold text-blue-300 mb-1">Cited Evidence</h2>
            <p className="text-gray-400 text-sm">
              Every claim traced back to source material. No hallucinations.
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors border border-gray-700"
          >
            View Pricing
          </Link>
        </div>

        <p className="text-gray-600 text-xs">
          &copy; {new Date().getFullYear()} Marketlogic Investors LLC. All rights reserved.
        </p>
      </div>
    </main>
  );
}
