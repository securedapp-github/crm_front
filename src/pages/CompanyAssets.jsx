import MarketingStorage from './Marketing/MarketingStorage'
import { useNavigate } from 'react-router-dom'

export default function CompanyAssets() {
    const navigate = useNavigate()

    return (
        <main className="min-h-[calc(100vh-112px)] bg-slate-50">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-10 md:px-8">

                {/* Back Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors self-start"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    <span>Back</span>
                </button>

                <div className="space-y-3">
                    <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                        Company Assets
                    </h1>
                    <p className="max-w-3xl text-sm text-slate-600 md:text-base">
                        Central repository for all company marketing materials, including posters, videos, and images.
                    </p>
                </div>

                <MarketingStorage />
            </div>
        </main>
    )
}
