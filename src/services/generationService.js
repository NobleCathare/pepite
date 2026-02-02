/**
 * generationService.js
 * Service responsible for generating the Application Package (CV, LM, Email).
 * STRICTLY respects the prompt from n8n workflow '16KoDKEhwlMii2FH'.
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

// --- PROMPT EXACT (Extraction n8n) ---
const GENERATION_PROMPT_TEMPLATE = `Tu es un Expert Senior en Double Compétence : Rédaction de CV ATS et Stratégie de Carrière.
Ta mission est de produire un DOSSIER DE CANDIDATURE COMPLET (CV + Lettre + Email) parfaitement aligné sur l'offre.

⚠️ RÈGLE D'OR : Le "Master CV" est ta base de données brute. Ne le résume pas. PIOCHE dedans pour prouver le match parfait.

══════════════════════════════════════════════════
CONTEXTE & CIBLAGE
══════════════════════════════════════════════════
ENTREPRISE : {{Entreprise}}
POSTE VISÉ : {{titre_ATS}}
MOTS-CLÉS ATS : {{mots_cle_ATS}}
STRATÉGIE : {{data_pour_agent_redacteur}}
DESCRIPTION OFFRE : {{Description}}
DESTINATAIRE : {{Prenom_Recruteur}} {{Nom_Recruteur}} ({{Type_Recruteur}})

BASE DE DONNÉES CANDIDAT (SOURCE) :
{{cv_content}}

══════════════════════════════════════════════════
PARTIE 1 : LE CV (OPTIMISÉ ATS)
══════════════════════════════════════════════════
1. PROFIL PRO : Accroche percutante de 3-4 lignes. "Expert en [Compétence]..." (Pas de "Je cherche"). Aligne la séniorité.
2. EXPÉRIENCES : Choisis les 4-6 plus pertinentes. Reformule les titres pour coller à l'offre. 
   - Puces : Méthode STAR. Sois DÉTAILLÉ et PRÉCIS dans les contextes et résultats.
   - Limite : 15 à 20 puces MAX au total pour l'ensemble du CV.
   - Volume : 350-450 mots au total pour la section expériences. Il faut de la densité.
3. COMPÉTENCES/OUTILS : Max 8 compétences clés, Max 6 outils pertinents.

══════════════════════════════════════════════════
PARTIE 2 : LA LETTRE DE MOTIVATION (VALEUR AJOUTÉE)
══════════════════════════════════════════════════
- ACCROCHE : 3-4 lignes montrant que tu as compris le défi de l'entreprise.
- APPORT CANDIDAT : Développe ton argumentation. Comment ton expertise résout leurs problèmes.
- PROJECTION : Ce que tu vas accomplir dans les 6 premiers mois.
- CONTRAINTE : Corps du texte entre 350 et 400 mots IMPERATIVEMENT. Remplis bien la page.

══════════════════════════════════════════════════
PARTIE 3 : MESSAGE DE CONTACT (EMAIL D'ENVOI)
══════════════════════════════════════════════════
C'est le mail court qui accompagne les pièces jointes.
- LONGUEUR : 3 à 4 lignes MAXIMUM.
- CONTENU : Rappelle l'intitulé exact du poste ({{titre_ATS}}), mentionne explicitement que le CV et la Lettre de motivation sont en pièces jointes.
- TON : Professionnel, direct et courtois.

══════════════════════════════════════════════════
FORMAT DE SORTIE (JSON RAW UNIQUEMENT)
══════════════════════════════════════════════════
Réponds UNIQUEMENT par un JSON valide. Respecte strictement cette structure :

{
  "cv": {
    "titre": "{{titre_ATS}}",
    "profil_professionnel": "string",
    "competences": ["string"],
    "outils": ["string"],
    "experiences": [
      {
        "titre": "string",
        "entreprise": "string",
        "date": "string",
        "realisations": ["string"]
      }
    ]
  },
  "lettre_motivation": {
    "destinataire": {
      "nom": "{{Prenom_Recruteur}} {{Nom_Recruteur}}",
      "titre": "{{Type_Recruteur}}",
      "entreprise": "{{Entreprise}}",
      "adresse": "{{Lieu}}"
    },
    "objet": "Candidature au poste de {{titre_ATS}}",
    "corps": {
      "accroche": "string",
      "apport_candidat": "string",
      "projection": "string"
    },
    "signature": "string",
    "politesse": "string"
  },
  "message_contact": {
    "objet_email": "Candidature : {{titre_ATS}} - [NOM CANDIDAT]",
    "corps_email": "string"
  }
}`;

/**
 * Replaces placeholders in the prompt with actual job/cv data.
 */
function fillPrompt(template, jobData, cvText) {
  let p = template;
  const safeReplace = (key, value) => p = p.replaceAll(`{{${key}}}`, value || "(Non spécifié)");

  // Job Data
  safeReplace('Entreprise', jobData.Entreprise || jobData.company);
  safeReplace('titre_ATS', jobData.titre_ATS || jobData.Titre_poste);
  safeReplace('mots_cle_ATS', jobData.mots_cle_ATS || "");
  // Handle nested strategy object if it exists as string or object
  let strat = jobData.data_pour_agent_redacteur || "";
  if (typeof strat === 'object') strat = JSON.stringify(strat);
  safeReplace('data_pour_agent_redacteur', strat);
  // CRITICAL: Limit description to 10K chars - Jina import can capture entire webpage
  const desc = (jobData.Description || "").slice(0, 10000);
  safeReplace('Description', desc);
  safeReplace('Lieu', jobData.Lieu);

  // Recruiter Data (Often missing, using defaults)
  safeReplace('Prenom_Recruteur', jobData.Prenom_Recruteur || "Responsable");
  safeReplace('Nom_Recruteur', jobData.Nom_Recruteur || "Recrutement");
  safeReplace('Type_Recruteur', jobData.Type_Recruteur || "");

  // CV Content - Full CV sent (CRITICAL: DO NOT LIMIT)
  // Note: CV from Google Docs is currently 211K chars (should be ~30K)
  // Need to investigate duplication at source level
  safeReplace('cv_content', cvText || "");

  return p;
}

/**
 * Simple JSON Healer
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
    // We add them in reverse order of common JSON structure
    let depth = openBrackets - closeBrackets;
    while (depth > 0) {
      repaired += ']';
      depth--;
    }

    depth = openBraces - closeBraces;
    while (depth > 0) {
      repaired += '}';
      depth--;
    }

    return repaired;
  } catch (e) {
    return str;
  }
}

export async function generateDossier(jobData, cvText, aiConfig) {
  if (!OPENROUTER_API_KEY) throw new Error("API Key Manquante");

  console.log("Generating Dossier with Prompt for:", jobData.Titre_poste);

  // Harmonization: Use new prompts structure if available
  const genConfig = aiConfig?.prompts?.generation || {};
  const template = genConfig.prompt || aiConfig?.generationPrompt || GENERATION_PROMPT_TEMPLATE;

  console.log(`[Generation] ========== Prompt Components ==========`);
  console.log(`[Generation] Template length: ${template.length} chars`);
  console.log(`[Generation] CV length: ${cvText?.length || 0} chars`);
  console.log(`[Generation] Job Description length: ${jobData.Description?.length || 0} chars`);
  const stratStr = typeof jobData.data_pour_agent_redacteur === 'object'
    ? JSON.stringify(jobData.data_pour_agent_redacteur)
    : (jobData.data_pour_agent_redacteur || '');
  console.log(`[Generation] Strategy data length: ${stratStr.length} chars`);
  console.log(`[Generation] =======================================`);

  const fullPrompt = fillPrompt(template, jobData, cvText);

  const model = genConfig.model || aiConfig?.model || 'google/gemini-2.0-flash-001';

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: "Tu es un assistant IA expert." },
      { role: "user", content: fullPrompt }
    ],
    max_tokens: 4000
  };

  console.log(`[Generation] ========== OpenRouter Request ==========`);
  console.log(`[Generation] Model: ${model}`);
  console.log(`[Generation] Prompt length: ${fullPrompt.length} chars`);
  console.log(`[Generation] Request body:`, JSON.stringify(requestBody, null, 2).slice(0, 500));
  console.log(`[Generation] ===========================================`);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sasre.app",
        "X-Title": "SASRE - Pépite"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      // Specific handling for 402 to show a friendlier error in logs
      if (response.status === 402) {
        throw new Error(`CRÉDITS INSUFFISANTS : Le solde OpenRouter est trop bas (${errText})`);
      }
      throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[Generation] API Response:", data);

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("[Generation] Invalid API response structure:", data);
      throw new Error(`Réponse API invalide: ${JSON.stringify(data).slice(0, 200)}`);
    }

    const content = data.choices[0].message.content;

    // Parse Clean JSON
    const cleanJson = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.warn("[Generation] JSON Parse failed, attempting repair...", parseError);
      const repaired = repairTruncatedJson(cleanJson);
      try {
        return JSON.parse(repaired);
      } catch (repairError) {
        console.error("[Generation] Repair failed:", repaired);
        throw new Error("Réponse IA tronquée ou malformée. Réessayez ou augmentez votre solde.");
      }
    }

  } catch (e) {
    console.error("Generation Service Error:", e);
    throw e;
  }
}
