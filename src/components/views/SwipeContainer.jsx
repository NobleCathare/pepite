import { useState } from 'react';
import JobCard from '../cards/JobCard';
import { Filter, SlidersHorizontal, RefreshCw, Loader, Search, Loader2, Radar, Link2, Download, CheckCircle, RotateCw, List, LayoutGrid, Check, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import PocketBase from 'pocketbase';
import { useJobs } from '../../hooks/useJobs';
import { useMemo } from 'react';
import { getScoreColor } from '../../utils/consts';

const pb = new PocketBase('https://pocketbase.circumambule.synology.me/');

// ═══════════════════════════════════════════════════════════════
// IMPORTS DYNAMIQUES (pour services)
// ═══════════════════════════════════════════════════════════════

import ScanResultModal from '../modals/ScanResultModal';
import { STATUS } from '../../utils/consts';

const SwipeContainer = ({ jobs: propJobs, onAction }) => {
    const { user } = useUser();
    const { jobs: hookJobs, loading, fetchData: refreshJobs, updateJobStatus } = useJobs();
    const [searchingWeb, setSearchingWeb] = useState(false);

    // Scan Results State
    const [scanResults, setScanResults] = useState(null);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);

    // Import URL State
    const [importUrl, setImportUrl] = useState('');
    const [importing, setImporting] = useState(false);

    // UI State
    const [sortBy, setSortBy] = useState('score'); // score, date
    const [viewMode, setViewMode] = useState('grid'); // grid, list
    const [selectedJobIds, setSelectedJobIds] = useState(new Set());

    // Optimistic UI: Hidden IDs (processed but waiting for refresh)
    const [hiddenJobIds, setHiddenJobIds] = useState(new Set());

    // Use Props if available (From App.jsx with filters), else Hook
    const currentJobs = useMemo(() => {
        return propJobs || hookJobs.filter(j => j.Statut === STATUS.NOUVELLE || j.Statut === STATUS.FILTRE_ATS);
    }, [propJobs, hookJobs]);

    // Read Source Config from LocalStorage
    const getSourceConfig = () => {
        try {
            const stored = localStorage.getItem('sasre_source_config');
            return stored ? JSON.parse(stored) : { FT: true, WTTJ: true, RSS: false };
        } catch (e) {
            return { FT: true, WTTJ: true, RSS: false };
        }
    };

    const handleSearchScanner = async () => {
        if (!user) return;
        setSearchingWeb(true);
        try {
            const { searchJobs } = await import('../../services/jobSourcingService');
            // USE PERSISTED SOURCES
            const sources = getSourceConfig();

            const result = await searchJobs(user.id, sources);

            if (result.success) {
                // UPDATE: Display the Elegant Modal
                setScanResults(result.stats);
                setIsResultModalOpen(true);

                if (result.stats.totalNew > 0) {
                    await refreshJobs();
                }
            } else {
                alert("Erreur lors de la recherche : " + result.message);
            }
        } catch (err) {
            console.error(err);
            alert("Erreur technique lors du scan : " + (err.message || err));
        } finally {
            setSearchingWeb(false);
        }
    };

    // Use passed onAction or fallback (internal)
    const handleCardAction = async (job, action, noteOrFile = null) => {
        // OPTIMISTIC UPDATE: Remove immediately from VIEW
        // This makes the UI feel instant (0ms latency)
        setHiddenJobIds(prev => new Set(prev).add(job.id || job.ID_Annonce));

        if (onAction) {
            await onAction(action, job.id, noteOrFile);
        } else {
            // Fallback if no onAction prop
            if (!job) return;
            try {
                await updateJobStatus(job.id, action, noteOrFile);
                await refreshJobs();
            } catch (error) {
                console.error("Error updating job status:", error);
                alert("Erreur lors de la mise à jour du statut : " + error.message);
            }
        }
    };

    // Memoized Sorting to avoid TDZ and optimize
    const sortedJobs = useMemo(() => {
        return [...currentJobs]
            .filter(j => !hiddenJobIds.has(j.id) && !hiddenJobIds.has(j.ID_Annonce))
            .sort((a, b) => {
                if (sortBy === 'score_ia_desc') {
                    return (b._score || 0) - (a._score || 0);
                }
                if (sortBy === 'score_ia_asc') {
                    return (a._score || 0) - (b._score || 0);
                }
                if (sortBy === 'date') return new Date(b.Date_Publication) - new Date(a.Date_Publication);
                return 0;
            });
    }, [currentJobs, sortBy, hiddenJobIds]);

    const handleImportUrl = async () => {
        if (!importUrl || !user) return;
        setImporting(true);
        try {
            const { importJobFromUrl } = await import('../../services/jobSourcingService');
            const newJob = await importJobFromUrl(importUrl, user.id);

            // SHOW MODAL instead of Alert
            setScanResults({
                totalNew: 1,
                processed: 1,
                errors: 0,
                details: [{ source: newJob.Source, keyword: 'Import Direct', count: 1, new: 1 }],
                topJobs: [{
                    title: newJob.Titre_poste,
                    company: newJob.Entreprise,
                    score: 0,
                    url: newJob.URL_offre
                }]
            });
            setIsResultModalOpen(true);

            setImportUrl('');
            await refreshJobs();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'import : " + error.message);
        } finally {
            setImporting(false);
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedJobIds.size === 0) return;
        // Simplification du message de confirmation
        if (!confirm(`Appliquer à ${selectedJobIds.size} annonces ?`)) return;

        setImporting(true);
        try {
            // Optimistic hiding for bulk
            setHiddenJobIds(prev => {
                const next = new Set(prev);
                selectedJobIds.forEach(id => next.add(id));
                return next;
            });

            // On utilise onAction (App.jsx) pour chaque annonce afin de bénéficier de la logique complète (Webhooks + Mapping Statut)
            for (const id of selectedJobIds) {
                if (onAction) {
                    await onAction(action, id);
                } else {
                    // Fallback vers mapping interne si onAction manque
                    const statusMapping = { 'REFUSE': STATUS.NON_VALIDEE, 'KEEP': STATUS.TRAITEMENT };
                    await updateJobStatus(id, statusMapping[action] || action);
                }
            }
            setSelectedJobIds(new Set());
            // Le rafraîchissement est géré par la souscription dans useJobs, 
            // mais on peut forcer un petit délai pour laisser les webhooks respirer
        } catch (error) {
            console.error("Bulk action failed:", error);
            alert("Erreur lors de l'action de masse : " + error.message);
        } finally {
            setImporting(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedJobIds(new Set(sortedJobs.map(j => j.id)));
        } else {
            setSelectedJobIds(new Set());
        }
    };

    const handleSelectOne = (id) => {
        const next = new Set(selectedJobIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedJobIds(next);
    };

    if (loading && currentJobs.length === 0) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pepite-gold"></div></div>;

    if (currentJobs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-6 animate-in fade-in zoom-in duration-500">
                <ScanResultModal
                    isOpen={isResultModalOpen}
                    onClose={() => setIsResultModalOpen(false)}
                    results={scanResults}
                />
                <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full inline-block mb-4 shadow-sm">
                    <CheckCircle className="text-green-600 dark:text-green-400 w-16 h-16" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">C'est tout bon !</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Aucune nouvelle offre à traiter.
                </p>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={handleSearchScanner}
                        disabled={searchingWeb}
                        className="bg-pepite-gold hover:bg-[#b08d55] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-pepite-gold/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {searchingWeb ? <Loader2 className="animate-spin" /> : <Radar size={20} />}
                        {searchingWeb ? 'Scan en cours...' : 'Scanner le Web'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative max-w-7xl mx-auto w-full px-4 pb-20 md:pb-0">
            <ScanResultModal
                isOpen={isResultModalOpen}
                onClose={() => setIsResultModalOpen(false)}
                results={scanResults}
            />
            {/* Header / Stats Bar */}
            <div className="flex flex-wrap justify-between items-center py-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        Nouvelles Offres
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm px-2 py-0.5 rounded-full">{currentJobs.length}</span>
                    </h2>

                    {/* URL IMPORT FIELD */}
                    <div className="hidden md:flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-1 py-1 shadow-sm focus-within:ring-2 ring-pepite-gold/20 transition-all">
                        <Link2 size={16} className="text-gray-400" />
                        <input
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            placeholder="Importer une URL..."
                            className="bg-transparent border-none outline-none text-sm w-48 text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                            onKeyDown={(e) => e.key === 'Enter' && handleImportUrl()}
                        />
                        <button
                            onClick={handleImportUrl}
                            disabled={!importUrl || importing}
                            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 p-1.5 rounded-md transition-colors disabled:opacity-50"
                            title="Importer"
                        >
                            {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-white dark:bg-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer outline-none focus:ring-1 ring-pepite-gold/20 [color-scheme:light] dark:[color-scheme:dark]"
                    >
                        <option value="date">Tri : Récent</option>
                        <option value="score_ia_desc">Tri : Score IA (+ vers -)</option>
                        <option value="score_ia_asc">Tri : Score IA (- vers +)</option>
                    </select>

                    <button
                        onClick={handleSearchScanner}
                        disabled={searchingWeb}
                        className="flex items-center gap-2 bg-pepite-gold text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {searchingWeb ? <Loader2 className="animate-spin" size={18} /> : <Radar size={18} />}
                        <span className="hidden sm:inline">Scanner</span>
                    </button>

                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow text-pepite-gold' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Vue Grille"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow text-pepite-gold' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Vue Liste"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Import Bar */}
            <div className="md:hidden pb-4">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-1 py-1.5 shadow-sm">
                    <Link2 size={16} className="text-gray-400" />
                    <input
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="Coller l'URL d'une annonce..."
                        className="bg-transparent border-none outline-none text-sm w-full text-gray-700 dark:text-gray-200"
                    />
                    <button onClick={handleImportUrl} disabled={!importUrl || importing} className="bg-gray-100  dark:bg-gray-700 p-2 rounded-md">
                        {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedJobIds.size > 0 && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-full px-6 py-2 shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                        <span className="text-sm font-bold text-white">{selectedJobIds.size} annonces</span>
                        <div className="w-px h-6 bg-white/10 mx-2" />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleBulkAction('REFUSE')}
                                className="p-3 hover:bg-white/10 text-gray-400 rounded-full transition-all flex items-center justify-center"
                                title="Ignorer la sélection"
                            >
                                <ThumbsDown size={24} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => handleBulkAction('KEEP')}
                                className="p-3 hover:bg-white/10 text-[#D4AF37] rounded-full transition-all flex items-center justify-center"
                                title="Valider la sélection"
                            >
                                <ThumbsUp size={24} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sortedJobs.map(job => (
                        <JobCard
                            key={job.ID_Annonce}
                            job={job}
                            onAction={(action, note) => handleCardAction(job, action, note)}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex-1 mb-8 animate-in fade-in duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-[10px] uppercase tracking-wider text-gray-500 font-black">
                                    <th className="p-4 w-10"><input type="checkbox" onChange={handleSelectAll} checked={selectedJobIds.size === sortedJobs.length && sortedJobs.length > 0} className="rounded border-gray-300 text-pepite-gold focus:ring-pepite-gold" /></th>
                                    <th className="p-4">Offre / Entreprise</th>
                                    <th className="p-4 hidden md:table-cell">Date</th>
                                    <th className="p-4 text-center">Score</th>
                                    <th className="p-4">Source</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {sortedJobs.map(job => (
                                    <tr key={job.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedJobIds.has(job.id) ? 'bg-pepite-gold/5 dark:bg-pepite-gold/10' : ''}`}>
                                        <td className="p-4"><input type="checkbox" checked={selectedJobIds.has(job.id)} onChange={() => handleSelectOne(job.id)} className="rounded border-gray-300 text-pepite-gold focus:ring-pepite-gold" /></td>
                                        <td className="p-4">
                                            <div className="font-bold text-sm text-gray-800 dark:text-gray-100">{job.Titre_poste}</div>
                                            <div className="text-xs text-gray-500">{job.Entreprise} • {job.Lieu}</div>
                                        </td>
                                        <td className="p-4 hidden md:table-cell text-xs text-gray-500">{new Date(job.Date_Publication).toLocaleDateString()}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className={`text-[10px] font-black font-mono ${getScoreColor(job._score)}`} title="Score Recherche">
                                                    S:{job._score || 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-gray-400">{job.Source}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleCardAction(job, 'REFUSE')} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors border border-transparent hover:border-gray-200" title="Ignorer"><ThumbsDown size={18} strokeWidth={2.5} /></button>
                                                <button onClick={() => handleCardAction(job, 'KEEP')} className="p-1.5 text-[#D4AF37] hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors border border-transparent hover:border-yellow-100" title="Valider"><ThumbsUp size={18} strokeWidth={2.5} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SwipeContainer;
