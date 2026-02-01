/**
 * PdfPreview.jsx
 * Standalone page for previewing PDF template with custom color
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateCVHTML, generateLMHTML } from '../../utils/previewTemplates';
import { useUser } from '../../hooks/useUser';
import { X, FileText, Mail, RefreshCw } from 'lucide-react';

const PdfPreview = () => {
    const [searchParams] = useSearchParams();
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState('cv');
    const [scale, setScale] = useState(0.7);

    // Get color from URL params
    const accentColor = searchParams.get('color') || '#2c3e50';
    const userName = searchParams.get('name')?.replace('+', ' ') || 'Prénom Nom';

    // Sample data for preview
    const sampleCVData = {
        titre: "Cadre Organisation & Développement",
        profil_professionnel: "Cadre expérimenté avec plus de 15 ans d'expertise en gestion de projet, développement durable et économie circulaire. Passionné par l'innovation et l'optimisation des processus.",
        competences: [
            "Gestion de projet",
            "Développement durable",
            "Économie circulaire",
            "Management d'équipe",
            "Stratégie commerciale"
        ],
        outils: [
            "Office 365",
            "Power BI",
            "Notion",
            "Trello"
        ],
        langues: [
            { langue: "Français", niveau: "Natif" },
            { langue: "Anglais", niveau: "B2" }
        ],
        experiences: [
            {
                titre: "Responsable Développement",
                entreprise: "Entreprise Exemple",
                date: "2020 - 2024",
                realisations: [
                    "Pilotage de projets d'envergure (+2M€)",
                    "Management d'une équipe de 8 personnes",
                    "Mise en place d'une stratégie RSE"
                ]
            },
            {
                titre: "Chef de Projet",
                entreprise: "Société innovante",
                date: "2015 - 2020",
                realisations: [
                    "Coordination de 15+ projets simultanés",
                    "Relations clients et partenaires",
                    "Optimisation des processus internes"
                ]
            }
        ],
        formations: [
            { diplome: "Master Management", etablissement: "IAE Montpellier", annee: "2012" }
        ]
    };

    const sampleLMData = {
        objet: "Candidature au poste de Responsable Développement",
        entreprise_nom: "Entreprise Exemple",
        destinataire: {
            nom: "M. Dupont",
            titre: "Directeur des Ressources Humaines",
            entreprise: "Entreprise Exemple"
        },
        corps: {
            accroche: "Votre annonce pour le poste de Responsable Développement a immédiatement retenu mon attention, car elle correspond parfaitement à mon parcours et à mes aspirations professionnelles.",
            apport_candidat: "Fort de 15 années d'expérience dans le développement commercial et la gestion de projet, j'ai développé une expertise solide en économie circulaire et développement durable. Mon parcours m'a permis de piloter des projets d'envergure, de manager des équipes pluridisciplinaires et de contribuer activement à la croissance de mes précédents employeurs.",
            projection: "Convaincu que mon profil et mes compétences correspondent aux attentes de votre entreprise, je serais ravi de vous rencontrer pour échanger sur les opportunités de collaboration."
        },
        politesse: "Dans l'attente de votre réponse, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
    };

    // Generate HTML with custom color
    const getPreviewHTML = (type) => {
        let html = type === 'cv'
            ? generateCVHTML(sampleCVData)
            : generateLMHTML(sampleLMData, '');

        // Replace default color with user's color
        html = html.replace(/#2c3e50/gi, accentColor);
        html = html.replace(/background-color:\s*#2C3E50/gi, `background-color: ${accentColor}`);

        return html;
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                        Aperçu Template PDF
                    </h1>

                    {/* Color indicator */}
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                        <div
                            className="w-5 h-5 rounded-full border border-gray-300"
                            style={{ backgroundColor: accentColor }}
                        />
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-300">{accentColor}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('cv')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'cv'
                                ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <FileText size={16} />
                        CV
                    </button>
                    <button
                        onClick={() => setActiveTab('lm')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'lm'
                                ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Mail size={16} />
                        Lettre
                    </button>
                </div>

                {/* Scale control */}
                <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-500">Zoom:</label>
                    <input
                        type="range"
                        min="0.4"
                        max="1"
                        step="0.1"
                        value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className="w-24"
                    />
                    <span className="text-xs font-mono text-gray-500 w-10">{Math.round(scale * 100)}%</span>

                    <button
                        onClick={() => window.close()}
                        className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                        title="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div className="flex justify-center py-8">
                <div
                    className="shadow-2xl transition-transform"
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                >
                    <iframe
                        srcDoc={getPreviewHTML(activeTab)}
                        title="PDF Preview"
                        className="w-[210mm] min-h-[297mm] bg-white"
                        style={{ border: 'none' }}
                    />
                </div>
            </div>

            {/* Info Footer */}
            <div className="fixed bottom-4 left-4 right-4 flex justify-center">
                <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg text-sm flex items-center gap-3">
                    <RefreshCw size={16} />
                    Modifiez la couleur dans les paramètres et actualisez cet onglet pour voir les changements.
                </div>
            </div>
        </div>
    );
};

export default PdfPreview;
