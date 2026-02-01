/**
 * Utility to calculate job score based on user Visual Filters.
 * 
 * @param {Object} job - The job object (must have Titre, Description, Entreprise, Contrat fields)
 * @param {Array} visualFilters - Array of filter objects { category, value, active, score, type }
 * @returns {Object} { score: number, matches: Array }
 */
export const calculateJobScore = (job, visualFilters) => {
    if (!job || !visualFilters || !Array.isArray(visualFilters)) {
        return { score: 0, matches: [] };
    }

    let score = 0;
    const matches = [];
    const lowerTitre = (job.Titre || '').toLowerCase();
    const lowerDesc = (job.Description || '').toLowerCase();
    const lowerEnt = (job.Entreprise || '').toLowerCase();
    const lowerContrat = (job.Contrat || '').toLowerCase();

    // Helper to check match
    const checkMatch = (text, keyword) => {
        if (!keyword || !text) return false;
        // Trim and normalize both
        const safeText = text.toString().toLowerCase();
        const safeKeyword = keyword.toString().trim().toLowerCase();
        if (!safeKeyword) return false;
        return safeText.includes(safeKeyword);
    };

    for (const filter of visualFilters) {
        if (!filter.active) continue;

        let isMatch = false;
        const category = (filter.category || '').toLowerCase().trim();

        switch (category) {
            case 'titre':
            case 'title': // Fallback
                isMatch = checkMatch(lowerTitre, filter.value);
                break;
            case 'description':
                isMatch = checkMatch(lowerDesc, filter.value);
                break;
            case 'entreprise':
            case 'company':
                isMatch = checkMatch(lowerEnt, filter.value);
                break;
            case 'contrat':
            case 'contract':
                isMatch = checkMatch(lowerContrat, filter.value);
                break;
            case 'blacklist':
                // Legacy: If category is strictly 'blacklist', check everything? 
                // Or maybe it implies searching in Title/Desc?
                isMatch = checkMatch(lowerTitre, filter.value) || checkMatch(lowerDesc, filter.value);
                break;
            default:
                // If category is unknown or generic (e.g. 'Autre'), check all main fields
                isMatch = checkMatch(lowerTitre, filter.value) || checkMatch(lowerDesc, filter.value);
                break;
        }

        if (isMatch) {
            // Scoring Logic
            if (filter.type === 'BLACKLIST') {
                score -= 10000; // Massive penalty
                matches.push({ rule: filter.value, score: -10000, type: 'BLACKLIST', reason: filter.reason });
            } else if (filter.type === 'PENALTY') {
                const val = filter.score || 0; // Usually negative in CSV?
                // CSV 'Priorite' for PENALTY rows like -19.
                // Filter.score should ALREADY be parsed as integer (possibly negative) by import script.
                score += val;
                matches.push({ rule: filter.value, score: val, type: 'PENALTY', reason: filter.reason });
            } else if (filter.type === 'BONUS' || filter.type === 'WHITELIST') {
                const val = filter.score || 0;
                score += val;
                matches.push({ rule: filter.value, score: val, type: 'BONUS', reason: filter.reason });
            } else {
                // Fallback for unset Type
                const val = filter.score || 0;
                score += val;
                matches.push({ rule: filter.value, score: val, type: 'BONUS', reason: filter.reason });
            }
        }
    }

    return { score, matches };
};
