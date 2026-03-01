import Modal from './Modal';

export default function RoleSelectionModal({ open, onClose, roles, onSelect }) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Select Your Role"
        >
            <div className="space-y-4 py-2">
                <p className="text-sm text-slate-600">Your account has multiple roles assigned. Please choose which role you would like to use for this session.</p>
                <div className="grid grid-cols-1 gap-3">
                    {roles.includes('admin') && (
                        <button
                            onClick={() => onSelect('admin')}
                            className="flex items-center justify-between p-4 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">A</div>
                                <div className="text-left">
                                    <div className="font-semibold text-slate-900">Administrator</div>
                                    <div className="text-xs text-slate-500 text-left">Manage system, users and global activities</div>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </button>
                    )}
                    {roles.includes('sales') && (
                        <button
                            onClick={() => onSelect('sales')}
                            className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">S</div>
                                <div className="text-left">
                                    <div className="font-semibold text-slate-900">Sales Person</div>
                                    <div className="text-xs text-slate-500 text-left">Access pipeline, deals and sales dashboard</div>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
