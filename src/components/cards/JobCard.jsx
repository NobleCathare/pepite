import React from 'react';
import { MapPin, Building, Euro, Calendar, Briefcase, ExternalLink, ThumbsUp, ThumbsDown, Clock, CheckCircle, FileText, Send } from 'lucide-react';
import { SOURCES, getScoreColor, STATUS } from '../../utils/consts';

const JobCard = ({ job, onAction }) => {
    const sourceStyle = SOURCES[job.Source] || SOURCES.DEFAULT;
    const scoreStyle = getScoreColor(job.score_ATS);

    // Parsing keywords if string
    const getKeywords = () => {
        if (!job._score_details) return [];
        return job._score_details.split(';').map(k => {
            const [text, val] = k.trim().split('(');
            const score = parseInt(val?.replace(')', '')) || 0;
            return { text, score };
        });
    };

    const keywords = getKeywords();

    return (
        <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200">
            {/* Header Card */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col items-start gap-1">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${sourceStyle.color}`}>
                        {sourceStyle.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Calendar size={12} /> {job.Date_Publication}
                    </span>
                </div>
                <div className="flex gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${scoreStyle}`} title="Score Mots-clés">
                        Score {job.score_ATS} pts
                    </div>
                    {job.score_AI !== undefined && job.score_AI > 0 && (
                        <div className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800" title="Score IA">
                            ATS {job.score_AI}%
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="mb-4">
                <h3 className="text-lg font-bold text-pepite-dark dark:text-white leading-tight mb-1">{job.Titre_poste}</h3>
                <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-2">
                    <Building size={14} className="mr-1" />
                    <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(job.Entreprise)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium mr-3 hover:text-pepite-gold transition-colors"
                        title="Rechercher l'entreprise sur Google"
                    >
                        {job.Entreprise}
                    </a>
                    <MapPin size={14} className="mr-1" />
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.Lieu)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-pepite-gold transition-colors"
                        title="Voir sur Google Maps"
                    >
                        {job.Lieu}
                    </a>
                </div>

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

                {/* ATS Remarks */}
                {job.remarque_ATS && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-100 dark:border-yellow-800/30 text-xs p-3 rounded-xl mb-3">
                        <strong>IA :</strong> {job.remarque_ATS}
                    </div>
                )}

                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
                    {job.Description}
                </p>
            </div>

            {/* Actions Footer - Polymorphic based on Status */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center">
                <a href={job.URL_offre} target="_blank" rel="noopener noreferrer" className="text-pepite-gold text-sm font-semibold hover:underline flex items-center">
                    <ExternalLink size={14} className="mr-1" /> Voir l'offre
                </a>

                <div className="flex gap-2">
                    {job.Statut === STATUS.NOUVELLE && (
                        <>
                            <button onClick={() => onAction('REFUSE', job.ID_Annonce)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Refuser">
                                <ThumbsDown size={20} />
                            </button>
                            <button onClick={() => onAction('KEEP', job.ID_Annonce)} className="p-2 text-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors" title="Conserver">
                                <ThumbsUp size={20} />
                            </button>
                        </>
                    )}

                    {job.Statut === STATUS.PRETE && (
                        <button className="flex items-center gap-2 bg-pepite-gold text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-yellow-500 shadow-sm transition-all hover:shadow-md">
                            <Send size={16} /> Envoyer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobCard;
