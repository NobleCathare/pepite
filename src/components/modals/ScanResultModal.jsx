import { useRef, useEffect } from 'react';
import { X, Trophy, CheckCircle, Search, ExternalLink } from 'lucide-react';

const ScanResultModal = ({ isOpen, onClose, results }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen || !results) return null;

    const { totalNew, processed, details, topJobs } = results;

    const getMotivationMessage = (count) => {
        if (count > 20) return "C'est une excellente pêche ! Préparez vos meilleurs CV.";
        if (count > 5) return "Quelques nouvelles pépites à explorer !";
        if (count > 0) return "Chaque opportunité compte. Bonne chance !";
        return "Rien de neuf pour l'instant. Profitez-en pour peaufiner vos candidatures existantes !";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 transform border border-pepite-gold/20"
            >
                {/* Header with Pepite Gold Gradient */}
                <div className="bg-gradient-to-r from-pepite-gold to-yellow-600 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Trophy size={120} />
                    </div>

                    <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
                        <X size={24} />
                    </button>

                    <h2 className="text-3xl font-bold mb-2">Résultat du Scan</h2>
                    <p className="opacity-90 font-medium">{getMotivationMessage(totalNew)}</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                            <div className="text-3xl font-bold text-pepite-gold mb-1">{totalNew}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nouvelles Offres</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">{processed}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Analysées</div>
                        </div>
                    </div>

                    {/* Keywords Breakdown */}
                    {details && details.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Search size={16} className="text-pepite-gold" />
                                Détails par recherche
                            </h3>
                            <div className="max-h-32 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600">
                                {details.map((detail, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${detail.source === 'WTTJ' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                                            <span className="font-medium text-gray-800 dark:text-white truncate max-w-[140px]" title={detail.keyword}>
                                                {detail.keyword}
                                            </span>
                                            <span className="text-xs text-gray-400">({detail.source})</span>
                                        </div>
                                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs font-bold">
                                            +{detail.new}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Jobs (Score) */}
                    {totalNew > 0 && topJobs && topJobs.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Trophy size={16} className="text-pepite-gold" />
                                Top 5 Pépites
                            </h3>
                            <div className="space-y-2">
                                {topJobs.map((job, idx) => (
                                    <div key={idx} className="flex justify-between items-center group relative pl-4 border-l-2 border-transparent hover:border-pepite-gold transition-all duration-200">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-medium text-gray-900 dark:text-white truncate text-sm">{job.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{job.company}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`text-xs font-bold ${job.score >= 50 ? 'text-green-600' : 'text-orange-500'}`}>
                                                {job.score} pts
                                            </div>
                                            {job.url && (
                                                <a
                                                    href={job.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-pepite-gold"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 dark:bg-gray-700 text-white font-bold py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <CheckCircle size={20} />
                        Voir les annonces
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScanResultModal;
