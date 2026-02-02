/**
 * atsService.js
 * Service responsible for:
 * 1. Fetching the "published to web" CV content.
 * 2. Sending the Job + CV to OpenRouter (LLM) for analysis.
 */

// We get the key from environment variables
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

/**
 * Fetches the raw text content from a Google Doc published to the web.
 * @param {string} publicUrl - The URL of the published Google Doc (e.g., https://docs.google.com/document/d/e/.../pub)
 * @returns {Promise<string>} - The text content of the CV.
 */
export async function fetchCVContent(publicUrl) {
    if (!publicUrl) throw new Error("URL du CV manquante.");

    try {
        const response = await fetch(publicUrl);
        if (!response.ok) throw new Error(`Erreur lors du chargement du CV (${response.status})`);

        let text = await response.text();

        // If simple HTML (published doc), extract only document content
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
            // Create a temporary DOM element to parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            // Google Docs published pages have content in #contents or .doc-content
            // Extract ONLY the document body, not navigation/header/footer
            const contentDiv = doc.querySelector('#contents') ||
                doc.querySelector('.doc-content') ||
                doc.body;

            text = contentDiv ? (contentDiv.textContent || contentDiv.innerText || "") : "";

            console.log(`[fetchCVContent] Extracted CV length: ${text.length} chars`);
        }

        return text.trim();
    } catch (error) {
        console.error("ATS Service Error (Fetch CV):", error);
        throw new Error("Impossible de lire le CV public. Vérifiez l'URL.");
    }
}

/**
 * Orchestrates the ATS analysis.
 * @param {object} jobData - The job object (Title, Description, Company, etc.)
 * @param {string} cvUrlOrText - The public URL of the CV OR the raw text content itself.
 * @param {object} aiConfig - User's AI config { model: '...', systemPrompt: '...' }
 * @param {boolean} useTextDirectly - If true, avoid fetching and treat cvUrlOrText as raw text.
 * @returns {Promise<object>} - JSON result { score_ATS, remarque_ATS, ... }
 */
/**
 * Simple JSON Healer (dup from generationService)
 * Attempts to close unterminated strings and braces in truncated LLM responses.
 */
function repairTruncatedJson(str) {
    try {
        let repaired = str.trim();
        // 1. If ends with a comma, remove it
        if (repaired.endsWith(',')) repaired = repaired.slice(0, -1);
        // 2. Count braces and brackets
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        const openBrackets = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;
        // 3. Handle unterminated strings (if odd number of quotes)
        const quoteCount = (repaired.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) repaired += '"';
        // 4. Close missing structure
        let depth = openBrackets - closeBrackets;
        while (depth > 0) { repaired += ']'; depth--; }
        depth = openBraces - closeBraces;
        while (depth > 0) { repaired += '}'; depth--; }
        return repaired;
    } catch (e) { return str; }
}

export async function analyzeJobATS(jobData, cvUrlOrText, aiConfig, useTextDirectly = false) {
    if (!OPENROUTER_API_KEY) {
        throw new Error("Clé API OpenRouter manquante (VITE_OPENROUTER_API_KEY).");
    }

    // 1. Fetch CV or use direct text
    let cvText = "";
    if (useTextDirectly) {
        cvText = cvUrlOrText;
    } else {
        cvText = await fetchCVContent(cvUrlOrText);
    }

    if (!cvText || cvText.length < 50) {
        throw new Error("Le contenu du CV semble vide ou illisible.");
    }

    // 2. Prepare Prompt & Configuration
    const truncatedDesc = jobData.Description?.slice(0, 3000) || "";
    const truncatedCV = cvText.slice(0, 3000);

    console.log(`[ATS Service] Prompt sizes - Desc: ${truncatedDesc.length}, CV: ${truncatedCV.length}`);

    // Harmonization: Use new prompts structure if available
    const atsConfig = aiConfig?.prompts?.ats || {};
    const model = atsConfig.model || aiConfig?.model || 'deepseek/deepseek-chat';
    const systemPrompt = atsConfig.prompt || aiConfig?.systemPrompt || "Tu es un auditeur ATS.";

    const userMessage = `<input_data>
[ANNONCE]
Titre: ${jobData.Titre_poste}
Entreprise: ${jobData.Entreprise}
Lieu: ${jobData.Lieu}
Description (Tronquée si besoin): ${truncatedDesc}

[CANDIDAT]
CV Textuel (Tronqué si besoin): ${truncatedCV}
</input_data>`;

    // 3. Call OpenRouter
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://sasre.app",
                "X-Title": "SASRE ATS"
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                max_tokens: 2000, // Increased from 800 to avoid truncation
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // 4. Parse JSON with Repair Fallback
        const cleanJson = content.replace(/```json/gi, '').replace(/```/g, '').trim();

        try {
            return JSON.parse(cleanJson);
        } catch (parseError) {
            console.warn("[ATS Service] JSON Parse failed, attempting repair...", parseError);
            const repaired = repairTruncatedJson(cleanJson);
            try {
                return JSON.parse(repaired);
            } catch (repairError) {
                console.error("[ATS Service] Repair failed:", repaired);
                throw new Error("Réponse IA tronquée ou malformée.");
            }
        }

    } catch (error) {
        console.error("ATS Service Error (LLM Analysis):", error);
        throw error;
    }
}
