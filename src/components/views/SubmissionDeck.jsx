import React from 'react';
import { Download, Copy, Send, Building, User, Linkedin, Mail, Phone, ExternalLink } from 'lucide-react';
import { STATUS } from '../../utils/consts';

const SubmissionDeck = ({ jobs, onAction }) => {

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
                <div key={job.ID_Annonce} className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">

                    {/* Header */}
                    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 p-4 flex justify-between items-start transition-colors">
                        <div>
                            <h3 className="font-bold text-lg text-pepite-dark dark:text-white">{job.Titre_poste}</h3>
                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                <Building size={14} className="mr-1" /> {job.Entreprise}
                                <a href={job.URL_offre} target="_blank" className="ml-2 opacity-50 hover:opacity-100 hover:text-pepite-gold"><ExternalLink size={12} /></a>
                            </div>
                        </div>
                        <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs font-bold px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
                            PRÊTE
                        </div>
                    </div>

                    <div className="p-5 space-y-6">

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
                                        <a href={job.Linkedin_Recruteur} target="_blank" className="flex items-center text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30">
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
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-pepite-dark dark:group-hover:text-pepite-gold">Télécharger CV</span>
                            </a>
                            <a
                                href={job.LM_Doc_URL}
                                target="_blank"
                                className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors group"
                            >
                                <Download size={20} className="text-gray-400 dark:text-gray-500 group-hover:text-pepite-gold mb-1" />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-pepite-dark dark:group-hover:text-pepite-gold">Télécharger LM</span>
                            </a>

                            {job.Combined_PDF_URL && (
                                <a
                                    href={job.Combined_PDF_URL}
                                    target="_blank"
                                    className="col-span-2 flex flex-col items-center justify-center p-3 border-2 border-dashed border-pepite-gold bg-yellow-50/30 dark:bg-yellow-900/10 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors group"
                                >
                                    <Download size={20} className="text-pepite-gold group-hover:text-yellow-600 mb-1" />
                                    <span className="text-xs font-bold text-pepite-dark dark:text-pepite-gold">Télécharger Dossier Complet (CV & LM)</span>
                                </a>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={() => { navigator.clipboard.writeText(job.Message_Contact); alert('Message copié !') }}
                                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Copy size={16} /> Copier le message d'intro
                            </button>

                            {job.Email_Recruteur ? (
                                <button
                                    onClick={() => onAction('SEND_EMAIL', job.ID_Annonce)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-pepite-gold text-white rounded-full font-bold shadow hover:bg-yellow-500 transform hover:scale-[1.02] transition-all"
                                >
                                    <Mail size={18} /> ENVOYER PAR MAIL
                                </button>
                            ) : (
                                <button
                                    onClick={() => onAction('MARK_SENT', job.ID_Annonce)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-pepite-gold text-white rounded-full font-bold shadow hover:bg-yellow-500 transform hover:scale-[1.02] transition-all"
                                >
                                    <Send size={18} /> MARQUER COMME ENVOYÉ
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            ))}
        </div>
    );
};

export default SubmissionDeck;
