import { useState } from 'react';
import { STATUS, getScoreColor } from '../../utils/consts';
import { MapPin, Building, Euro, Calendar, Briefcase, ExternalLink, ThumbsUp, ThumbsDown, Clock, CheckCircle, FileText, Send, AlertTriangle } from 'lucide-react';
import JobCard from '../cards/JobCard';
import TrackingTabs from './TrackingTabs';

const DashboardKanban = ({ jobs, onStatusChange, onUpdateJob, accessToken }) => {
    const [sortByDate, setSortByDate] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null); // For Popup
    const [activeModalTab, setActiveModalTab] = useState('general'); // 'general' or 'tracking'

    const columns = [
        { id: STATUS.ENVOYEE, label: 'Envoyées', color: 'bg-blue-50' },
        { id: STATUS.ENTRETIEN, label: 'Entretiens', color: 'bg-indigo-50' },
        { id: STATUS.OFFRE, label: 'Offres', color: 'bg-green-50' },
        { id: STATUS.REFUSEE, label: 'Refusées', color: 'bg-red-50' },
    ];

    // Helper to filter jobs for a column, handling the special case for Refusée
    const getJobsForColumn = (colId) => {
        if (colId === STATUS.REFUSEE) {
            return jobs.filter(j => j.Statut === STATUS.REFUSEE || j.Statut === STATUS.REFUSEE_APRES_ENTRETIEN);
        }
        return jobs.filter(j => j.Statut === colId);
    };

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

    // --- TRACKING LOGIC ---

    const handleAddNote = (noteContent) => {
        if (!selectedJob || !onUpdateJob) return;

        const newNote = {
            date: new Date().toISOString(),
            content: noteContent
        };

        const updatedNotes = selectedJob.Notes ? [...selectedJob.Notes, newNote] : [newNote];
        const updatedJob = { ...selectedJob, Notes: updatedNotes };

        // Update local state for immediate feedback
        setSelectedJob(updatedJob);
        // Propagate to parent
        onUpdateJob(updatedJob);
    };

    const handleUpdateNote = (index, newContent, newDate) => {
        if (!selectedJob) return;
        const updatedNotes = [...(selectedJob.Notes || [])];
        if (updatedNotes[index]) {
            updatedNotes[index] = {
                ...updatedNotes[index],
                content: newContent,
                ...(newDate ? { date: newDate } : {})
            };
            const updatedJob = { ...selectedJob, Notes: updatedNotes };
            setSelectedJob(updatedJob);
            onUpdateJob(updatedJob);
        }
    };

    const handleDeleteNote = (index) => {
        if (!selectedJob) return;
        if (!window.confirm("Supprimer cette note ?")) return;
        const updatedNotes = selectedJob.Notes.filter((_, i) => i !== index);
        const updatedJob = { ...selectedJob, Notes: updatedNotes };
        setSelectedJob(updatedJob);
        onUpdateJob(updatedJob);
    };

    const handleAddLink = (category, item) => {
        if (!selectedJob) return;
        // category is 'Emails' or 'Events'
        const updatedList = selectedJob[category] ? [...selectedJob[category], item] : [item];
        const updatedJob = { ...selectedJob, [category]: updatedList };
        setSelectedJob(updatedJob);
        onUpdateJob(updatedJob);
    };

    const handleDeleteLink = (category, index) => {
        if (!selectedJob) return;
        if (!window.confirm("Supprimer ce lien ?")) return;
        const updatedList = selectedJob[category].filter((_, i) => i !== index);
        const updatedJob = { ...selectedJob, [category]: updatedList };
        setSelectedJob(updatedJob);
        onUpdateJob(updatedJob);
    };


    return (
        <div className="h-full overflow-x-auto pb-20 md:pb-0 relative">
            {/* Sorting Control */}
            <div className="absolute top-0 right-4 z-10">
                <button
                    onClick={() => setSortByDate(!sortByDate)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${sortByDate ? 'bg-pepite-bronze/10 text-pepite-bronze border-pepite-bronze/20' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                    {sortByDate ? 'Tri par Date Traitement' : 'Tri par Défaut'}
                </button>
            </div>

            <div className="flex gap-4 min-w-[1000px] h-full pt-8">
                {columns.map(col => {
                    let colJobs = getJobsForColumn(col.id);

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
                                        className="transform scale-90 origin-top cursor-move"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, job.ID_Annonce)}
                                    >
                                        <JobCard
                                            job={job}
                                            variant="kanban"
                                            onAction={(type, id, status) => {
                                                if (type === 'DETAILS') {
                                                    setSelectedJob(id); // JobCard passes job object as id here based on my refactor
                                                    setActiveModalTab('general');
                                                } else if (type === 'STATUS_CHANGE') {
                                                    onStatusChange(id, status);
                                                }
                                            }}
                                        />
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col relative" onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div className="p-6 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{selectedJob.Titre_poste}</h2>
                            <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                                <Building size={14} className="mr-1" />
                                <span className="font-medium mr-3">{selectedJob.Entreprise}</span>
                                <MapPin size={14} className="mr-1" />
                                <span>{selectedJob.Lieu}</span>
                            </div>
                        </div>

                        {/* Modal Tabs Container */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
                            <button
                                onClick={() => setActiveModalTab('general')}
                                className={`mr-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeModalTab === 'general'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                Général
                            </button>
                            <button
                                onClick={() => setActiveModalTab('tracking')}
                                className={`mr-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeModalTab === 'tracking'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                Suivi (360°)
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {activeModalTab === 'general' ? (
                                <>
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

                                    <div className="mb-6">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description du poste</h4>
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
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
                                </>
                            ) : (
                                <TrackingTabs
                                    job={selectedJob}
                                    onAddNote={handleAddNote}
                                    onUpdateNote={handleUpdateNote}
                                    onDeleteNote={handleDeleteNote}
                                    onAddLink={handleAddLink}
                                    onDeleteLink={handleDeleteLink}
                                    accessToken={accessToken}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardKanban;
