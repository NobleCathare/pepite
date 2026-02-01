import { useState, useMemo, useEffect } from 'react';
import { STATUS, getScoreColor, SOURCES } from '../../utils/consts';
import { MapPin, Building, Euro, Calendar, Briefcase, ExternalLink, ThumbsUp, ThumbsDown, Clock, CheckCircle, FileText, Send, AlertTriangle, X } from 'lucide-react';
import JobCard from '../cards/JobCard';
import TrackingTabs from './TrackingTabs';

import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- SORTABLE ITEM WRAPPER ---
const SortableJobCard = ({ job, onAction, isRelance }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: job.id || job.ID_Annonce,
        data: {
            type: 'Job',
            job,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative cursor-grab active:cursor-grabbing"
        >
            {isRelance && (
                <div className="absolute top-0 right-0 z-10 overflow-hidden w-16 h-16 pointer-events-none">
                    <div className="bg-pepite-gold text-white text-[8px] font-black uppercase tracking-tighter py-1 px-8 absolute top-3 -right-6 rotate-45 shadow-sm">Relancer</div>
                </div>
            )}
            <JobCard
                job={job}
                variant="kanban"
                onAction={onAction}
            />
        </div>
    );
};

// --- KANBAN COLUMN COMPONENT ---
const KanbanColumn = ({ id, label, color, jobs, onAction, sortBy }) => {
    const { setNodeRef } = useSortable({
        id: id,
        data: {
            type: 'Column',
            columnId: id,
        },
    });

    return (
        <div
            ref={setNodeRef}
            className="w-80 flex flex-col h-full rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 transition-colors"
        >
            <div className={`p-3 rounded-t-xl border-b border-gray-100 dark:border-gray-700 ${color} dark:bg-opacity-20 flex justify-between items-center`}>
                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">{label}</h3>
                <span className="bg-white/50 dark:bg-black/20 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full font-medium">
                    {jobs.length}
                </span>
            </div>

            <div className={`p-2 flex-1 overflow-y-auto space-y-3 custom-scrollbar`}>
                <SortableContext items={jobs.map(j => j.id || j.ID_Annonce)} strategy={verticalListSortingStrategy}>
                    {jobs.map(job => {
                        const sendDate = new Date(job.Date_Traitement || job.Date_Envoie);
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        const isRelance = job.Statut === STATUS.ENVOYEE && sendDate < sevenDaysAgo;

                        return (
                            <SortableJobCard
                                key={job.id || job.ID_Annonce}
                                job={job}
                                onAction={onAction}
                                isRelance={isRelance}
                            />
                        );
                    })}
                </SortableContext>
                {jobs.length === 0 && (
                    <div className="text-center py-10 text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-lg m-2">
                        Glisser ici
                    </div>
                )}
            </div>
        </div>
    );
};

const DashboardKanban = ({ jobs: initialJobs, onStatusChange, onUpdateJob, accessToken }) => {
    const [sortBy, setSortBy] = useState('date');
    const [showOnlyFollowUps, setShowOnlyFollowUps] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [activeModalTab, setActiveModalTab] = useState('general');
    const [activeId, setActiveId] = useState(null);
    const [localJobs, setLocalJobs] = useState(initialJobs);

    // Sync local state with props (PocketBase real-time)
    useEffect(() => {
        setLocalJobs(initialJobs);
    }, [initialJobs]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Sensibilité au déplacement pour différencier le clic du drag
            },
        })
    );

    const columns = [
        { id: STATUS.ENVOYEE, label: 'Envoyées', color: 'bg-blue-50' },
        { id: STATUS.ENTRETIEN, label: 'Entretiens', color: 'bg-indigo-50' },
        { id: STATUS.OFFRE, label: 'Offres', color: 'bg-green-50' },
        { id: STATUS.REFUSEE, label: 'Refusées', color: 'bg-red-50' },
    ];

    const getSortedJobsForColumn = (colId) => {
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        let filtered = localJobs.filter(j => {
            const lastActivity = new Date(j.Date_Traitement || j.updated || j.created);
            if (lastActivity < eightWeeksAgo && j.Statut !== STATUS.REFUSEE && j.Statut !== STATUS.REFUSEE_APRES_ENTRETIEN) {
                return colId === STATUS.REFUSEE;
            }
            if (colId === STATUS.REFUSEE) {
                return j.Statut === STATUS.REFUSEE || j.Statut === STATUS.REFUSEE_APRES_ENTRETIEN;
            }
            return j.Statut === colId;
        });

        if (showOnlyFollowUps) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            filtered = filtered.filter(j => {
                const sendDate = new Date(j.Date_Traitement || j.Date_Envoie);
                return j.Statut === STATUS.ENVOYEE && sendDate < sevenDaysAgo;
            });
        }

        if (sortBy === 'score_ats') {
            filtered.sort((a, b) => (b.score_ats || b.score_ATS || 0) - (a.score_ats || a.score_ATS || 0));
        } else if (sortBy === 'score_ia_desc') {
            filtered.sort((a, b) => (b._score || 0) - (a._score || 0));
        } else if (sortBy === 'score_ia_asc') {
            filtered.sort((a, b) => (a._score || 0) - (b._score || 0));
        } else {
            filtered.sort((a, b) => {
                const dateA = a.Date_Traitement ? new Date(a.Date_Traitement) : new Date(0);
                const dateB = b.Date_Traitement ? new Date(b.Date_Traitement) : new Date(0);
                return dateB - dateA;
            });
        }

        return filtered;
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeItem = active.data.current?.job;
        const overType = over.data.current?.type;

        if (!activeItem) return;

        // Moving between columns
        let targetStatus = null;
        if (overType === 'Column') {
            targetStatus = over.data.current.columnId;
        } else if (overType === 'Job') {
            targetStatus = over.data.current.job.Statut;
        }

        if (targetStatus && activeItem.Statut !== targetStatus) {
            // Check for special status RefuséeEntretient
            let finalStatus = targetStatus;
            if (activeItem.Statut === STATUS.ENTRETIEN && targetStatus === STATUS.REFUSEE) {
                finalStatus = STATUS.REFUSEE_APRES_ENTRETIEN;
            }

            // Optimistic update
            setLocalJobs(prev => prev.map(j => (j.id === active.id || j.ID_Annonce === active.id) ? { ...j, Statut: finalStatus } : j));
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) {
            // Reset to props if dropped outside
            setLocalJobs(initialJobs);
            return;
        }

        const job = localJobs.find(j => j.id === active.id || j.ID_Annonce === active.id);
        if (!job) return;

        let targetStatus = null;
        if (over.data.current?.type === 'Column') {
            targetStatus = over.data.current.columnId;
        } else if (over.data.current?.type === 'Job') {
            targetStatus = over.data.current.job.Statut;
        }

        if (targetStatus) {
            let finalStatus = targetStatus;
            if (job.Statut === STATUS.ENTRETIEN && targetStatus === STATUS.REFUSEE) {
                finalStatus = STATUS.REFUSEE_APRES_ENTRETIEN;
            }

            // Persist to backend
            if (onStatusChange) {
                onStatusChange(job.id || job.ID_Annonce, finalStatus, {
                    Date_Traitement: new Date().toISOString()
                });
            }
        }
    };

    // --- TRACKING LOGIC ---
    const handleAddNote = (noteContent) => {
        if (!selectedJob || !onUpdateJob) return;
        const newNote = { date: new Date().toISOString(), content: noteContent };
        const updatedNotes = selectedJob.Notes ? [...selectedJob.Notes, newNote] : [newNote];
        const updatedJob = { ...selectedJob, Notes: updatedNotes };
        setSelectedJob(updatedJob);
        onUpdateJob(updatedJob);
    };

    const handleUpdateNote = (index, newContent, newDate) => {
        if (!selectedJob) return;
        const updatedNotes = [...(selectedJob.Notes || [])];
        if (updatedNotes[index]) {
            updatedNotes[index] = { ...updatedNotes[index], content: newContent, ...(newDate ? { date: newDate } : {}) };
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

    const activeJob = activeId ? localJobs.find(j => j.id === activeId || j.ID_Annonce === activeId) : null;

    return (
        <div className="h-full overflow-x-auto pb-20 md:pb-0 relative">
            <div className="absolute top-0 right-4 z-10 flex items-center gap-3">
                <button
                    onClick={() => setShowOnlyFollowUps(!showOnlyFollowUps)}
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all ${showOnlyFollowUps ? 'bg-pepite-gold text-white border-pepite-gold shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}
                    title="N'afficher que les relances (>7j)"
                >
                    <AlertTriangle size={14} />
                    <span className="hidden sm:inline">Relances</span>
                </button>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white dark:bg-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer outline-none focus:ring-1 ring-pepite-gold/20 [color-scheme:light] dark:[color-scheme:dark]"
                >
                    <option value="date">Tri : Récent</option>
                    <option value="score_ats">Tri : Score ATS</option>
                    <option value="score_ia_desc">Tri : Score IA (+/-)</option>
                    <option value="score_ia_asc">Tri : Score IA (-/+)</option>
                </select>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 min-w-[1000px] h-full pt-8">
                    {columns.map(col => (
                        <KanbanColumn
                            key={col.id}
                            id={col.id}
                            label={col.label}
                            color={col.color}
                            jobs={getSortedJobsForColumn(col.id)}
                            sortBy={sortBy}
                            onAction={(type, jobData) => {
                                if (type === 'DETAILS') {
                                    setSelectedJob(jobData);
                                    setActiveModalTab('general');
                                } else if (type === 'STATUS_CHANGE') {
                                    onStatusChange(jobData.id || jobData.ID_Annonce, jobData.nextStatus);
                                }
                            }}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: {
                            active: {
                                opacity: '0.4',
                            },
                        },
                    }),
                }}>
                    {activeJob ? (
                        <div className="w-80 opacity-90 shadow-2xl rotate-3 cursor-grabbing scale-105 transition-transform">
                            <JobCard job={activeJob} variant="kanban" />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* DETAIL POPUP */}
            {selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedJob(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <button onClick={() => setSelectedJob(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10">
                                <X size={24} />
                            </button>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col items-start gap-1">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${SOURCES[selectedJob.Source]?.color || 'bg-gray-100 text-gray-600'}`}>
                                        {SOURCES[selectedJob.Source]?.label || selectedJob.Source}
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                        <Calendar size={10} /> {selectedJob.Date_Publication || selectedJob.Date_Traitement}
                                    </span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className={`text-sm font-bold px-2 py-0.5 rounded border border-transparent ${getScoreColor(selectedJob._score)} bg-opacity-10 leading-none`}>
                                        <span className="text-[8px] uppercase tracking-wide opacity-70 block mb-0.5">REC</span>
                                        {selectedJob._score || 0}
                                    </div>
                                    <div className={`text-sm font-bold opacity-60 ${getScoreColor(selectedJob.score_ATS)} leading-none`}>
                                        <span className="text-[8px] uppercase tracking-wide block mb-0.5">ATS</span>
                                        {selectedJob.score_ATS || 0}
                                    </div>
                                    {selectedJob.score_AI !== undefined && selectedJob.score_AI > 0 && (
                                        <div className="text-base font-extrabold text-purple-600 dark:text-purple-400 ml-2" title="Score IA">
                                            {selectedJob.score_AI}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedJob.Titre_poste}</h2>
                            <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm flex-wrap gap-y-1">
                                <Building size={14} className="mr-1 shrink-0" />
                                <span className="font-bold mr-3 text-pepite-bronze dark:text-pepite-gold">{selectedJob.Entreprise}</span>
                                <div className="flex items-center">
                                    <MapPin size={14} className="mr-1 shrink-0" />
                                    <span>{selectedJob.Lieu}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
                            <button onClick={() => setActiveModalTab('general')} className={`mr-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeModalTab === 'general' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Général</button>
                            <button onClick={() => setActiveModalTab('tracking')} className={`mr-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeModalTab === 'tracking' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Suivi (360°)</button>
                        </div>

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
                                                <div className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreColor(selectedJob.score_ATS)}`}>Mots-clés {selectedJob.score_ATS}</div>
                                                <div className="px-2 py-1 rounded-full text-xs font-bold text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900/30">IA {selectedJob.score_AI}%</div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 italic">"{selectedJob.remarque_ATS}"</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                            <span className="text-xs text-gray-400 block uppercase">Traitement</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-200 text-sm block mt-1">{selectedJob.Date_Traitement ? new Date(selectedJob.Date_Traitement).toLocaleString() : 'Non traité'}</span>
                                            {selectedJob.Prenom_Recruteur && <div className="mt-2 text-xs text-gray-500">Contact: {selectedJob.Prenom_Recruteur} {selectedJob.Nom_Recruteur}</div>}
                                        </div>
                                    </div>
                                    <div className="mb-6">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description du poste</h4>
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedJob.Description}</div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        {selectedJob.URL_offre && <a href={selectedJob.URL_offre} target="_blank" className="flex-1 bg-pepite-dark text-white text-center py-2 rounded-lg hover:bg-black transition-colors">Offre Originale</a>}
                                        {selectedJob.CV_Doc_URL && <a href={selectedJob.CV_Doc_URL} target="_blank" className="flex-1 border border-gray-200 text-gray-700 text-center py-2 rounded-lg hover:bg-gray-50 transition-colors">Voir CV</a>}
                                        {selectedJob.LM_Doc_URL && <a href={selectedJob.LM_Doc_URL} target="_blank" className="flex-1 border border-gray-200 text-gray-700 text-center py-2 rounded-lg hover:bg-gray-50 transition-colors">Voir LM</a>}
                                    </div>
                                </>
                            ) : (
                                <TrackingTabs job={selectedJob} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onAddLink={handleAddLink} onDeleteLink={handleDeleteLink} accessToken={accessToken} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardKanban;
