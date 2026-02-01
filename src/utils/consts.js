export const STATUS = {
    NOUVELLE: "Nouvelle",
    A_TRAITER: "A traiter",
    TRAITEMENT: "Traitement", // En cours d'enrichissement par n8n
    A_VERIFIER: "A vérifier",
    PRETE: "Prête",
    ENVOYEE: "Envoyée",
    ENTRETIEN: "Entretien",
    OFFRE: "Offre",
    FILTRE_ATS: "Filtre ATS",
    REFUSEE: "Refusée",
    REFUSEE_APRES_ENTRETIEN: "RefuséeEntretient",
    NON_VALIDEE: "Non validée"
};

export const SOURCES = {
    FT: { label: "France Travail", color: "bg-blue-100 text-blue-800" },
    WTTJ: { label: "Welcome to the Jungle", color: "bg-purple-100 text-purple-800" },
    MININT: { label: "Ministère Intérieur", color: "bg-gray-100 text-gray-800" },
    Linkedin: { label: "LinkedIn", color: "bg-[#0077b5] text-white" },
    DEFAULT: { label: "Autre", color: "bg-gray-50 text-gray-600" }
};

export const getScoreColor = (score) => {
    if (score >= 70) return "text-green-600 font-extrabold";
    if (score >= 50) return "text-orange-500 font-extrabold";
    return "text-red-500 font-extrabold";
};
