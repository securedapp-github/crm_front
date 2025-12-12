import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ActivitiesList from './ActivitiesList';
import ActivitiesCalendar from './ActivitiesCalendar';
import NotificationBell from '../../components/NotificationBell';

export default function ActivitiesPage() {
    const [tab, setTab] = useState('list');

    const tabs = useMemo(() => ([
        { id: 'list', label: 'List View', description: 'Manage all posts' },
        { id: 'calendar', label: 'Calendar', description: 'Schedule view' }
    ]), []);

    return (
        <main className="min-h-[calc(100vh-112px)] bg-slate-50">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-10 md:px-8">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2">
                    <Link
                        to="/dashboard/marketing-team"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors self-start mb-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                        <span>Back to Team</span>
                    </Link>
                </div>

                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                            Marketing Activities
                        </h1>
                        <p className="max-w-3xl text-sm text-slate-600 md:text-base">
                            Plan, schedule, and track your marketing content across all platforms.
                        </p>
                    </div>
                    <div className="mt-2">
                        <NotificationBell />
                    </div>
                </div>

                {/* Tab Navigation */}
                <nav className="flex flex-wrap gap-3">
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={`group flex min-w-[160px] flex-1 items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 sm:flex-none ${tab === item.id
                                ? 'border-indigo-500 bg-white shadow-sm'
                                : 'border-slate-200 bg-white hover:border-indigo-300'
                                }`}
                        >
                            <span>
                                <span className={`block text-base font-semibold ${tab === item.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {item.label}
                                </span>
                                <span className="mt-1 block text-xs text-slate-500 sm:text-sm">
                                    {item.description}
                                </span>
                            </span>
                        </button>
                    ))}
                </nav>

                {/* Tab Content */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[500px]">
                    {tab === 'list' && <ActivitiesList />}
                    {tab === 'calendar' && <ActivitiesCalendar />}
                </div>
            </div>
        </main>
    );
}
