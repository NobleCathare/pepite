import React from 'react';
import { STATUS } from '../../utils/consts';
import JobCard from '../cards/JobCard';

const DashboardKanban = ({ jobs, onStatusChange }) => {

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
        <div className="h-full overflow-x-auto pb-20 md:pb-0">
            <div className="flex gap-4 min-w-[1000px] h-full">
                {columns.map(col => {
                    const colJobs = jobs.filter(j => j.Statut === col.id);

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

                            <div className="p-2 flex-1 overflow-y-auto space-y-3">
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
        </div>
    );
};

export default DashboardKanban;
