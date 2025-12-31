import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { STATUS } from '../utils/consts';
import { mockJobs } from '../utils/mockData';

export function useGoogleSheets() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('google_token'));
    const [isAuth, setIsAuth] = useState(!!localStorage.getItem('google_token'));

    const SCOPE = import.meta.env.VITE_GOOGLE_SCOPES;

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            setToken(codeResponse.access_token);
            setIsAuth(true);
            localStorage.setItem('google_token', codeResponse.access_token);
        },
        onError: (error) => console.log('Login Failed:', error),
        scope: SCOPE
    });

    const logout = () => {
        setToken(null);
        setIsAuth(false);
        setJobs([]);
        localStorage.removeItem('google_token');
    };

    const [settings, setSettings] = useState({
        systeme: [],
        filtres: [],
        recherche: [],
        rome: []
    });

    const normalizeStatus = (rawStatus) => {
        if (!rawStatus) return STATUS.NOUVELLE;
        if (rawStatus === 'Filtre ATS') return 'Filtrée';
        if (rawStatus === 'Type' || rawStatus === 'Linkedin') return STATUS.NOUVELLE;
        if (rawStatus === 'CV réalisé' || rawStatus === 'LM réalisé') return STATUS.PRETE;
        if (rawStatus === 'LM & CV envoyés') return STATUS.ENVOYEE;

        const known = Object.values(STATUS);
        if (known.includes(rawStatus)) return rawStatus;

        return STATUS.NOUVELLE;
    };

    const fetchData = async ({ silent = false } = {}) => {
        if (!token) return;
        if (!silent) setLoading(true);
        setError(null);

        try {
            const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
            // Batch Get URL
            const ranges = [
                'Annonces!A2:AZ1000',
                'Config_Systeme!A2:E100',
                'Config_Filtres!A2:F500',
                'Config_Recherche!A2:E100', // Assuming structure
                'ROME!A2:D2000'            // Assuming structure
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
            const announcementRows = valueRanges[0].values || [];
            const mappedJobs = announcementRows.map((row, index) => ({
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
                Linkedin_Recruteur: row[12],
                Statut: normalizeStatus(row[27]),
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
                rowIndex: index + 2
            }));

            setJobs(mappedJobs.filter(j => j.ID_Annonce));

            // 2. SETTINGS parsing
            setSettings({
                systeme: valueRanges[1].values || [],
                filtres: valueRanges[2].values || [],
                recherche: valueRanges[3].values || [],
                rome: valueRanges[4].values || []
            });

        } catch (e) {
            console.error("Fetch Error", e);
            setError(e.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

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
        loading,
        error,
        isAuth,
        login,
        logout,
        updateJobStatus,
        updateSheetValues,
        appendSheetRow,
        fetchData,      // <--- Exposed
        saveJobDraft,   // <--- Exposed
        updateJobData: () => { }
    };
}
