import React, { useState } from 'react';
import { STATUS, getScoreColor } from '../../utils/consts';
import { MapPin, Building, Euro, Calendar, Briefcase, ExternalLink, ThumbsUp, ThumbsDown, Clock, CheckCircle, FileText, Send } from 'lucide-react';
import JobCard from '../cards/JobCard';

const DashboardKanban = ({ jobs, onStatusChange }) => {
    const [sortByDate, setSortByDate] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null); // For Popup

    const columns = [
        { id: STATUS.ENVOYEE, label: 'Envoyées', color: 'bg-blue-50' },
        { id: STATUS.ENTRETIEN, label: 'Entretiens', color: 'bg-indigo-50' },
        { id: STATUS.OFFRE, label: 'Offres', color: 'bg-green-50' },
        { id: STATUS.REFUSEE, label: 'Refusées', color: 'bg-red-50' },
    ];

    const handleDragStart = (e, jobId) => {
        e.dataTransfer.setData('jobId', jobId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, status) => {
        e.preventDefault();
        const jobId = e.dataTransfer.getData('jobId');
        if (jobId && onStatusChange) {
            onStatusChange(jobId, status);
        }
    };

    return (
        <div className="h-full overflow-x-auto pb-20 md:pb-0 relative">
            {/* Sorting Control */}
            <div className="absolute top-0 right-4 z-10">
                <button
                    onClick={() => setSortByDate(!sortByDate)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${sortByDate ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                    {sortByDate ? 'Tri par Date Traitement' : 'Tri par Défaut'}
                </button>
            </div>

            <div className="flex gap-4 min-w-[1000px] h-full pt-8">
                {columns.map(col => {
                    let colJobs = jobs.filter(j => j.Statut === col.id);

                    if (sortByDate) {
                        colJobs.sort((a, b) => {
                            const dateA = a.Date_Traitement ? new Date(a.Date_Traitement) : new Date(0);
                            const dateB = b.Date_Traitement ? new Date(b.Date_Traitement) : new Date(0);
                            return dateB - dateA; // Descending
                        });
                    }

                    return (
                        <div
                            key={col.id}
                            className="w-80 flex flex-col h-full rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 transition-colors"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className={`p-3 rounded-t-xl border-b border-gray-100 dark:border-gray-700 ${col.color} dark:bg-opacity-20 flex justify-between items-center`}>
                                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">{col.label}</h3>
                                <span className="bg-white/50 dark:bg-black/20 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full font-medium">
                                    {colJobs.length}
                                </span>
                            </div>

                            <div className="p-2 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                {colJobs.map(job => (
                                    <div
                                        key={job.ID_Annonce}
                                        className="transform scale-90 origin-top text-xs cursor-move"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, job.ID_Annonce)}
                                    >
                                        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 hover:shadow-md transition-shadow">
                                            <div className="font-bold text-gray-800 dark:text-white mb-1">{job.Titre_poste}</div>
                                            <div className="text-gray-500 dark:text-gray-400 mb-2">{job.Entreprise}</div>

                                            <div className="flex justify-between items-center text-[10px] text-gray-400 mb-2">
                                                <span>{job.Date_Traitement ? new Date(job.Date_Traitement).toLocaleDateString() : '-'}</span>
                                                <div className="flex gap-2 font-bold text-xs">
                                                    <span className={getScoreColor(job.score_ATS)}>
                                                        {job.score_ATS}
                                                    </span>
                                                    {job.score_AI > 0 && (
                                                        <span className="text-purple-600">
                                                            {job.score_AI}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setSelectedJob(job)}
                                                className="w-full text-center text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 py-1 rounded mb-2"
                                            >
                                                Voir détails
                                            </button>

                                            {col.id === STATUS.ENTRETIEN && (
                                                <div className="mt-2 pt-2 border-t border-gray-50 flex justify-center">
                                                    <a
                                                        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Entretien - ${job.Titre_poste} - ${job.Entreprise}`)}&details=${encodeURIComponent(`Entretien pour le poste de ${job.Titre_poste} chez ${job.Entreprise}.\n\nLien offre : ${job.URL_offre || 'N/A'}\n\nContact : ${job.Prenom_Recruteur || ''} ${job.Nom_Recruteur || ''}`)}&location=${encodeURIComponent(job.Lieu || '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1.5 rounded hover:bg-indigo-100 w-full text-center block"
                                                    >
                                                        Planifier Entretien
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {colJobs.length === 0 && (
                                    <div className="text-center py-10 text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-lg m-2">
                                        Glisser ici
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* DETAIL POPUP */}
            {selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedJob(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedJob(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{selectedJob.Titre_poste}</h2>

                        <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-4">
                            <Building size={14} className="mr-1" />
                            <span className="font-medium mr-3">{selectedJob.Entreprise}</span>
                            <MapPin size={14} className="mr-1" />
                            <span>{selectedJob.Lieu}</span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                            {selectedJob.Salaire && selectedJob.Salaire !== "Non communiqué" && (
                                <span className="flex items-center bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-full border border-transparent dark:border-gray-600">
                                    <Euro size={12} className="mr-1" /> {selectedJob.Salaire}
                                </span>
                            )}
                            <span className="flex items-center bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-full border border-transparent dark:border-gray-600">
                                <Briefcase size={12} className="mr-1" /> {selectedJob.Type_contrat}
                            </span>
                            <span className="flex items-center bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-full border border-transparent dark:border-gray-600">
                                <Calendar size={12} className="mr-1" /> {selectedJob.Date_Publication}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                <span className="text-xs text-gray-400 block uppercase">Scores</span>
                                <div className="flex gap-2 mt-1">
                                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreColor(selectedJob.score_ATS)}`}>
                                        Mots-clés {selectedJob.score_ATS}
                                    </div>
                                    <div className="px-2 py-1 rounded-full text-xs font-bold text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900/30">
                                        IA {selectedJob.score_AI}%
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2 italic">"{selectedJob.remarque_ATS}"</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                <span className="text-xs text-gray-400 block uppercase">Traitement</span>
                                <span className="font-bold text-gray-700 dark:text-gray-200 text-sm block mt-1">
                                    {selectedJob.Date_Traitement ? new Date(selectedJob.Date_Traitement).toLocaleString() : 'Non traité'}
                                </span>
                                {selectedJob.Prenom_Recruteur && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        Contact: {selectedJob.Prenom_Recruteur} {selectedJob.Nom_Recruteur}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description Scrollable Area */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description du poste</h4>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-sm text-gray-600 dark:text-gray-400 max-h-60 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                {selectedJob.Description}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            {selectedJob.URL_offre && (
                                <a href={selectedJob.URL_offre} target="_blank" className="flex-1 bg-pepite-dark text-white text-center py-2 rounded-lg hover:bg-black transition-colors">
                                    Offre Originale
                                </a>
                            )}
                            {selectedJob.CV_Doc_URL && (
                                <a href={selectedJob.CV_Doc_URL} target="_blank" className="flex-1 border border-gray-200 text-gray-700 text-center py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    Voir CV
                                </a>
                            )}
                            {selectedJob.LM_Doc_URL && (
                                <a href={selectedJob.LM_Doc_URL} target="_blank" className="flex-1 border border-gray-200 text-gray-700 text-center py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    Voir LM
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardKanban;
