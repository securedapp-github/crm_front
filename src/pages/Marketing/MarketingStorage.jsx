import { useState, useEffect } from 'react';
import { getAssets, uploadAsset, deleteAsset, downloadAsset } from '../../api/marketing';
import Modal from '../../components/Modal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Assuming /uploads is served at root URL or similar. Need to handle path correctly.
// API_URL usually is http://host/api. Static files are at http://host/uploads.
// We can parse the URL.

const getFileUrl = (path) => {
    if (!path) return '';
    // Convert server path (uploads\marketing\file.png) to URL.
    // Assuming server serves /uploads at root/uploads
    const normalizedPath = path.replace(/\\/g, '/');
    // If path starts with uploads/, we prepend base URL (without /api)
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}/${normalizedPath}`;
};

export default function MarketingStorage() {
    const [assets, setAssets] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deleteModal, setDeleteModal] = useState({ show: false, step: 1, assetId: null });
    const [activeFolder, setActiveFolder] = useState(null); // 'image', 'video', 'doc', 'excel' or null
    const [errors, setErrors] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Preview State
    const [previewAsset, setPreviewAsset] = useState(null);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const res = await getAssets();
            if (res.data.success) {
                setAssets(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch assets', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const getAssetCategory = (asset) => {
        const mime = asset.mimeType || '';
        const name = asset.filename || asset.title || '';
        const lowerName = name.toLowerCase();

        if (asset.type === 'image' || mime.startsWith('image/')) return 'image';
        if (asset.type === 'video' || mime.startsWith('video/')) return 'video';

        if (mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('csv') ||
            lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
            return 'excel';
        }

        // Default to doc
        return 'doc';
    };

    const getFolderAssets = (folder) => {
        return assets.filter(asset => {
            const category = getAssetCategory(asset);
            return category === folder;
        });
    };

    const getSearchedAssets = () => {
        if (!searchQuery) return [];
        return assets.filter(asset =>
            (asset.title || asset.filename).toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);
            setErrors([]); // Clear errors on new selection
        }
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (files.length === 0) return;

        // Validation
        const newErrors = [];
        const validFiles = [];
        const MAX_SIZE = 100 * 1024 * 1024; // 100MB

        files.forEach(file => {
            if (file.size > MAX_SIZE) {
                newErrors.push(`${file.name} exceeds 100MB limit.`);
            } else {
                validFiles.push(file);
            }
        });

        if (newErrors.length > 0) {
            setErrors(newErrors);
            if (validFiles.length === 0) return; // Stop if no valid files
        }

        try {
            setUploading(true);
            const formData = new FormData();

            validFiles.forEach(file => {
                formData.append('files', file); // 'files' must match backend
                // Determine type simplistically or let server handle it
                // For multiple files, type might be inferred per file on backend or not needed.
                // If needed, you'd append type for each file, e.g., formData.append(`type_${file.name}`, 'image');
            });

            // Optional metadata applied to all (or just let backend use filenames)
            if (title) formData.append('title', title);
            if (description) formData.append('description', description);

            await uploadAsset(formData);

            // Success
            setFiles([]);
            setTitle('');
            setDescription('');
            setErrors([]);
            // Refresh list
            fetchAssets();
        } catch (error) {
            console.error('Upload failed', error);
            const msg = error.response?.data?.message || 'Upload failed. Please check your connection.';
            setErrors(prev => [...prev, msg]);
        } finally {
            setUploading(false);
        }
    };

    const initiateDelete = (id) => {
        setDeleteModal({ show: true, step: 1, assetId: id });
    };

    const confirmDeleteStep1 = () => {
        setDeleteModal(prev => ({ ...prev, step: 2 }));
    };

    const confirmDeleteStep2 = async () => {
        const id = deleteModal.assetId;
        try {
            await deleteAsset(id);
            setAssets(assets.filter(a => a.id !== id));
            setDeleteModal({ show: false, step: 1, assetId: null });
        } catch (error) {
            console.error('Delete failed', error);
            alert('Delete failed');
            setDeleteModal({ show: false, step: 1, assetId: null });
        }
    };

    const cancelDelete = () => {
        setDeleteModal({ show: false, step: 1, assetId: null });
    };

    const handleDownload = async (asset) => {
        try {
            const response = await downloadAsset(asset.id);
            // Create a blob URL
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            // Use the asset title or filename for the download
            link.setAttribute('download', asset.title || asset.filename);
            document.body.appendChild(link);
            link.click();
            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed', error);
            alert('Download failed. Please try again.');
        }
    };

    const handlePreview = async (asset) => {
        const category = getAssetCategory(asset);
        setPreviewAsset(asset);
        setPreviewHtml('');

        if (category === 'excel') {
            try {
                setPreviewLoading(true);
                const response = await downloadAsset(asset.id); // Get blob/buffer

                // Read the blob as array buffer
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const html = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-preview-table', editable: false });
                    setPreviewHtml(html);
                    setPreviewLoading(false);
                };
                reader.readAsArrayBuffer(response.data);
            } catch (error) {
                console.error('Failed to load excel preview', error);
                setPreviewHtml('<div class="text-center text-red-500 p-4">Failed to load preview</div>');
                setPreviewLoading(false);
            }
        }
    };

    const closePreview = () => {
        setPreviewAsset(null);
        setPreviewHtml('');
        setPreviewLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* Upload Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Upload Assets</h2>

                {/* Error Messages */}
                {errors.length > 0 && (
                    <div className="mb-4 rounded-lg bg-red-50 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Upload Errors</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <ul className="list-disc pl-5 space-y-1">
                                        {errors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleUpload} className="space-y-6">
                    {/* Drag & Drop File Zone */}
                    <div
                        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${files.length > 0 ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300'
                            }`}
                    >
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            multiple
                        />
                        <div className="flex bg-indigo-50 text-indigo-600 rounded-full p-3 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                            <p className="text-xs text-slate-500 mt-1">Images, Videos, or Documents (Max 100MB per file)</p>
                            <p className="text-xs text-indigo-600 mt-2 font-medium">Bulk upload supported</p>
                        </div>
                    </div>

                    {/* Selected Files List */}
                    {files.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            <p className="text-sm font-medium text-slate-700 sticky top-0 bg-white z-10 py-2">Selected Files ({files.length})</p>
                            {files.map((f, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="flex-shrink-0 w-8 h-8 bg-white rounded flex items-center justify-center border border-slate-200 text-xs font-bold text-slate-400 uppercase">
                                            {f.name.split('.').pop().slice(0, 3)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                                            <p className="text-xs text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Default Title <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Applied to all if set"
                                className="w-full rounded-lg border border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Default Description <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Applied to all if set"
                                rows="1"
                                className="w-full rounded-lg border border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 resize-none overflow-hidden"
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={uploading || files.length === 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Uploading {files.length} file{files.length !== 1 ? 's' : ''}...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                    <span>Upload {files.length > 0 ? `${files.length} Assets` : 'Assets'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search assets..."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>

            {/* Folders and Assets View */}
            <div className="space-y-4">
                {searchQuery ? (
                    /* Search Results View */
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span>🔍 Search Results</span>
                            <span className="text-sm font-normal text-slate-500">({getSearchedAssets().length} found)</span>
                        </h2>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {getSearchedAssets().length === 0 ? (
                                <div className="col-span-full py-12 text-center">
                                    <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                    </div>
                                    <p className="text-slate-500">No assets found matching "{searchQuery}"</p>
                                </div>
                            ) : (
                                getSearchedAssets().map((asset) => (
                                    <div key={asset.id} className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="aspect-video w-full rounded-lg bg-slate-100 mb-3 overflow-hidden flex items-center justify-center">
                                            {asset.type === 'image' || getAssetCategory(asset) === 'image' ? (
                                                <img src={getFileUrl(asset.path)} alt={asset.title} className="h-full w-full object-cover" />
                                            ) : asset.type === 'video' || getAssetCategory(asset) === 'video' ? (
                                                <video src={getFileUrl(asset.path)} className="h-full w-full object-contain" controls />
                                            ) : (
                                                <div className={`flex flex-col items-center justify-center h-full w-full relative transition-colors ${getAssetCategory(asset) === 'excel' ? 'bg-emerald-50 group-hover:bg-emerald-100' : 'bg-blue-50 group-hover:bg-blue-100'
                                                    }`}>
                                                    {getAssetCategory(asset) === 'excel' ? (
                                                        <div className="relative flex flex-col items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                <path d="M14 2v6h6" />
                                                                <path d="M8 13h8" />
                                                                <path d="M8 17h8" />
                                                                <path d="M10 9v8" />
                                                            </svg>
                                                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Spreadsheet</span>
                                                        </div>
                                                    ) : (
                                                        <div className="relative flex flex-col items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                                                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                                <polyline points="14 2 14 8 20 8" />
                                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                                <line x1="16" y1="17" x2="8" y2="17" />
                                                                <polyline points="10 9 9 9 8 9" />
                                                            </svg>
                                                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Document</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="font-semibold text-slate-900 truncate" title={asset.title}>
                                            {asset.title || asset.filename}
                                        </h3>
                                        {asset.description && <p className="text-xs text-slate-500 truncate">{asset.description}</p>}

                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                onClick={() => handleDownload(asset)}
                                                className="flex-1 rounded-md bg-slate-100 px-3 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-200"
                                            >
                                                Download
                                            </button>
                                            {/* Preview only for Image/Video */}
                                            {['image', 'video'].includes(getAssetCategory(asset)) && (
                                                <button
                                                    onClick={() => handlePreview(asset)}
                                                    className="rounded-md bg-slate-100 px-3 py-1.5 text-center text-xs font-medium text-indigo-600 hover:bg-slate-200"
                                                >
                                                    Preview
                                                </button>
                                            )}
                                            <button
                                                onClick={() => initiateDelete(asset.id)}
                                                className="rounded-md bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                                                title="Delete"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    /* Original View logic */
                    <>
                        {/* Navigation / Breadcrumbs (Only if inside a folder) */}
                        {activeFolder && (
                            <button
                                onClick={() => setActiveFolder(null)}
                                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                Back to Folders
                            </button>
                        )}

                        {!activeFolder ? (
                            /* Root Folder View */
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                {[
                                    { id: 'image', label: 'Images', icon: '📷', color: 'bg-blue-50 text-blue-600 border-blue-100' },
                                    { id: 'video', label: 'Videos', icon: '🎥', color: 'bg-rose-50 text-rose-600 border-rose-100' },
                                    { id: 'doc', label: 'Documents', icon: '📄', color: 'bg-slate-50 text-slate-600 border-slate-200' },
                                    { id: 'excel', label: 'Excel & Data', icon: '📊', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
                                ].map(folder => {
                                    const count = assets.filter(a => getAssetCategory(a) === folder.id).length;
                                    return (
                                        <button
                                            key={folder.id}
                                            onClick={() => setActiveFolder(folder.id)}
                                            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border transition-all hover:shadow-md ${folder.color} bg-white`}
                                        >
                                            <div className={`text-4xl ${folder.id === 'doc' ? 'text-slate-400' : ''}`}>
                                                {folder.id === 'image' && <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>}
                                                {folder.id === 'video' && <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></svg>}
                                                {folder.id === 'doc' && <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>}
                                                {folder.id === 'excel' && <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M10 9v8" /></svg>}
                                            </div>
                                            <div className="text-center">
                                                <h3 className="font-semibold text-slate-900">{folder.label}</h3>
                                                <p className="text-xs text-slate-500">{count} files</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Active Folder Assets List */
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-4 capitalize flex items-center gap-2">
                                    {activeFolder === 'image' && '🖼️ Images'}
                                    {activeFolder === 'video' && '🎥 Videos'}
                                    {activeFolder === 'doc' && '📄 Documents'}
                                    {activeFolder === 'excel' && '📊 Excel & Data'}
                                </h2>

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {getFolderAssets(activeFolder).length === 0 ? (
                                        <div className="col-span-full py-12 text-center">
                                            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="11" width="18" height="10" rx="2" ry="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>
                                            </div>
                                            <p className="text-slate-500">No files in this folder.</p>
                                        </div>
                                    ) : (
                                        getFolderAssets(activeFolder).map((asset) => (
                                            <div key={asset.id} className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="aspect-video w-full rounded-lg bg-slate-100 mb-3 overflow-hidden flex items-center justify-center">
                                                    {asset.type === 'image' || getAssetCategory(asset) === 'image' ? (
                                                        <img src={getFileUrl(asset.path)} alt={asset.title} className="h-full w-full object-cover" />
                                                    ) : asset.type === 'video' || getAssetCategory(asset) === 'video' ? (
                                                        <video src={getFileUrl(asset.path)} className="h-full w-full object-contain" controls />
                                                    ) : (
                                                        <div className={`flex flex-col items-center justify-center h-full w-full relative transition-colors ${getAssetCategory(asset) === 'excel' ? 'bg-emerald-50 group-hover:bg-emerald-100' : 'bg-blue-50 group-hover:bg-blue-100'
                                                            }`}>
                                                            {getAssetCategory(asset) === 'excel' ? (
                                                                <div className="relative flex flex-col items-center gap-2">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                        <path d="M14 2v6h6" />
                                                                        <path d="M8 13h8" />
                                                                        <path d="M8 17h8" />
                                                                        <path d="M10 9v8" />
                                                                    </svg>
                                                                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Spreadsheet</span>
                                                                </div>
                                                            ) : (
                                                                <div className="relative flex flex-col items-center gap-2">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                                                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                                        <polyline points="14 2 14 8 20 8" />
                                                                        <line x1="16" y1="13" x2="8" y2="13" />
                                                                        <line x1="16" y1="17" x2="8" y2="17" />
                                                                        <polyline points="10 9 9 9 8 9" />
                                                                    </svg>
                                                                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Document</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="font-semibold text-slate-900 truncate" title={asset.title}>
                                                    {asset.title || asset.filename}
                                                </h3>
                                                {asset.description && <p className="text-xs text-slate-500 truncate">{asset.description}</p>}

                                                <div className="mt-3 flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleDownload(asset)}
                                                        className="flex-1 rounded-md bg-slate-100 px-3 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-200"
                                                    >
                                                        Download
                                                    </button>
                                                    {/* Preview only for Image/Video */}
                                                    {['image', 'video'].includes(getAssetCategory(asset)) && (
                                                        <button
                                                            onClick={() => handlePreview(asset)}
                                                            className="rounded-md bg-slate-100 px-3 py-1.5 text-center text-xs font-medium text-indigo-600 hover:bg-slate-200"
                                                        >
                                                            Preview
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => initiateDelete(asset.id)}
                                                        className="rounded-md bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                                                        title="Delete"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                open={deleteModal.show}
                onClose={cancelDelete}
                title={deleteModal.step === 1 ? 'Delete Asset?' : 'Permanent Deletion Warning'}
                actions={
                    <>
                        <button
                            onClick={cancelDelete}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={deleteModal.step === 1 ? confirmDeleteStep1 : confirmDeleteStep2}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            {deleteModal.step === 1 ? 'Yes, Continue' : 'Permanently Delete'}
                        </button>
                    </>
                }
            >
                <div>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <p className="text-sm text-center text-slate-500 mb-6">
                        {deleteModal.step === 1
                            ? 'Are you sure you want to delete this asset? This is the first confirmation.'
                            : 'This action cannot be undone. The file will be permanently deleted from the database and storage. Are you absolutely sure?'}
                    </p>

                </div>
            </Modal>

            {/* Preview Modal */}
            {
                previewAsset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                                <h3 className="font-semibold text-slate-900 truncate pr-8">{previewAsset.title || previewAsset.filename}</h3>
                                <button onClick={closePreview} className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors absolute right-4 top-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 bg-slate-50 relative flex items-center justify-center min-h-[300px]">
                                {getAssetCategory(previewAsset) === 'image' && (
                                    <img src={getFileUrl(previewAsset.path)} alt="Preview" className="max-w-full max-h-[75vh] object-contain shadow-lg" />
                                )}

                                {getAssetCategory(previewAsset) === 'video' && (
                                    <video src={getFileUrl(previewAsset.path)} controls className="max-w-full max-h-[75vh] shadow-lg" />
                                )}

                                {getAssetCategory(previewAsset) === 'excel' && (
                                    <div className="w-full h-full bg-white p-4 shadow overflow-auto text-sm excel-preview">
                                        {previewLoading ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                                                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                                                Loading Spreadsheet...
                                            </div>
                                        ) : (
                                            <div dangerouslySetInnerHTML={{ __html: previewHtml }} className="overflow-auto" />
                                        )}
                                    </div>
                                )}

                                {getAssetCategory(previewAsset) === 'doc' && (
                                    <div className="w-full h-[75vh] bg-white shadow-lg overflow-hidden">
                                        {/* Simple iframe for PDF, might download if browser doesn't support inline pdf view or if it's .doc */}
                                        {/* Note: In production, .docx viewing usually requires backend conversion or a viewer service. PDF works natively. */}
                                        <iframe src={getFileUrl(previewAsset.path)} className="w-full h-full" title="Document Preview"></iframe>
                                    </div>
                                )}
                            </div>
                            {/* Optional Footer/Actions */}
                            <div className="p-3 border-t border-slate-200 flex justify-end gap-2 bg-white rounded-b-lg">
                                <button onClick={() => handleDownload(previewAsset)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                                    Download Original
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
