import { MapPin, Building, Euro, Calendar, Briefcase, ExternalLink, ThumbsUp, ThumbsDown, Clock, CheckCircle, FileText, Send, RefreshCw } from 'lucide-react';
import { SOURCES, getScoreColor, STATUS } from '../../utils/consts';

const JobCard = ({ job, onAction, variant = 'triage', children }) => {
    const sourceStyle = SOURCES[job.Source] || SOURCES.DEFAULT;
    const scoreStyle = getScoreColor(job.score_ATS);

    const isCompact = variant === 'kanban' || variant === 'map';

    // Footer Logic
    const renderFooter = () => {
        const commonFlex = "border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center mt-auto min-h-[50px]";

        // 1. Triage / Swipe View
        if (variant === 'triage') {
            return (
                <div className={commonFlex}>
                    <a href={job.URL_offre} target="_blank" rel="noopener noreferrer" className="text-pepite-gold text-sm font-semibold hover:underline flex items-center">
                        Voir l'offre
                    </a>
                    <div className="flex gap-3 items-center">
                        <button onClick={() => onAction('REFUSE', job.ID_Annonce)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors flex items-center justify-center font-bold" title="Refuser">
                            <ThumbsDown size={22} />
                        </button>
                        <button onClick={() => onAction('KEEP', job.ID_Annonce)} className="p-2 text-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors flex items-center justify-center font-bold" title="Conserver">
                            <ThumbsUp size={22} />
                        </button>
                    </div>
                </div>
            );
        }

        // 2. Submission (Envoi)
        if (variant === 'submission') {
            return (
                <div className={commonFlex}>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onAction('REGENERATE', job.ID_Annonce)} className="text-gray-400 hover:text-pepite-gold transition-colors"><RefreshCw size={16} /></button>
                        <a href={job.URL_offre} target="_blank" rel="noopener noreferrer" className="text-pepite-gold text-sm font-semibold hover:underline flex items-center">
                            Voir l'offre
                        </a>
                    </div>
                    <div className="flex gap-3 items-center">
                        <button onClick={() => onAction('REFUSE', job.ID_Annonce)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors flex items-center justify-center" title="Refuser l'offre">
                            <ThumbsDown size={20} />
                        </button>
                        <button onClick={() => onAction('MARK_SENT', job.ID_Annonce)} className="p-2 text-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors flex items-center justify-center" title="Marquer comme envoyé">
                            <ThumbsUp size={20} />
                        </button>
                    </div>
                </div>
            );
        }

        // 3. Kanban (Suivi)
        if (variant === 'kanban') {
            const isEnvoyee = job.Statut === STATUS.ENVOYEE;
            return (
                <div className={commonFlex}>
                    <button
                        onClick={() => onAction('DETAILS', job)}
                        className="text-gray-500 dark:text-gray-400 text-xs font-semibold hover:text-pepite-gold transition-colors"
                    >
                        Voir détails
                    </button>

                    <div className="flex gap-2 items-center">
                        {isEnvoyee ? (
                            <>
                                <button onClick={() => onAction('STATUS_CHANGE', job.ID_Annonce, STATUS.REFUSEE)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Refuser l'offre">
                                    <ThumbsDown size={18} />
                                </button>
                                <button onClick={() => onAction('STATUS_CHANGE', job.ID_Annonce, STATUS.ENTRETIEN)} className="p-1.5 text-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors" title="Classer en Entretien">
                                    <ThumbsUp size={18} />
                                </button>
                            </>
                        ) : job.Statut === STATUS.ENTRETIEN ? (
                            <div className="flex gap-2">
                                <button onClick={() => onAction('STATUS_CHANGE', job.ID_Annonce, STATUS.REFUSEE_APRES_ENTRETIEN)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Refusé après entretien">
                                    <ThumbsDown size={18} />
                                </button>
                                <button onClick={() => onAction('STATUS_CHANGE', job.ID_Annonce, STATUS.OFFRE)} className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors" title="Offre reçue !">
                                    <ThumbsUp size={18} />
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            );
        }

        // 4. Map Popup
        if (variant === 'map') {
            return (
                <div className={commonFlex}>
                    <a href={job.URL_offre} target="_blank" rel="noopener noreferrer" className="!text-pepite-gold text-sm font-bold hover:underline flex items-center">
                        Voir l'offre
                    </a>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => onAction('REFUSE', job.ID_Annonce)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Refuser">
                            <ThumbsDown size={18} />
                        </button>
                        <button onClick={() => onAction('KEEP', job.ID_Annonce)} className="p-1.5 text-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors" title="Conserver">
                            <ThumbsUp size={18} />
                        </button>
                    </div>
                </div>
            );
        }

        // 5. Minimal (Editor)
        if (variant === 'minimal') {
            return (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-auto">
                    <a href={job.URL_offre} target="_blank" rel="noopener noreferrer" className="text-pepite-gold text-sm font-semibold hover:underline flex items-center">
                        Voir l'offre
                    </a>
                </div>
            )
        }

        return null;
    };

    const isKanban = variant === 'kanban';

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200 flex flex-col h-full ${isKanban ? 'p-3' : ''}`}>
            {/* Header Card */}
            <div className="flex justify-between items-start mb-3 flex-none">
                <div className="flex flex-col items-start gap-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${sourceStyle.color}`}>
                        {sourceStyle.label}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Calendar size={10} /> {job.Date_Publication || job.Date_Traitement}
                    </span>
                </div>
                <div className="flex gap-3 items-center">
                    <div className={`text-base font-bold ${scoreStyle}`} title="Score Mots-clés">
                        {job.score_ATS}
                    </div>
                    {job.score_AI !== undefined && job.score_AI > 0 && (
                        <div className="text-base font-extrabold text-purple-600 dark:text-purple-400" title="Score IA">
                            {job.score_AI}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 ${isCompact ? 'mb-2' : 'mb-4'}`}>
                <h3 className={`${isCompact ? 'text-sm' : 'text-lg'} font-bold text-pepite-dark dark:text-white leading-tight mb-1 line-clamp-2`}>{job.Titre_poste}</h3>

                <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs mb-2 flex-wrap gap-y-1">
                    <Building size={12} className="mr-1 shrink-0" />
                    <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(job.Entreprise)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold mr-3 text-pepite-bronze dark:text-pepite-gold hover:underline transition-colors truncate max-w-[150px]"
                    >
                        {job.Entreprise}
                    </a>
                    <div className="flex items-center">
                        <MapPin size={12} className="mr-1 shrink-0" />
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.Lieu)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 dark:text-gray-400 hover:text-pepite-gold hover:underline transition-colors truncate max-w-[100px]"
                        >
                            {job.Lieu}
                        </a>
                    </div>
                </div>

                {!isCompact && (
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {job.Salaire && job.Salaire !== "Non communiqué" && (
                            <span className="flex items-center bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-full border border-transparent dark:border-gray-600">
                                <Euro size={12} className="mr-1" /> {job.Salaire}
                            </span>
                        )}
                        <span className="flex items-center bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-full border border-transparent dark:border-gray-600">
                            <Briefcase size={12} className="mr-1" /> {job.Type_contrat}
                        </span>
                    </div>
                )}

                {/* ATS Remarks (Hidden in compact map but shown in kanban if important) */}
                {job.remarque_ATS && variant !== 'map' && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-100 dark:border-yellow-800/30 text-[10px] p-2 rounded-lg mb-3">
                        <strong className="text-pepite-bronze dark:text-pepite-gold">IA :</strong> {job.remarque_ATS}
                    </div>
                )}

                {!isCompact && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
                        {job.Description}
                    </p>
                )}

                {children}
            </div>

            {/* Actions Footer */}
            {renderFooter()}
        </div>
    );
};

export default JobCard;
