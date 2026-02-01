/**
 * recruiterService.js
 * Service for finding recruiter information.
 * HYBRID WORKFLOW: LLM inference (free) + Jina LinkedIn scraping (optional)
 * 
 * Workflow:
 * 1. When job is SELECTED (swipe right / click "Postuler") → Auto LLM inference
 * 2. User clicks "Enrichir" → Jina LinkedIn scraping + LLM extraction
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const JINA_API_KEY = import.meta.env.VITE_JINA_API_KEY;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

// Default prompt for recruiter research (from n8n workflow)
const DEFAULT_RECRUITER_PROMPT = `Tu es un assistant de recherche RH.
À partir du nom d'entreprise et du poste, déduis le profil du recruteur le plus probable.

RÈGLES :
1. Si l'entreprise est une PME (<50 salariés) : le recruteur est souvent le Dirigeant ou DRH.
2. Si l'entreprise est un grand groupe : le recruteur est un Talent Acquisition Manager.
3. Pour les cabinets de recrutement : le recruteur est le Consultant en charge.

ENTRÉE :
Entreprise : {{company}}
Poste : {{jobTitle}}
Description (si disponible) : {{description}}

SORTIE (JSON uniquement) :
{
  "type_recruteur": "DRH" | "Dirigeant" | "Talent Acquisition" | "Consultant" | "Inconnu",
  "titre_probable": "string",
  "conseil_approche": "string (max 50 mots)",
  "prenom": "string ou null",
  "nom": "string ou null",
  "email_pattern": "string (ex: prenom.nom@entreprise.com)"
}`;

// Prompt for extracting recruiter info from LinkedIn scrape results
const LINKEDIN_EXTRACTION_PROMPT = `Tu es un expert en extraction de données RH.
Analyse le texte scrappé ci-dessous et extrait les informations sur le/les recruteur(s) potentiel(s).

TEXTE SCRAPPÉ :
{{scraped_text}}

CONTEXTE :
Entreprise recherchée : {{company}}
Poste : {{jobTitle}}

INSTRUCTIONS :
1. Identifie les profils LinkedIn pertinents (RH, Talent Acquisition, DRH, Recruteur)
2. Extrait les noms, titres et URLs LinkedIn
3. Priorise le profil le plus pertinent pour ce poste

SORTIE (JSON uniquement) :
{
  "recruteurs_trouves": [
    {
      "prenom": "string",
      "nom": "string",
      "titre": "string",
      "linkedin_url": "string",
      "pertinence": 1-5
    }
  ],
  "recruteur_principal": {
    "prenom": "string",
    "nom": "string",
    "titre": "string",
    "linkedin_url": "string",
    "email_probable": "string"
  },
  "confiance": "haute" | "moyenne" | "basse"
}`;

/**
 * Get API endpoint and headers based on provider
 */
function getApiConfig(provider = 'openrouter', apiKeys = {}) {
    const configs = {
        openrouter: {
            url: 'https://openrouter.ai/api/v1/chat/completions',
            headers: {
                'Authorization': `Bearer ${apiKeys.openrouter || OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://pepite.app'
            }
        },
        google: {
            url: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=${apiKeys.google || GOOGLE_API_KEY}`,
            headers: {
                'Content-Type': 'application/json'
            },
            transformRequest: (model, messages) => ({
                contents: messages.map(m => ({
                    role: m.role === 'system' ? 'user' : m.role,
                    parts: [{ text: m.content }]
                }))
            }),
            transformResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text
        },
        anthropic: {
            url: 'https://api.anthropic.com/v1/messages',
            headers: {
                'x-api-key': apiKeys.anthropic || ANTHROPIC_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            transformRequest: (model, messages) => ({
                model: model,
                max_tokens: 1024,
                messages: messages.filter(m => m.role !== 'system'),
                system: messages.find(m => m.role === 'system')?.content
            }),
            transformResponse: (data) => data.content?.[0]?.text
        }
    };
    return configs[provider] || configs.openrouter;
}

/**
 * Make LLM API call with multi-provider support
 */
async function callLLM(messages, model = 'xiaomi/mimo-v2-flash:free', provider = 'openrouter', apiKeys = {}) {
    const config = getApiConfig(provider, apiKeys);

    let url = config.url;
    let body;

    if (provider === 'google') {
        url = url.replace('{model}', model);
        body = config.transformRequest(model, messages);
    } else if (provider === 'anthropic') {
        body = config.transformRequest(model, messages);
    } else {
        // OpenRouter (default)
        body = {
            model: model,
            messages: messages,
            response_format: { type: 'json_object' }
        };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${provider} API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();

    // Extract content based on provider
    let content;
    if (config.transformResponse) {
        content = config.transformResponse(data);
    } else {
        content = data.choices?.[0]?.message?.content;
    }

    // Clean and parse JSON
    const cleanJson = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
}

/**
 * STEP 1: LLM Inference (FREE)
 * Called automatically when job is selected
 * @param {Object} jobData - Job data with company, title, description
 * @param {Object} aiConfig - AI configuration from user settings
 * @returns {Promise<Object>} - Inferred recruiter information
 */
export async function inferRecruiterInfo(jobData, aiConfig = {}) {
    const provider = aiConfig?.prompts?.recruiter?.provider || 'openrouter';
    const model = aiConfig?.prompts?.recruiter?.model || 'xiaomi/mimo-v2-flash:free';
    const promptTemplate = aiConfig?.prompts?.recruiter?.prompt || DEFAULT_RECRUITER_PROMPT;
    const apiKeys = aiConfig?.apiKeys || {};

    // Fill placeholders
    const prompt = promptTemplate
        .replace('{{company}}', jobData.Entreprise || jobData.company || 'Non spécifié')
        .replace('{{jobTitle}}', jobData.Titre_poste || jobData.title || 'Non spécifié')
        .replace('{{description}}', (jobData.Description || '').slice(0, 500));

    try {
        const result = await callLLM(
            [
                { role: 'system', content: 'Tu es un expert en recrutement. Réponds uniquement en JSON.' },
                { role: 'user', content: prompt }
            ],
            model,
            provider,
            apiKeys
        );

        return {
            ...result,
            source: 'llm',
            enriched: false,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Recruiter Inference Error:', error);
        throw error;
    }
}

/**
 * STEP 2a: Scrape LinkedIn via Jina AI
 * Only called when user clicks "Enrichir"
 * @param {string} companyName - Company name
 * @param {string} recruiterType - Type from LLM inference (to refine search)
 * @returns {Promise<string|null>} - Raw scraped text or null
 */
export async function scrapeLinkedIn(companyName, recruiterType = 'recruteur') {
    if (!JINA_API_KEY) {
        console.warn('Jina API Key not configured - cannot enrich');
        return null;
    }

    // Build optimized search query based on recruiter type
    const typeKeywords = {
        'DRH': 'DRH OR "Directeur Ressources Humaines"',
        'Dirigeant': 'CEO OR "Directeur Général" OR Gérant',
        'Talent Acquisition': '"Talent Acquisition" OR "Chargé de recrutement"',
        'Consultant': 'Consultant OR Manager recrutement'
    };

    const keyword = typeKeywords[recruiterType] || 'recruteur OR RH OR "Talent Acquisition"';
    const searchQuery = encodeURIComponent(`${companyName} ${keyword} site:linkedin.com/in`);
    const jinaUrl = `https://r.jina.ai/https://www.google.com/search?q=${searchQuery}`;

    try {
        const response = await fetch(jinaUrl, {
            headers: {
                'Authorization': `Bearer ${JINA_API_KEY}`,
                'Accept': 'text/plain',
                'X-Return-Format': 'text'
            }
        });

        if (!response.ok) {
            console.warn('Jina scrape failed:', response.status);
            return null;
        }

        return await response.text();
    } catch (error) {
        console.error('LinkedIn Scrape Error:', error);
        return null;
    }
}

/**
 * STEP 2b: Extract recruiter info from scrape using LLM
 * @param {string} scrapedText - Raw text from Jina
 * @param {Object} jobData - Original job data
 * @param {Object} aiConfig - AI configuration
 * @returns {Promise<Object>} - Extracted recruiter information
 */
export async function extractRecruiterFromScrape(scrapedText, jobData, aiConfig = {}) {
    const provider = aiConfig?.prompts?.recruiter?.provider || 'openrouter';
    const model = aiConfig?.prompts?.recruiter?.model || 'xiaomi/mimo-v2-flash:free';
    const apiKeys = aiConfig?.apiKeys || {};

    const prompt = LINKEDIN_EXTRACTION_PROMPT
        .replace('{{scraped_text}}', scrapedText.slice(0, 3000)) // Limit to save tokens
        .replace('{{company}}', jobData.Entreprise || jobData.company || '')
        .replace('{{jobTitle}}', jobData.Titre_poste || jobData.title || '');

    try {
        const result = await callLLM(
            [
                { role: 'system', content: 'Tu es un expert en extraction de données. Réponds uniquement en JSON.' },
                { role: 'user', content: prompt }
            ],
            model,
            provider,
            apiKeys
        );

        return result;
    } catch (error) {
        console.error('Extraction Error:', error);
        throw error;
    }
}

/**
 * STEP 2: Full enrichment workflow (Jina + LLM extraction)
 * Called when user clicks "Enrichir via LinkedIn"
 * @param {Object} jobData - Job data
 * @param {Object} previousInference - Previous LLM inference result
 * @param {Object} aiConfig - AI configuration
 * @returns {Promise<Object>} - Enriched recruiter information
 */
export async function enrichRecruiterInfo(jobData, previousInference = {}, aiConfig = {}) {
    // Use previous inference to optimize search
    const recruiterType = previousInference?.type_recruteur || 'recruteur';
    const company = jobData.Entreprise || jobData.company;

    if (!company) {
        throw new Error('Nom d\'entreprise requis pour l\'enrichissement');
    }

    // Step 2a: Scrape LinkedIn
    const scrapedText = await scrapeLinkedIn(company, recruiterType);

    if (!scrapedText) {
        return {
            ...previousInference,
            enriched: false,
            enrichment_error: 'Aucun résultat LinkedIn trouvé'
        };
    }

    // Step 2b: Extract info from scrape
    const extracted = await extractRecruiterFromScrape(scrapedText, jobData, aiConfig);

    // Merge with previous inference
    const principal = extracted?.recruteur_principal || {};

    return {
        // Keep inferred type if extraction didn't find better
        type_recruteur: principal.titre || previousInference?.type_recruteur,
        titre_probable: principal.titre || previousInference?.titre_probable,

        // Use extracted data when available
        prenom: principal.prenom || previousInference?.prenom,
        nom: principal.nom || previousInference?.nom,
        linkedin_url: principal.linkedin_url || null,
        email_probable: principal.email_probable || previousInference?.email_pattern,

        // Keep advice from inference
        conseil_approche: previousInference?.conseil_approche,

        // Metadata
        source: 'llm+linkedin',
        enriched: true,
        confiance: extracted?.confiance || 'moyenne',
        autres_recruteurs: extracted?.recruteurs_trouves?.slice(1, 4) || [],
        timestamp: new Date().toISOString()
    };
}

/**
 * Check if Jina API is configured
 * @returns {boolean}
 */
export function isJinaConfigured() {
    return !!JINA_API_KEY;
}

/**
 * Main entry point - called when job is selected
 * @param {Object} jobData - Job data
 * @param {Object} aiConfig - AI configuration from user profile
 * @param {boolean} enrich - Whether to also run enrichment
 * @returns {Promise<Object>} - Recruiter information
 */
export async function findRecruiter(jobData, aiConfig = {}, enrich = false) {
    // Step 1: Always run LLM inference (free)
    const inferred = await inferRecruiterInfo(jobData, aiConfig);

    // Step 2: Optionally enrich with LinkedIn
    if (enrich && isJinaConfigured()) {
        try {
            return await enrichRecruiterInfo(jobData, inferred, aiConfig);
        } catch (e) {
            console.warn('Enrichment failed, returning inference only:', e);
            return inferred;
        }
    }

    return inferred;
}

// Export default prompt for UI editing
export const DEFAULT_PROMPT = DEFAULT_RECRUITER_PROMPT;
