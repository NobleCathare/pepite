import { useState } from 'react';
import { Download, Copy, Send, Building, User, Linkedin, Mail, Phone, ExternalLink, RefreshCw, FileText, Loader2, Files } from 'lucide-react';
import { STATUS } from '../../utils/consts';
import JobCard from '../cards/JobCard';
import { generatePDF, downloadPDF, mergePDFs } from '../../services/pdfService';
import { generateCVHTML, generateLMHTML } from '../../utils/previewTemplates';
import { useUser } from '../../hooks/useUser';

const SubmissionDeck = ({ jobs, onAction }) => {
    const { user } = useUser();
    const [generating, setGenerating] = useState({}); // Track per-job loading states

    // Helper to clean HTML and format message for copy
    const formatMessageForCopy = (messageSource) => {
        if (!messageSource) return "";

        let subject = "";
        let body = messageSource;

        // Handle JSON format
        if (typeof messageSource === 'string' && messageSource.startsWith('{')) {
            try {
                const parsed = JSON.parse(messageSource);
                subject = parsed.objet_email || "";
                body = parsed.corps_email || "";
            } catch (e) {
                console.error("Failed to parse message JSON", e);
            }
        }

        const clean = (html) => {
            if (!html) return "";
            let text = html;
            text = text.replace(/<br\s*\/?>/gi, "\n");
            text = text.replace(/<\/p>/gi, "\n\n");
            text = text.replace(/<\/div>/gi, "\n");
            text = text.replace(/<li>/gi, "• ");
            text = text.replace(/<\/li>/gi, "\n");
            const doc = new DOMParser().parseFromString(text, 'text/html');
            return doc.body.textContent || "";
        };

        const cleanBody = clean(body);
        if (subject) {
            return `Objet: ${subject}\n\n${cleanBody}`;
        }
        return cleanBody;
    };

    // Parse CV data from job
    const parseCVData = (job) => {
        try {
            if (job.CV_Texte_Adapte) {
                return typeof job.CV_Texte_Adapte === 'string'
                    ? JSON.parse(job.CV_Texte_Adapte)
                    : job.CV_Texte_Adapte;
            }
        } catch (e) {
            console.error("Failed to parse CV data", e);
        }
        return null;
    };

    // Parse LM data from job
    const parseLMData = (job) => {
        try {
            if (job.LM_Texte) {
                return typeof job.LM_Texte === 'string'
                    ? JSON.parse(job.LM_Texte)
                    : job.LM_Texte;
            }
        } catch (e) {
            console.error("Failed to parse LM data", e);
        }
        return null;
    };

    // Generate and download CV PDF
    const handleDownloadCV = async (job) => {
        const key = `cv-${job.id}`;
        setGenerating(prev => ({ ...prev, [key]: true }));

        try {
            const cvData = parseCVData(job);
            if (!cvData) {
                alert("Données CV non disponibles. Veuillez régénérer le dossier.");
                return;
            }

            const html = generateCVHTML(cvData);
            const accentColor = user?.pdf_accent_color || '#2c3e50';
            const finalHtml = html.replace(/#2c3e50/gi, accentColor);

            const blob = await generatePDF(finalHtml);
            const filename = `CV_${job.Entreprise?.replace(/\s+/g, '_') || 'Candidature'}_${new Date().toISOString().slice(0, 10)}`;
            downloadPDF(blob, filename);

        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            setGenerating(prev => ({ ...prev, [key]: false }));
        }
    };

    // Generate and download LM PDF
    const handleDownloadLM = async (job) => {
        const key = `lm-${job.id}`;
        setGenerating(prev => ({ ...prev, [key]: true }));

        try {
            const lmData = parseLMData(job);
            if (!lmData) {
                alert("Données LM non disponibles. Veuillez régénérer le dossier.");
                return;
            }

            const signatureBase64 = user?.signature_base64 || '';
            const html = generateLMHTML(lmData, signatureBase64);
            const accentColor = user?.pdf_accent_color || '#2c3e50';
            const finalHtml = html.replace(/#2c3e50/gi, accentColor);

            const blob = await generatePDF(finalHtml);
            const poste = job.Titre_poste?.replace(/\s+/g, '_').slice(0, 30) || 'Poste';
            const filename = `LM_${poste}_${new Date().toISOString().slice(0, 10)}`;
            downloadPDF(blob, filename);

        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            setGenerating(prev => ({ ...prev, [key]: false }));
        }
    };

    // Generate and download Combined CV+LM PDF
    const handleDownloadCombined = async (job) => {
        const key = `combined-${job.id}`;
        setGenerating(prev => ({ ...prev, [key]: true }));

        try {
            const cvData = parseCVData(job);
            const lmData = parseLMData(job);

            if (!cvData && !lmData) {
                alert("Données CV et LM non disponibles. Veuillez régénérer le dossier.");
                return;
            }

            const signatureBase64 = user?.signature_base64 || '';
            const accentColor = user?.pdf_accent_color || '#2c3e50';

            const pdfsToMerge = [];

            // Generate CV PDF
            if (cvData) {
                const cvHtml = generateCVHTML(cvData);
                const finalCvHtml = cvHtml.replace(/#2c3e50/gi, accentColor);
                const cvBlob = await generatePDF(finalCvHtml);
                pdfsToMerge.push(cvBlob);
            }

            // Generate LM PDF
            if (lmData) {
                const lmHtml = generateLMHTML(lmData, signatureBase64);
                const finalLmHtml = lmHtml.replace(/#2c3e50/gi, accentColor);
                const lmBlob = await generatePDF(finalLmHtml);
                pdfsToMerge.push(lmBlob);
            }

            // Merge PDFs
            let finalBlob;
            if (pdfsToMerge.length > 1) {
                finalBlob = await mergePDFs(pdfsToMerge);
            } else if (pdfsToMerge.length === 1) {
                finalBlob = pdfsToMerge[0];
            } else {
                throw new Error("Aucun PDF à générer");
            }

            const entreprise = job.Entreprise?.replace(/\\s+/g, '_') || 'Candidature';
            const filename = `Candidature_${entreprise}_${new Date().toISOString().slice(0, 10)}`;
            downloadPDF(finalBlob, filename);

        } catch (error) {
            console.error("Combined PDF Generation Error:", error);
            alert(`Erreur: ${error.message}`);
        } finally {
            setGenerating(prev => ({ ...prev, [key]: false }));
        }
    };

    if (jobs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
                <Send size={48} className="mb-4 opacity-20" />
                <p className="text-lg">Aucune candidature prête à l'envoi</p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(340px,1fr))] pb-20 md:pb-0">
            {jobs.map(job => (
                <JobCard
                    key={job.ID_Annonce}
                    job={job}
                    variant="submission"
                    onAction={onAction}
                >
                    <div className="space-y-6 mt-4">
                        {/* Recruiter Widget */}
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-pepite-gold border border-yellow-100 dark:border-yellow-900/30">
                                <User size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {job.Prenom_Recruteur || 'Responsable'} {job.Nom_Recruteur || 'Recrutement'}
                                </p>
                                <p className="text-xs text-gray-500 mb-2">{job.Poste_Recruteur || job.Type_Recruteur || "Recruteur"}</p>

                                <div className="flex flex-wrap gap-2">
                                    {job.Linkedin_Recruteur && (
                                        <a href={job.Linkedin_Recruteur} target="_blank" className="flex items-center text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-pepite-bronze dark:text-pepite-gold px-2 py-1 rounded-full hover:bg-pepite-gold/10 dark:hover:bg-pepite-gold/20">
                                            <Linkedin size={12} className="mr-1" /> Profil
                                        </a>
                                    )}
                                    {job.Email_Recruteur && (
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(job.Email_Recruteur); alert('Email copié !') }}
                                            className="flex items-center text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            <Mail size={12} className="mr-1" /> Copier Email
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PDF Generation Buttons */}
                        <div className="space-y-3">
                            {/* Row 1: CV and LM buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* CV Download Button */}
                                <button
                                    onClick={() => job.CV_Doc_URL ? window.open(job.CV_Doc_URL, '_blank') : handleDownloadCV(job)}
                                    disabled={generating[`cv-${job.id}`]}
                                    className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors group disabled:opacity-50 disabled:cursor-wait"
                                    title={job.CV_Doc_URL ? "Télécharger depuis Drive" : "Générer le PDF"}
                                >
                                    {generating[`cv-${job.id}`] ? (
                                        <Loader2 size={20} className="text-pepite-gold animate-spin mb-1" />
                                    ) : (
                                        <FileText size={20} className={`mb-1 ${job.CV_Doc_URL ? 'text-pepite-gold' : 'text-gray-400 dark:text-gray-500 group-hover:text-pepite-gold'}`} />
                                    )}
                                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 group-hover:text-pepite-dark dark:group-hover:text-pepite-gold">
                                        {generating[`cv-${job.id}`] ? 'Génération...' : (job.CV_Doc_URL ? 'CV (Drive)' : 'Générer CV')}
                                    </span>
                                </button>

                                {/* LM Download Button */}
                                <button
                                    onClick={() => job.LM_Doc_URL ? window.open(job.LM_Doc_URL, '_blank') : handleDownloadLM(job)}
                                    disabled={generating[`lm-${job.id}`]}
                                    className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors group disabled:opacity-50 disabled:cursor-wait"
                                    title={job.LM_Doc_URL ? "Télécharger depuis Drive" : "Générer le PDF"}
                                >
                                    {generating[`lm-${job.id}`] ? (
                                        <Loader2 size={20} className="text-pepite-gold animate-spin mb-1" />
                                    ) : (
                                        <FileText size={20} className={`mb-1 ${job.LM_Doc_URL ? 'text-pepite-gold' : 'text-gray-400 dark:text-gray-500 group-hover:text-pepite-gold'}`} />
                                    )}
                                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 group-hover:text-pepite-dark dark:group-hover:text-pepite-gold">
                                        {generating[`lm-${job.id}`] ? 'Génération...' : (job.LM_Doc_URL ? 'LM (Drive)' : 'Générer LM')}
                                    </span>
                                </button>
                            </div>

                            {/* Row 2: Combined CV+LM Button */}
                            <button
                                onClick={() => job.Combined_PDF_URL ? window.open(job.Combined_PDF_URL, '_blank') : handleDownloadCombined(job)}
                                disabled={generating[`combined-${job.id}`]}
                                className={`w-full flex items-center justify-center gap-2 p-3 border-2 rounded-xl transition-colors ${generating[`combined-${job.id}`]
                                        ? 'border-pepite-gold bg-yellow-50 dark:bg-yellow-900/10 text-pepite-gold cursor-wait'
                                        : 'border-pepite-gold/50 dark:border-pepite-gold/30 hover:border-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/10 text-pepite-bronze dark:text-pepite-gold'
                                    }`}
                                title={job.Combined_PDF_URL ? "Télécharger CV + LM combinés depuis Drive" : "Générer et télécharger CV + LM combinés"}
                            >
                                {generating[`combined-${job.id}`] ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : job.Combined_PDF_URL ? (
                                    <Download size={18} />
                                ) : (
                                    <Files size={18} />
                                )}
                                <span className="text-xs font-bold">
                                    {generating[`combined-${job.id}`]
                                        ? 'GÉNÉRATION EN COURS...'
                                        : job.Combined_PDF_URL || job.LM_CV
                                            ? 'TÉLÉCHARGER CV + LM COMBINÉ'
                                            : 'GÉNÉRER CV + LM COMBINÉ'}
                                </span>
                            </button>
                        </div>

                        {/* Utility Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={() => { navigator.clipboard.writeText(formatMessageForCopy(job.Message_Contact)); alert('Message d\'introduction copié !') }}
                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-pepite-bronze dark:text-pepite-gold border-2 border-pepite-gold/30 rounded-full hover:bg-pepite-gold/10 transition-colors"
                            >
                                <Copy size={14} /> COPIER LE MESSAGE D'INTRO
                            </button>
                        </div>
                    </div>
                </JobCard>
            ))}
        </div>
    );
};

export default SubmissionDeck;
