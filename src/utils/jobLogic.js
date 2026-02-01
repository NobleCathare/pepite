/**
 * jobLogic.js - Fonctions portées de la Librairie Commune n8n
 */

// ===================================================================
// FONCTIONS UTILITAIRES
// ===================================================================

export function simpleHash(str) {
    let hash = 0;
    if (!str || str.length === 0) return '0';
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(16);
}

export function cleanText(text) {
    if (!text) return 'N/A';
    return text.toString()
        .replace(/<[^>]*>/g, ' ')
        .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeText(text) {
    if (!text) return '';
    return text.toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

export function generateUnifiedId(data, source) {
    if (data.id || data.objectID || data.reference) {
        return source + '_' + (data.id || data.objectID || data.reference);
    }
    if (data.url || data.link) {
        return source + '_' + simpleHash(data.url || data.link);
    }
    const uniqueStr = (data.title || data.intitule || data.name || '') +
        (data.company || (data.entreprise ? data.entreprise.nom : '') || (data.organization ? data.organization.name : '') || '');
    return source + '_' + simpleHash(uniqueStr);
}

// ===================================================================
// NORMALISATION LOCATION / SALARY / CONTRACT / DATE
// ===================================================================

export function normalizeLocation(location) {
    if (!location) return 'France';
    if (typeof location === 'string') return cleanText(location) || 'France';
    if (location.libelle) return cleanText(location.libelle);
    if (location.city && location.country_code) {
        return cleanText(location.city) + ', ' + location.country_code;
    }
    if (location.city) return cleanText(location.city);
    if (location.country) return cleanText(location.country);
    return 'France';
}

export function normalizeSalary(salary) {
    if (!salary) return 'Non communique';
    if (typeof salary === 'string') return cleanText(salary) || 'Non communique';
    if (typeof salary === 'object') {
        const min = salary.minimum || salary.min || '';
        const max = salary.maximum || salary.max || '';
        const currency = salary.currency || 'EUR';
        let period = '';
        if (salary.period === 'yearly') period = '/ an';
        else if (salary.period === 'monthly') period = '/ mois';
        if (min && max) return (min + ' - ' + max + ' ' + currency + ' ' + period).trim();
        if (max) return ('Jusqua ' + max + ' ' + currency + ' ' + period).trim();
        if (min) return ('A partir de ' + min + ' ' + currency + ' ' + period).trim();
        if (salary.libelle) return cleanText(salary.libelle);
    }
    return 'Non communique';
}

export function normalizeContract(contractType) {
    if (!contractType) return 'Non specifie';
    const normalized = contractType.toString().toLowerCase();
    const contractMap = {
        'cdi': 'CDI', 'permanent': 'CDI', 'full_time': 'CDI',
        'cdd': 'CDD', 'temporary': 'CDD', 'fixed_term': 'CDD',
        'stage': 'Stage', 'internship': 'Stage',
        'alternance': 'Alternance', 'apprenticeship': 'Alternance', 'apprentice': 'Alternance',
        'freelance': 'Freelance', 'contract': 'Freelance',
        'interim': 'Interim', 'temp': 'Interim'
    };
    for (const key of Object.keys(contractMap)) {
        if (normalized.includes(key)) return contractMap[key];
    }
    return cleanText(contractType);
}

export function normalizeDate(date) {
    if (!date) return new Date().toISOString().split('T')[0];
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
        return d.toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
}

// ===================================================================
// NORMALISATION D'OFFRE (MAPPING COMPLET)
// ===================================================================

export function normalizeJobOffer(rawData, source, keyword = '') {
    let offer = {};

    if (source === 'FT') {
        offer = {
            title: rawData.intitule,
            company: rawData.entreprise ? rawData.entreprise.nom : null,
            location: rawData.lieuTravail,
            salary: rawData.salaire,
            url: 'https://candidat.francetravail.fr/offres/recherche/detail/' + rawData.id,
            description: rawData.description,
            published_at: rawData.dateCreation,
            contract_type: rawData.typeContratLibelle,
            id: rawData.id,
            email: rawData.contact ? rawData.contact.courriel : null
        };
    } else if (source === 'WTTJ') {
        const org = rawData.organization || {};
        const office = (rawData.offices && rawData.offices[0]) || {};
        offer = {
            title: rawData.name,
            company: org.name,
            location: office,
            salary: {
                minimum: rawData.salary_minimum,
                maximum: rawData.salary_maximum,
                currency: rawData.salary_currency,
                period: rawData.salary_period
            },
            url: 'https://www.welcometothejungle.com/fr/companies/' + org.slug + '/jobs/' + rawData.slug,
            description: (rawData.summary || '') + ' ' + (rawData.profile || ''),
            published_at: rawData.published_at_date,
            contract_type: rawData.contract_type,
            id: rawData.objectID || rawData.reference,
            company_url: 'https://www.welcometothejungle.com/fr/companies/' + org.slug
        };
    } else if (source === 'RSS') {
        offer = {
            title: rawData.title,
            company: rawData.company || 'Ministere',
            location: rawData.location || 'France',
            salary: rawData.salary || 'Grille indiciaire',
            url: rawData.link,
            description: rawData.content || rawData.contentSnippet || rawData.description,
            published_at: rawData.pubDate,
            contract_type: rawData.contract_type,
            id: null
        };
    } else {
        offer = rawData;
    }

    return {
        ID_Annonce: generateUnifiedId(offer, source),
        Titre_poste: cleanText(offer.title),
        Entreprise: cleanText(offer.company),
        Lieu: normalizeLocation(offer.location),
        Salaire: normalizeSalary(offer.salary),
        URL_offre: offer.url || '',
        URL_Entreprise: offer.company_url || '',
        Description: cleanText(offer.description).substring(0, 2000),
        Source: source,
        Date_Publication: normalizeDate(offer.published_at),
        Statut: 'Nouvelle',
        Type_contrat: normalizeContract(offer.contract_type),
        Mot_cle_source: keyword,
        Email_Recruteur: offer.email || '',
        Date_Traitement: new Date().toISOString().split('T')[0]
    };
}
