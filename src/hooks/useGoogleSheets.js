import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { STATUS } from '../utils/consts';

export function useGoogleSheets() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('google_token'));
    const [isAuth, setIsAuth] = useState(!!localStorage.getItem('google_token'));

    const [user, setUser] = useState(JSON.parse(localStorage.getItem('google_user')) || null);

    const SCOPE = import.meta.env.VITE_GOOGLE_SCOPES;

    // Helper to fetch user info
    const fetchUserInfo = async (accessToken) => {
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await res.json();
            setUser(data);
            localStorage.setItem('google_user', JSON.stringify(data));
        } catch (err) {
            console.error('Failed to fetch user info', err);
        }
    };

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            setToken(codeResponse.access_token);
            setIsAuth(true);
            localStorage.setItem('google_token', codeResponse.access_token);
            fetchUserInfo(codeResponse.access_token);
        },
        onError: (error) => console.log('Login Failed:', error),
        scope: SCOPE
    });

    const logout = () => {
        setToken(null);
        setIsAuth(false);
        setJobs([]);
        setUser(null);
        localStorage.removeItem('google_token');
        localStorage.removeItem('google_user');
    };

    const [settings, setSettings] = useState({
        systeme: [],
        filtres: [],
        recherche: [],
        rome: [],
        insee: []
    });

    const normalizeStatus = (rawStatus) => {
        if (!rawStatus) return STATUS.NOUVELLE;
        if (rawStatus === 'Type' || rawStatus === 'Linkedin') return STATUS.NOUVELLE;
        if (rawStatus === 'CV réalisé' || rawStatus === 'LM réalisé') return STATUS.PRETE;
        if (rawStatus === 'LM & CV envoyés') return STATUS.ENVOYEE;

        const known = Object.values(STATUS);
        if (known.includes(rawStatus)) return rawStatus;

        return STATUS.NOUVELLE;
    };

    const fetchData = useCallback(async ({ silent = false } = {}) => {
        if (!token) return;
        if (!silent) setLoading(true);
        setError(null);

        try {
            const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
            // Batch Get URL
            const ranges = [
                'Annonces!A2:AZ',
                'Config_Systeme!A2:E100',
                'Config_Filtres!A2:F500',
                'Config_Recherche!A2:G100', // Expanded to G for Contract Type
                'ROME!A2:E2000',            // Expanded to E for Description
                'INSEE!A2:B'                // New INSEE Data
            ];
            const rangeParams = ranges.map(r => `ranges=${r}`).join('&');
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${rangeParams}`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    logout();
                    throw new Error("Session expirée");
                }
                throw new Error(`HTTP Error ${response.status}`);
            }

            const data = await response.json();
            const valueRanges = data.valueRanges;

            // 1. ANNONCES
            const allRows = valueRanges[0].values || [];
            const totalRows = allRows.length;
            const LIMIT = 1000;
            const startIndex = Math.max(0, totalRows - LIMIT);

            const ACTIONABLE_STATUSES = [
                STATUS.A_VERIFIER,
                STATUS.TRAITEMENT,
                STATUS.PRETE,
                STATUS.ENVOYEE,
                STATUS.ENTRETIEN,
                STATUS.OFFRE,
                'A traiter' // Raw value just in case
            ];

            // Helper for safe JSON parsing
            const safeJsonParse = (str, fallback = []) => {
                if (!str) return fallback;
                try {
                    return JSON.parse(str);
                } catch {
                    console.warn("JSON Parse Warning for:", str);
                    return fallback;
                }
            };

            const mappedJobs = allRows.map((row, index) => {
                const rawStatus = row[27];
                const normalizedStatut = normalizeStatus(rawStatus);

                // Optim: Skip mapping details for obviously archived/old rows if we were constrained, 
                // but mapping 2-3k rows is negligible. We map everything to ensure rowIndex is correct.
                return {
                    ID_Annonce: row[0],
                    Titre_poste: row[1],
                    Entreprise: row[2],
                    URL_Entreprise: row[3],
                    Lieu: row[4],
                    Salaire: row[5],
                    URL_offre: row[6],
                    Description: row[7],
                    Type_contrat: row[8],
                    Source: row[9],
                    Date_Publication: row[10],
                    Prenom_Recruteur: row[13],
                    Nom_Recruteur: row[14],
                    Poste_Recruteur: row[15],
                    Email_Recruteur: row[16],
                    Date_Traitement: row[18], // Column S
                    Linkedin_Recruteur: row[12],
                    Statut: normalizedStatut,
                    score_ATS: parseInt(row[36] || '0'), // Score Mots-clés (Col 37)
                    score_AI: parseInt(row[31] || '0'),  // Score IA/ATS (Col 32)
                    remarque_ATS: row[32],
                    JSON_Analysis: row[33],
                    _score_details: row[36],
                    CV_Doc_URL: row[22], // Col W
                    LM_Doc_URL: row[23], // Col X
                    CV_Texte_Adapte: row[38] || '',
                    LM_Texte: row[39] || '',
                    Message_Contact: row[40] || '',
                    Combined_PDF_URL: row[41] || '', // Lien unique PDF (Col AP)
                    Notes: safeJsonParse(row[45]), // AT
                    Emails: safeJsonParse(row[43]), // AR
                    Events: safeJsonParse(row[44]), // AS
                    rowIndex: index + 2,
                    isRecent: index >= startIndex
                };
            });

            // Filter: Keep if Recent OR Actionable
            const finalJobs = mappedJobs.filter(j =>
                j.ID_Annonce && (j.isRecent || ACTIONABLE_STATUSES.includes(j.Statut))
            );

            setJobs(finalJobs);

            // 2. SETTINGS parsing
            setSettings({
                systeme: valueRanges[1].values || [],
                filtres: valueRanges[2].values || [],
                recherche: valueRanges[3].values || [],
                rome: valueRanges[4].values || [],
                insee: valueRanges[5].values || []
            });

        } catch (e) {
            console.error("Fetch Error", e);
            setError(e.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [token]);

    const updateJobStatus = async (id, newStatus, additionalData = {}, skipSave = false) => {
        setJobs(prev => prev.map(job =>
            job.ID_Annonce === id
                ? { ...job, Statut: newStatus, ...additionalData }
                : job
        ));

        // Allow skipping DB write for optimistic UI updates where another service (n8n) handles the write
        if (skipSave) return;

        const job = jobs.find(j => j.ID_Annonce === id);
        if (!job || !token) return;

        try {
            const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
            // STATUT is Column AB (Index 27) -> A=0, Z=25, AA=26, AB=27.
            // So Column is AB.
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Annonces!AB${job.rowIndex}?valueInputOption=RAW`;

            await fetch(url, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[newStatus]]
                })
            });

            // Update Date_Traitement (Column S - Index 18) if provided in additionalData
            if (additionalData.Date_Traitement) {
                const urlDate = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Annonces!S${job.rowIndex}?valueInputOption=RAW`;
                await fetch(urlDate, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: [[additionalData.Date_Traitement]]
                    })
                });
            }

            // --- PERSISTENCE FOR TRACKING (Notes, Emails, Events) ---
            // AQ (42) is RESERVED.
            // Emails = AR (43)
            // Events = AS (44)
            // Notes  = AT (45)

            if (additionalData.Notes || additionalData.Emails || additionalData.Events) {
                // Range AR:AT covers: AR(Emails), AS(Events), AT(Notes)
                const rangeTracking = `Annonces!AR${job.rowIndex}:AT${job.rowIndex}`;
                const valuesTracking = [[
                    additionalData.Emails ? JSON.stringify(additionalData.Emails) : (job.Emails ? JSON.stringify(job.Emails) : "[]"),
                    additionalData.Events ? JSON.stringify(additionalData.Events) : (job.Events ? JSON.stringify(job.Events) : "[]"),
                    additionalData.Notes ? JSON.stringify(additionalData.Notes) : (job.Notes ? JSON.stringify(job.Notes) : "[]")
                ]];

                const urlTracking = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${rangeTracking}?valueInputOption=RAW`;
                await fetch(urlTracking, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ values: valuesTracking })
                });
            }

        } catch (e) {
            console.error("Update Error", e);
        }
    };

    const updateSheetValues = async (range, values) => {
        if (!token) return;
        try {
            const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`;

            await fetch(url, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values })
            });

            // Optimistic update or refetch could go here
            // For now, simple refetch
            fetchData();

        } catch (e) {
            console.error("Update Sheet Error", e);
        }
    };

    const appendSheetRow = async (sheetName, values) => {
        if (!token) return;
        try {
            const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

            await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values: [values] })
            });
            fetchData();
        } catch (e) {
            console.error("Append Row Error", e);
        }
    };

    const saveJobDraft = async (id, draftData) => {
        // 1. Optimistic Update
        setJobs(prev => prev.map(job =>
            job.ID_Annonce === id
                ? {
                    ...job,
                    CV_Texte_Adapte: JSON.stringify(draftData.cv),
                    LM_Texte: JSON.stringify(draftData.lm),
                    Message_Contact: JSON.stringify(draftData.message)
                }
                : job
        ));

        const job = jobs.find(j => j.ID_Annonce === id);
        if (!job || !token) return;

        try {
            const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
            // Columns AM (38), AN (39), AO (40)
            // Indices: CV=38, LM=39, Msg=40
            const range = `Annonces!AM${job.rowIndex}:AO${job.rowIndex}`;
            const values = [[
                JSON.stringify(draftData.cv),
                JSON.stringify(draftData.lm),
                JSON.stringify(draftData.message)
            ]];

            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`;

            await fetch(url, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values })
            });

        } catch (e) {
            console.error("Save Draft Error", e);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    return {
        jobs,
        settings,
        user, // <--- Exposed
        loading,
        error,
        isAuth,
        token, // <--- Exposed for API calls
        login,
        logout,
        updateJobStatus,
        updateSheetValues,
        appendSheetRow,
        fetchData,      // <--- Exposed
        saveJobDraft,   // <--- Exposed
        updateJobData: async (id, data) => {
            // 1. Optimistic Update
            setJobs(prev => prev.map(job =>
                job.ID_Annonce === id
                    ? { ...job, ...data }
                    : job
            ));

            // 2. Persistence
            // We reuse updateJobStatus logic which now handles generic data saving
            const job = jobs.find(j => j.ID_Annonce === id);
            if (job) {
                // Pass current status to avoid changing it
                await updateJobStatus(id, job.Statut, data);
            }
        }
    };
}
