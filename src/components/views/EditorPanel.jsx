import React, { useState, useEffect } from 'react';
import { Layout, FileText, Mail, Info, Check, X, ChevronRight, Wand2, Plus, Trash2, Eye, Loader2 } from 'lucide-react';
import { generateCVHTML, generateLMHTML } from '../../utils/previewTemplates';
import signatureCss from '../../Signature.css?inline'; // Import CSS as string to extract base64

/* --- SUB-COMPONENTS FOR FORMS --- */

const CVEditor = ({ content, onChange }) => {
    // Default structure based on user example
    const data = content || {
        titre: "",
        profil_professionnel: "",
        competences: [],
        outils: [],
        experiences: []
    };

    const updateField = (field, value) => onChange({ ...data, [field]: value });

    // Helper for arrays (competences, outils)
    const updateArrayItem = (field, index, value) => {
        const newArr = [...(data[field] || [])];
        newArr[index] = value;
        updateField(field, newArr);
    };
    const addArrayItem = (field) => updateField(field, [...(data[field] || []), ""]);
    const removeArrayItem = (field, index) => {
        const newArr = [...(data[field] || [])];
        newArr.splice(index, 1);
        updateField(field, newArr);
    };

    // Helper for Experiences
    const updateExp = (index, field, value) => {
        const newExp = [...(data.experiences || [])];
        newExp[index] = { ...newExp[index], [field]: value };
        updateField('experiences', newExp);
    };
    const updateExpList = (expIndex, listField, itemIndex, value) => {
        const newExp = [...(data.experiences || [])];
        const newList = [...(newExp[expIndex][listField] || [])];
        newList[itemIndex] = value;
        newExp[expIndex] = { ...newExp[expIndex], [listField]: newList };
        updateField('experiences', newExp);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Titre du Profil</label>
                <input
                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:border-blue-500 outline-none transition-colors"
                    value={data.titre}
                    onChange={(e) => updateField('titre', e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Profil Professionnel</label>
                <textarea
                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 min-h-[100px] focus:border-blue-500 outline-none transition-colors"
                    value={data.profil_professionnel}
                    onChange={(e) => updateField('profil_professionnel', e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">
                        Compétences <button onClick={() => addArrayItem('competences')}><Plus size={14} /></button>
                    </label>
                    {data.competences?.map((comp, i) => (
                        <div key={i} className="flex gap-2">
                            <input
                                className="flex-1 p-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                value={comp}
                                onChange={(e) => updateArrayItem('competences', i, e.target.value)}
                            />
                            <button onClick={() => removeArrayItem('competences', i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                        </div>
                    ))}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">
                        Outils <button onClick={() => addArrayItem('outils')}><Plus size={14} /></button>
                    </label>
                    {data.outils?.map((outil, i) => (
                        <div key={i} className="flex gap-2">
                            <input
                                className="flex-1 p-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                value={outil}
                                onChange={(e) => updateArrayItem('outils', i, e.target.value)}
                            />
                            <button onClick={() => removeArrayItem('outils', i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2 border-gray-200 dark:border-gray-700">
                    <label className="text-xs font-bold text-gray-500 uppercase">Expériences</label>
                    <button onClick={() => updateField('experiences', [...(data.experiences || []), {}])} className="text-pepite-gold text-xs font-bold flex items-center gap-1 hover:text-yellow-500">
                        <Plus size={14} /> Ajouter Expérience
                    </button>
                </div>
                {data.experiences?.map((exp, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700 relative group transition-colors">
                        <button onClick={() => {
                            const newExp = [...data.experiences];
                            newExp.splice(i, 1);
                            updateField('experiences', newExp);
                        }} className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={16} />
                        </button>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <input className="p-2 border rounded text-sm font-semibold bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-100" placeholder="Titre du poste" value={exp.titre || ''} onChange={(e) => updateExp(i, 'titre', e.target.value)} />
                            <input className="p-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-100" placeholder="Entreprise" value={exp.entreprise || ''} onChange={(e) => updateExp(i, 'entreprise', e.target.value)} />
                            <input className="p-2 border rounded text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 dark:border-gray-600" placeholder="Date" value={exp.date || ''} onChange={(e) => updateExp(i, 'date', e.target.value)} />
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500">Réalisations</p>
                            {exp.realisations?.map((real, r) => (
                                <div key={r} className="flex gap-2">
                                    <textarea
                                        className="flex-1 p-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm h-16 resize-none bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                                        value={real}
                                        onChange={(e) => updateExpList(i, 'realisations', r, e.target.value)}
                                    />
                                    <button onClick={() => {
                                        const newReal = [...exp.realisations];
                                        newReal.splice(r, 1);
                                        updateExp(i, 'realisations', newReal);
                                    }} className="text-gray-400 hover:text-red-600 self-center"><X size={14} /></button>
                                </div>
                            ))}
                            <button onClick={() => {
                                const newReal = [...(exp.realisations || []), ""];
                                updateExp(i, 'realisations', newReal);
                            }} className="text-xs text-blue-500 hover:underline">+ Ajouter réalisation</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LMEditor = ({ content, onChange }) => {
    const data = content || {
        destinataire: { nom: "", titre: "", entreprise: "", adresse: "" },
        objet: "",
        corps: { accroche: "", apport_candidat: "", projection: "" },
        signature: "",
        politesse: ""
    };

    const updateField = (field, value) => onChange({ ...data, [field]: value });
    const updateNested = (parent, field, value) => onChange({ ...data, [parent]: { ...data[parent], [field]: value } });

    return (
        <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Destinataire</label>
                <div className="grid grid-cols-2 gap-3">
                    <input className="p-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-100" placeholder="Nom" value={data.destinataire?.nom || ''} onChange={(e) => updateNested('destinataire', 'nom', e.target.value)} />
                    <input className="p-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-100" placeholder="Titre" value={data.destinataire?.titre || ''} onChange={(e) => updateNested('destinataire', 'titre', e.target.value)} />
                    <input className="p-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-100" placeholder="Entreprise" value={data.destinataire?.entreprise || ''} onChange={(e) => updateNested('destinataire', 'entreprise', e.target.value)} />
                    <input className="p-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-100" placeholder="Adresse" value={data.destinataire?.adresse || ''} onChange={(e) => updateNested('destinataire', 'adresse', e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Objet</label>
                <input
                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:border-blue-500 outline-none"
                    value={data.objet}
                    onChange={(e) => updateField('objet', e.target.value)}
                />
            </div>

            <div className="space-y-4">
                <label className="text-xs font-bold text-gray-500 uppercase block border-b pb-1">Corps de la Lettre</label>

                <div className="space-y-1">
                    <span className="text-xs text-blue-600 font-semibold">Accroche (Le Vous)</span>
                    <textarea
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 min-h-[100px] focus:border-blue-500 outline-none"
                        value={data.corps?.accroche || ''}
                        onChange={(e) => updateNested('corps', 'accroche', e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <span className="text-xs text-blue-600 font-semibold">Apport Candidat (Le Moi)</span>
                    <textarea
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 min-h-[150px] focus:border-blue-500 outline-none"
                        value={data.corps?.apport_candidat || ''}
                        onChange={(e) => updateNested('corps', 'apport_candidat', e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <span className="text-xs text-blue-600 font-semibold">Projection (Le Nous)</span>
                    <textarea
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 min-h-[100px] focus:border-blue-500 outline-none"
                        value={data.corps?.projection || ''}
                        onChange={(e) => updateNested('corps', 'projection', e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-100">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Formule de politesse</label>
                    <input
                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
                        value={data.politesse}
                        onChange={(e) => updateField('politesse', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Signature</label>
                    <input
                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded text-sm font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700"
                        value={data.signature}
                        onChange={(e) => updateField('signature', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

const MessageEditor = ({ content, onChange }) => {
    const data = content || { objet_email: "", corps_email: "" };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Objet de l'email</label>
                <input
                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:border-blue-500 outline-none transition-colors"
                    value={data.objet_email}
                    onChange={(e) => onChange({ ...data, objet_email: e.target.value })}
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Corps de l'email</label>
                <textarea
                    className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 min-h-[300px] focus:border-blue-500 outline-none whitespace-pre-wrap transition-colors"
                    value={data.corps_email}
                    onChange={(e) => onChange({ ...data, corps_email: e.target.value })}
                />
            </div>
        </div>
    );
};


const EditorPanel = ({ jobs, onAction, processingCount = 0 }) => {
    const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.ID_Annonce || null);
    const [activeTab, setActiveTab] = useState('cv'); // cv, lm, message
    const [editedContent, setEditedContent] = useState({});
    const [showPreview, setShowPreview] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewScale, setPreviewScale] = useState(0.5);

    // Auto-scale preview to fit screen
    useEffect(() => {
        if (showPreview) {
            const updateScale = () => {
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;

                // Margins: 140px vertical (header + padding), 64px horizontal (padding)
                const availableHeight = viewportHeight - 140;
                const availableWidth = viewportWidth - 64;

                const a4Height = 1123; // 297mm @ 96 DPI
                const a4Width = 794;   // 210mm @ 96 DPI

                const scaleHeight = availableHeight / a4Height;
                const scaleWidth = availableWidth / a4Width;

                // Take the smallest ratio to ensure it fits entirely, max 0.95
                const newScale = Math.min(scaleHeight, scaleWidth, 0.95);
                setPreviewScale(newScale);
            };
            updateScale();
            window.addEventListener('resize', updateScale);
            return () => window.removeEventListener('resize', updateScale);
        }
    }, [showPreview]);

    // Extract signature from CSS (simple regex)
    const getSignatureFromCSS = () => {
        const match = signatureCss.match(/url\(([^)]+)\)/);
        return match ? match[1] : '';
    };

    const handlePreview = () => {
        let html = '';
        if (activeTab === 'cv') {
            html = generateCVHTML(editedContent.cv);
        } else if (activeTab === 'lm') {
            const signature = getSignatureFromCSS();
            html = generateLMHTML(editedContent.lm, signature);
        }

        if (html) {
            setPreviewHtml(html);
            setShowPreview(true);
        }
    };


    useEffect(() => {
        // If jobs exist but no selection, or selection refers to a job that was removed/filtered out
        if (jobs.length > 0) {
            const currentExists = jobs.find(j => j.ID_Annonce === selectedJobId);
            if (!currentExists) {
                // Auto-select the first available job
                setSelectedJobId(jobs[0].ID_Annonce);
            }
        } else {
            // No jobs left
            setSelectedJobId(null);
        }
    }, [jobs, selectedJobId]);

    const selectedJob = jobs.find(j => j.ID_Annonce === selectedJobId);

    // Initial parsing of job content (Reset when job changes)
    useEffect(() => {
        if (selectedJob) {
            const parseField = (field) => {
                if (!selectedJob[field]) return null;
                if (typeof selectedJob[field] === 'string') {
                    try { return JSON.parse(selectedJob[field]); } catch (e) { return null; }
                }
                return selectedJob[field];
            };

            setEditedContent({
                cv: parseField('CV_Texte_Adapte'),
                lm: parseField('LM_Texte'),
                message: parseField('Message_Contact')
            });
        }
    }, [selectedJob?.ID_Annonce]); // Depend on ID to ensure deep reset

    // Parse AI data for Left Panel
    const getAiData = () => {
        if (!selectedJob?.JSON_Analysis) return null; // Updated source field
        try {
            return typeof selectedJob.JSON_Analysis === 'string'
                ? JSON.parse(selectedJob.JSON_Analysis)
                : selectedJob.JSON_Analysis;
        } catch (e) {
            // Try legacy field
            if (selectedJob.data_pour_agent_redacteur) return JSON.parse(selectedJob.data_pour_agent_redacteur);
            return null;
        }
    };

    const aiData = getAiData();

    const handleValidation = () => {
        onAction('VALIDATE', selectedJobId, editedContent); // Sends objects
    };

    const handleTabChange = (tab, newContent) => {
        setEditedContent(prev => ({ ...prev, [tab]: newContent }));
    };

    if (!selectedJob) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400">
                <Layout size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Aucun dossier en cours de rédaction</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-140px)] gap-4 pb-20 md:pb-0">

            {/* LEFT PANEL: Context & List */}
            <div className="md:w-1/3 flex flex-col gap-4">
                {/* Job List Selector (Mini) */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto transition-colors">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">À traiter ({jobs.length})</h3>
                        {processingCount > 0 && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <Loader2 size={10} className="animate-spin" /> {processingCount} en cours
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        {jobs.map(job => (
                            <button
                                key={job.ID_Annonce}
                                onClick={() => setSelectedJobId(job.ID_Annonce)}
                                className={`w-full text-left p-2 rounded-xl text-sm flex justify-between items-center transition-colors
                        ${job.ID_Annonce === selectedJobId
                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-pepite-gold font-bold'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <span className="truncate">{job.Titre_poste} - {job.Entreprise}</span>
                                {job.ID_Annonce === selectedJobId && <ChevronRight size={14} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Job Details & AI Strategy */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 overflow-y-auto transition-colors">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{selectedJob.Titre_poste}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedJob.Entreprise}</p>
                        <a href={selectedJob.URL_offre} target="_blank" className="text-xs text-blue-500 hover:underline mt-1 block">Voir l'offre originale</a>
                    </div>

                    <div className="space-y-4">
                        {selectedJob.remarque_ATS && (
                            <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs leading-relaxed">
                                <Info size={14} className="inline mr-1 -mt-0.5" />
                                {selectedJob.remarque_ATS}
                            </div>
                        )}

                        {aiData && (
                            <div className="border border-blue-100 rounded-lg p-3 bg-blue-50/30">
                                <div className="flex items-center gap-2 mb-2 text-blue-700">
                                    <Wand2 size={16} />
                                    <h4 className="font-bold text-sm">Stratégie IA</h4>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Diagnostic Gap</p>
                                        <p className="text-xs text-gray-800 bg-white p-2 rounded border border-blue-100">{aiData.diagnostic_gap}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Recommandations</p>
                                        <p className="text-xs text-gray-800 bg-white p-2 rounded border border-blue-100">{aiData.stratégie_adaptation}</p>
                                    </div>
                                    {aiData.mots_cles_obligatoires && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-600 mb-1">Mots-clés requis</p>
                                            <div className="flex flex-wrap gap-1">
                                                {aiData.mots_cles_obligatoires.map((kw, i) => (
                                                    <span key={i} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600">{kw}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Editor */}
            <div className="md:w-2/3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden transition-colors">
                {/* Editor Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-700 flex-none z-10 bg-white dark:bg-gray-800">
                    <button
                        onClick={() => setActiveTab('cv')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                ${activeTab === 'cv'
                                ? 'border-pepite-gold text-pepite-gold bg-yellow-50/50 dark:bg-yellow-900/10'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <FileText size={16} /> Adaptation CV
                    </button>
                    <button
                        onClick={() => setActiveTab('lm')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                ${activeTab === 'lm'
                                ? 'border-pepite-gold text-pepite-gold bg-yellow-50/50 dark:bg-yellow-900/10'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <FileText size={16} /> Lettre Motivation
                    </button>
                    <button
                        onClick={() => setActiveTab('message')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                ${activeTab === 'message'
                                ? 'border-pepite-gold text-pepite-gold bg-yellow-50/50 dark:bg-yellow-900/10'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Mail size={16} /> Brief Message
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm min-h-full">
                        {activeTab === 'cv' && (
                            <CVEditor
                                content={editedContent.cv}
                                onChange={(data) => handleTabChange('cv', data)}
                            />
                        )}
                        {activeTab === 'lm' && (
                            <LMEditor
                                content={editedContent.lm}
                                onChange={(data) => handleTabChange('lm', data)}
                            />
                        )}
                        {activeTab === 'message' && (
                            <MessageEditor
                                content={editedContent.message}
                                onChange={(data) => handleTabChange('message', data)}
                            />
                        )}
                    </div>
                </div>

                {/* Action Bar */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 flex-none transition-colors">
                    <div className="flex gap-3">
                        {(activeTab === 'cv' || activeTab === 'lm') && (
                            <button
                                onClick={handlePreview}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-sm font-medium transition-colors"
                            >
                                <Eye size={18} /> Aperçu HTML
                            </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => onAction('SAVE_DRAFT', selectedJobId, editedContent)}
                            title="Sauvegarder brouillon"
                        >
                            <FileText size={20} />
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => onAction('REJECT_DRAFT', selectedJobId)}
                            className="p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                            title="Rejeter"
                        >
                            <X size={24} />
                        </button>
                        <button
                            onClick={handleValidation}
                            className="p-3 bg-pepite-gold text-white hover:bg-yellow-500 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                            title="Valider & Générer PDF"
                        >
                            <Check size={28} />
                        </button>
                    </div>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {showPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 transition-colors"
                        style={{
                            // Dynamic max sizing to fit comfortably
                            maxWidth: 'calc(100vw - 40px)',
                            maxHeight: 'calc(100vh - 40px)'
                        }}
                    >
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 flex-none">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100">Aperçu {activeTab.toUpperCase()}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Ajusté à l'écran</p>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-950/50 p-4 overflow-hidden flex items-center justify-center rounded-b-xl">
                            {/* Layout Wrapper - Sized to match scaled content exactly */}
                            <div style={{
                                width: `${794 * previewScale}px`,  // 210mm @ 96dpi approx
                                height: `${1123 * previewScale}px`, // 297mm @ 96dpi approx
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                transition: 'all 0.2s ease-out',
                                flexShrink: 0
                            }}>
                                {/* Scaled Content - Origin Top Left to fit in wrapper */}
                                <div style={{
                                    width: '794px',
                                    height: '1123px',
                                    transform: `scale(${previewScale})`,
                                    transformOrigin: 'top left',
                                    backgroundColor: 'white'
                                }}>
                                    <iframe
                                        title="Preview"
                                        srcDoc={previewHtml + `<style>body{overflow:hidden !important;}::-webkit-scrollbar{display:none;}</style>`}
                                        className="w-full h-full border-none block"
                                        scrolling="no"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditorPanel;
