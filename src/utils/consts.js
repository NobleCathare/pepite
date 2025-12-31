export const STATUS = {
    NOUVELLE: "Nouvelle",
    A_TRAITER: "A traiter",
    TRAITEMENT: "Traitement", // En cours d'enrichissement par n8n
    A_VERIFIER: "A vérifier",
    PRETE: "Prête",
    ENVOYEE: "Envoyée",
    ENTRETIEN: "Entretien",
    OFFRE: "Offre",
    REFUSEE: "Refusée",
    NON_VALIDEE: "Non validée"
};

export const SOURCES = {
    FT: { label: "France Travail", color: "bg-blue-100 text-blue-800" },
    WTTJ: { label: "Welcome to the Jungle", color: "bg-purple-100 text-purple-800" },
    MININT: { label: "Ministère Intérieur", color: "bg-gray-100 text-gray-800" },
    DEFAULT: { label: "Autre", color: "bg-gray-50 text-gray-600" }
};

export const getScoreColor = (score) => {
    if (score >= 70) return "bg-green-100 text-green-800";
    if (score >= 50) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
};
