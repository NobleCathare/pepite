import { Download, Copy, Send, Building, User, Linkedin, Mail, Phone, ExternalLink, RefreshCw } from 'lucide-react';
import { STATUS } from '../../utils/consts';
import JobCard from '../cards/JobCard';

const SubmissionDeck = ({ jobs, onAction }) => {
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
                                    {job.Prenom_Recruteur} {job.Nom_Recruteur}
                                </p>
                                <p className="text-xs text-gray-500 mb-2">{job.Poste_Recruteur || "Recruteur"}</p>

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

                        {/* Documents */}
                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href={job.CV_Doc_URL}
                                target="_blank"
                                className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors group"
                            >
                                <Download size={20} className="text-gray-400 dark:text-gray-500 group-hover:text-pepite-gold mb-1" />
                                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 group-hover:text-pepite-dark dark:group-hover:text-pepite-gold">Télécharger CV</span>
                            </a>
                            <a
                                href={job.LM_Doc_URL}
                                target="_blank"
                                className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors group"
                            >
                                <Download size={20} className="text-gray-400 dark:text-gray-500 group-hover:text-pepite-gold mb-1" />
                                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 group-hover:text-pepite-dark dark:group-hover:text-pepite-gold">Télécharger LM</span>
                            </a>

                            {job.Combined_PDF_URL && (
                                <a
                                    href={job.Combined_PDF_URL}
                                    target="_blank"
                                    className="col-span-2 flex flex-col items-center justify-center p-3 border-2 border-dashed border-pepite-gold bg-yellow-50/30 dark:bg-yellow-900/10 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors group"
                                >
                                    <Download size={20} className="text-pepite-gold group-hover:text-yellow-600 mb-1" />
                                    <span className="text-[10px] font-bold text-pepite-dark dark:text-pepite-gold">Télécharger Dossier Complet (CV & LM)</span>
                                </a>
                            )}
                        </div>

                        {/* Utility Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={() => { navigator.clipboard.writeText(formatMessageForCopy(job.Message_Contact)); alert('Message d\'introduction copié !') }}
                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-pepite-bronze dark:text-pepite-gold border-2 border-pepite-gold/30 rounded-full hover:bg-pepite-gold/10 transition-colors"
                            >
                                <Copy size={14} /> COPIER LE MESSAGE D'INTRO
                            </button>

                            {job.Email_Recruteur && (
                                <button
                                    onClick={() => onAction('SEND_EMAIL', job.ID_Annonce)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-pepite-gold text-white rounded-full font-extrabold shadow-md hover:bg-yellow-500 transform hover:scale-[1.01] transition-all text-sm uppercase tracking-wide"
                                >
                                    <Mail size={18} /> Envoyer par Mail
                                </button>
                            )}
                        </div>
                    </div>
                </JobCard>
            ))}
        </div>
    );
};

export default SubmissionDeck;
