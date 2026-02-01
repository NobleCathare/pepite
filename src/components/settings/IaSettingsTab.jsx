/**
 * IaSettingsTab.jsx
 * Redesigned IA & Automation settings with prompts-first approach.
 * Each prompt can have its own model and API provider.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Save, FileText,
    ChevronRight, ChevronDown, Check, X, RefreshCw,
    ExternalLink, TestTube, Zap, Search, Mail
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================

// API Providers
const API_PROVIDERS = [
    { id: 'openrouter', name: 'OpenRouter', color: 'purple', keyEnv: 'VITE_OPENROUTER_API_KEY' },
    { id: 'google', name: 'Google (Gemini)', color: 'blue', keyEnv: 'VITE_GOOGLE_API_KEY' },
    { id: 'anthropic', name: 'Anthropic (Claude)', color: 'amber', keyEnv: 'VITE_ANTHROPIC_API_KEY' }
];

// Popular models by provider - STABLE IDs (Jan 2026)
// Focus on RELIABLE models that can handle large CVs (79K+ chars)
const MODELS_BY_PROVIDER = {
    openrouter: [
        // === MODÈLE RECOMMANDÉ POUR CV VOLUMINEUX ===
        { id: 'google/gemini-2.0-flash-001', name: '💰 Gemini 2.0 Flash (1M ctx) - RECOMMANDÉ CV', free: false, price: '$0.10/M', context: '1000K' },

        // === AUTRES MODÈLES PAYANTS FIABLES ===
        { id: 'openai/gpt-4o-mini', name: '💰 GPT-4o Mini (128K ctx)', free: false, price: '$0.15/M', context: '128K' },
        { id: 'anthropic/claude-3.5-sonnet', name: '💰 Claude 3.5 Sonnet (200K ctx)', free: false, price: '$3.00/M', context: '200K' },
        { id: 'deepseek/deepseek-chat', name: '💰 DeepSeek V3 (64K ctx)', free: false, price: '$0.14/M', context: '64K' },

        // === MODÈLES GRATUITS (Instables - Non recommandés) ===
        // Note: Les modèles gratuits sont souvent indisponibles ou limités
        // Pour un CV de 79K chars, utilisez Gemini 2.0 Flash
    ],
    google: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', free: true },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', free: false },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', free: true }
    ],
    anthropic: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', free: false },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', free: false }
    ]
};

// Default prompts (from n8n workflows - DO NOT MODIFY)
const DEFAULT_PROMPTS = {
    ats: {
        id: 'ats',
        name: 'Analyse ATS',
        description: 'Audit de correspondance CV/Offre',
        icon: Search,
        color: 'green',
        defaultProvider: 'openrouter',
        defaultModel: 'deepseek/deepseek-chat',
        prompt: `<role>
Tu es un Auditeur ATS (Applicant Tracking System) impitoyable et un Chasseur de Têtes expert.
Ta mission est de filtrer les candidats avec une précision clinique. Tu ne fais pas de sentiment.
</role>

<taches>
1. SCORING : Analyse la correspondance sémantique stricte.
2. FEEDBACK : Rédige une remarque cinglante (max 15 mots).
3. BRIEFING : Donne des instructions précises pour réécrire le CV.
</taches>

<format_sortie>
Réponds UNIQUEMENT avec ce JSON :
{
  "score_ATS": 0 à 100,
  "remarque_ATS": "string",
  "data_ats": { "diagnostic": "string", "actions": "string" }
}
</format_sortie>`
    },
    generation: {
        id: 'generation',
        name: 'Rédacteur CV/LM',
        description: 'Génération du dossier de candidature',
        icon: FileText,
        color: 'blue',
        defaultProvider: 'openrouter',
        defaultModel: 'deepseek/deepseek-chat',
        prompt: `Tu es un Expert Senior en Double Compétence : Rédaction de CV ATS et Stratégie de Carrière.
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
2. EXPÉRIENCES : Choisis les 3-4 plus pertinentes. Reformule les titres pour coller à l'offre. 
   - Puces : Méthode STAR. 
   - Limite : 10 puces MAX au total. 
   - Volume : 220-270 mots au total pour les expériences.
3. COMPÉTENCES/OUTILS : Max 6 compétences clés, Max 5 outils pertinents.

══════════════════════════════════════════════════
PARTIE 2 : LA LETTRE DE MOTIVATION (VALEUR AJOUTÉE)
══════════════════════════════════════════════════
- ACCROCHE : 3-4 lignes montrant que tu as compris le défi de l'entreprise.
- APPORT CANDIDAT : Comment ton expertise résout leurs problèmes.
- PROJECTION : Ce que tu vas accomplir dans les 6 premiers mois.
- CONTRAINTE : Corps du texte entre 260 et 280 mots IMPERATIVEMENT.

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
    "objet_email": "Candidature : {{titre_ATS}} - {{Prenom}} {{Nom}}",
    "corps_email": "string"
  }
}`
    },
    recruiter: {
        id: 'recruiter',
        name: 'Recherche Recruteur',
        description: 'Identification du contact RH',
        icon: Mail,
        color: 'purple',
        defaultProvider: 'openrouter',
        defaultModel: 'google/gemini-2.0-flash-exp:free',
        prompt: `Tu es un assistant de recherche RH.
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
}`
    }
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/**
 * OpenRouter Balance Display Component
 * Fetches and displays the current OpenRouter credit balance in real-time
 */
const OpenRouterBalance = () => {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBalance = useCallback(async () => {
        setLoading(true);
        const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
        if (!apiKey) {
            setError("Clé API non configurée");
            setLoading(false);
            return;
        }
        try {
            // Use /credits endpoint which returns actual account balance
            const response = await fetch("https://openrouter.ai/api/v1/credits", {
                headers: { "Authorization": `Bearer ${apiKey}` }
            });
            if (!response.ok) throw new Error("Erreur API");
            const data = await response.json();
            console.log("[OpenRouter Balance] API Response:", data);
            // API returns { data: { total_credits, total_usage } } or { credits, usage }
            const info = data.data || data;
            // Calculate remaining: total_credits - total_usage (or credits - usage)
            const credits = info.total_credits ?? info.credits ?? 0;
            const usage = info.total_usage ?? info.usage ?? 0;
            const remaining = credits - usage;
            setBalance(remaining);
            setError(null);
        } catch (e) {
            console.error("[OpenRouter Balance] Error:", e);
            setError("Erreur");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBalance();
        // Refresh every 60 seconds
        const interval = setInterval(fetchBalance, 60000);
        return () => clearInterval(interval);
    }, [fetchBalance]);

    const getBalanceColor = () => {
        if (balance === null) return 'text-gray-400';
        if (balance < 1) return 'text-red-500';
        if (balance < 5) return 'text-orange-400';
        return 'text-green-400';
    };

    const getBalanceBg = () => {
        if (balance === null) return 'bg-gray-800';
        if (balance < 1) return 'bg-red-900/30';
        if (balance < 5) return 'bg-orange-900/30';
        return 'bg-green-900/30';
    };

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getBalanceBg()}`}>
            <span className="text-xs text-gray-400">Solde OpenRouter:</span>
            {loading ? (
                <span className="text-xs text-gray-500 animate-pulse">...</span>
            ) : error ? (
                <span className="text-xs text-red-400">{error}</span>
            ) : (
                <span className={`text-sm font-bold font-mono ${getBalanceColor()}`}>
                    ${balance?.toFixed(2) || '0.00'}
                </span>
            )}
            <button
                onClick={fetchBalance}
                className="text-gray-500 hover:text-white transition-colors p-1"
                title="Rafraîchir"
            >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>
    );
};

/**
 * Prompt card with embedded model/API selector
 */
const PromptCard = ({ promptConfig, userConfig, onChange, onReset, defaultPrompt }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const Icon = promptConfig.icon;

    const currentPrompt = userConfig?.prompt || promptConfig.prompt;
    const currentProvider = userConfig?.provider || promptConfig.defaultProvider;
    const currentModel = userConfig?.model || promptConfig.defaultModel;
    const isModified = currentPrompt !== promptConfig.prompt;

    const colorClasses = {
        green: 'from-green-500 to-emerald-600',
        blue: 'from-blue-500 to-cyan-600',
        purple: 'from-purple-500 to-pink-600',
        amber: 'from-amber-500 to-orange-600'
    };

    const handleChange = (field, value) => {
        // CRITICAL: Always create complete config object, not partial
        // userConfig may be undefined on first change, so we build from scratch with current values
        const fullConfig = {
            prompt: currentPrompt,
            provider: currentProvider,
            model: currentModel,
            ...userConfig, // Apply any existing customModel etc
            [field]: value // Apply the new change
        };
        console.log(`[PromptCard] ${promptConfig.id} change:`, field, "->", value, "Full:", fullConfig);
        onChange(promptConfig.id, fullConfig);
    };

    const handleReset = () => {
        if (confirm('Revenir au prompt par défaut ?')) {
            onReset(promptConfig.id);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className={`bg-gradient-to-br ${colorClasses[promptConfig.color]} p-3 rounded-xl shadow-lg`}>
                        <Icon size={22} className="text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">{promptConfig.name}</h3>
                            {isModified && (
                                <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-bold">
                                    Modifié
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400">{promptConfig.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Quick model display */}
                    <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                        <Zap size={12} className="text-gray-400" />
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                            {currentModel.split('/').pop()}
                        </span>
                    </div>
                    {isExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                    {/* Model & API Selection */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* API Provider */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fournisseur API</label>
                                <div className="flex gap-2">
                                    {API_PROVIDERS.map(provider => (
                                        <button
                                            key={provider.id}
                                            onClick={(e) => { e.stopPropagation(); handleChange('provider', provider.id); }}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${currentProvider === provider.id
                                                ? 'bg-gray-900 dark:bg-gray-600 text-white shadow-md'
                                                : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {provider.name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Model Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Modèle IA</label>
                                <select
                                    value={currentModel}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full border rounded-lg p-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                                >
                                    {(MODELS_BY_PROVIDER[currentProvider] || []).map(model => (
                                        <option key={model.id} value={model.id}>
                                            {model.name} {model.free && '✨'}
                                        </option>
                                    ))}
                                    <option value="custom">Autre (personnalisé)...</option>
                                </select>
                                {currentModel === 'custom' && (
                                    <input
                                        type="text"
                                        placeholder="Entrez le nom du modèle..."
                                        value={userConfig?.customModel || ''}
                                        onChange={(e) => handleChange('customModel', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full mt-2 border rounded-lg p-2 text-sm font-mono bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Prompt Editor */}
                    <div className="p-4 bg-gray-900">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Prompt</label>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-gray-500">{(currentPrompt || '').length} caractères</span>
                                <button
                                    onClick={handleReset}
                                    disabled={!isModified}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <RefreshCw size={12} />
                                    Réinitialiser
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={currentPrompt}
                            onChange={(e) => handleChange('prompt', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-full h-64 border rounded-lg p-3 text-xs font-mono bg-gray-950 border-gray-700 focus:ring-2 focus:ring-pepite-gold outline-none resize-y ${promptConfig.color === 'green' ? 'text-green-400' :
                                promptConfig.color === 'blue' ? 'text-blue-400' :
                                    promptConfig.color === 'purple' ? 'text-purple-400' :
                                        'text-amber-400'
                                }`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * API Keys Configuration Section
 */


// ============================================================
// MAIN COMPONENT
// ============================================================

const IaSettingsTab = ({ profile, onUpdate, loading, setHeaderActions }) => {
    // Merge defaults with profile data to ensure local form is always complete
    const getInitialForm = () => {
        const base = profile?.ai_config || {};
        const mergedPrompts = { ...base.prompts || {} };

        // Ensure all default prompt IDs exist in mergedPrompts
        Object.keys(DEFAULT_PROMPTS).forEach(id => {
            if (!mergedPrompts[id]) {
                mergedPrompts[id] = {
                    prompt: DEFAULT_PROMPTS[id].prompt,
                    model: DEFAULT_PROMPTS[id].defaultModel,
                    provider: DEFAULT_PROMPTS[id].defaultProvider
                };
            }
        });

        return {
            ...base,
            prompts: mergedPrompts
        };
    };

    const [form, setForm] = useState(getInitialForm());
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    // Sync from profile when needed (but don't overwrite user unsaved work easily)
    // CRITICAL: We don't sync if we are currently saving to avoid "flicker" reset to old PB values
    useEffect(() => {
        if (profile?.ai_config && !saving) {
            console.log("[IaSettingsTab] Profile config changed, updating local form (Sync)");
            setForm(getInitialForm());
        }
    }, [profile?.ai_config, saving]); // Added saving to dependencies to ensure sync happens after save finishes

    const handlePromptChange = useCallback((promptId, config) => {
        setForm(prev => ({
            ...prev,
            prompts: {
                ...prev.prompts,
                [promptId]: config
            }
        }));
    }, []);

    const handlePromptReset = useCallback((promptId) => {
        setForm(prev => ({
            ...prev,
            prompts: {
                ...prev.prompts,
                [promptId]: {
                    ...prev.prompts?.[promptId],
                    prompt: DEFAULT_PROMPTS[promptId].prompt,
                    model: DEFAULT_PROMPTS[promptId].defaultModel,
                    provider: DEFAULT_PROMPTS[promptId].defaultProvider
                }
            }
        }));
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        console.log("[IaSettingsTab] Saving ai_config:", form);
        console.log("[IaSettingsTab] **MODELS being saved:**", {
            ats: form?.prompts?.ats?.model,
            generation: form?.prompts?.generation?.model,
            recruiter: form?.prompts?.recruiter?.model
        });
        try {
            // CRITICAL FIX: Only send the ai_config field, not the entire profile
            // Sending the entire profile caused stale data issues
            await onUpdate({ ai_config: form });
            setLastSaved(new Date().toLocaleTimeString());
            console.log("[IaSettingsTab] Save successful at", new Date().toLocaleTimeString());
        } catch (error) {
            console.error("[IaSettingsTab] Save failed", error);
            alert("Erreur lors de la sauvegarde : " + error.message);
        } finally {
            setSaving(false);
        }
    }, [form, onUpdate]);

    // Header actions
    useEffect(() => {
        setHeaderActions(
            <button
                onClick={handleSave}
                disabled={loading || saving}
                className={`flex items-center gap-2 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl font-bold text-sm transition-all disabled:opacity-50 ${saving ? 'bg-gray-500' : 'bg-pepite-gold'}`}
            >
                <Save size={16} />
                {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>
        );
    }, [setHeaderActions, handleSave, loading, saving]);

    return (
        <div className="space-y-4 max-w-4xl mx-auto pb-20">
            {/* Header Info */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-start gap-3">
                    <Zap size={20} className="text-pepite-gold shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-300">
                        <p className="font-bold text-white mb-1">Configuration IA par Agent</p>
                        <p>Personnalisez le modèle et le prompt pour chaque étape du process.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <OpenRouterBalance />
                    {lastSaved && (
                        <div className="text-[10px] text-green-400 font-bold bg-green-950 px-2 py-1 rounded">
                            SAUVEGARDÉ À {lastSaved}
                        </div>
                    )}
                </div>
            </div>

            {/* Prompts (Primary Content) */}
            <div className="space-y-3">
                {Object.values(DEFAULT_PROMPTS).map(promptConfig => (
                    <PromptCard
                        key={promptConfig.id}
                        promptConfig={promptConfig}
                        userConfig={form.prompts?.[promptConfig.id]}
                        onChange={handlePromptChange}
                        onReset={handlePromptReset}
                        defaultPrompt={promptConfig.prompt}
                    />
                ))}
            </div>

            {/* Footer Action */}
            <div className="pt-6 flex justify-center">
                <button
                    onClick={handleSave}
                    disabled={loading || saving}
                    className="flex items-center gap-2 bg-gray-800 text-white px-8 py-3 rounded-xl shadow-lg hover:bg-black font-bold text-base transition-all disabled:opacity-50"
                >
                    <Save size={20} />
                    {saving ? "Enregistrement en cours..." : "Enregistrer tous les réglages IA"}
                </button>
            </div>
        </div>
    );
};

export default IaSettingsTab;
