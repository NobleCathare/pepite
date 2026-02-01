import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUser } from './useUser';
import { jobService } from '../services/jobService';
import { STATUS } from '../utils/consts';
import { calculateJobScore } from '../utils/scoring';

export function useJobs() {
    const { currentUser, loginWithGoogle, logout } = useAuth();
    const { user: userData } = useUser(); // Get User Data (Settings)
    const [rawJobs, setRawJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Derive Settings from PocketBase User Data
    const settings = useMemo(() => {
        return {
            systeme: [],
            visualFilters: userData?.visualFilters || [],
            searchConfig: userData?.searchConfig || [],
            rome: [], // Legacy/Unused for now
            insee: [] // Legacy/Unused for now
        };
    }, [userData]);

    // Subscribe to jobs when userData (which contains PB ID) is available
    useEffect(() => {
        if (!userData || !userData.id) {
            setRawJobs([]);
            if (!currentUser) setLoading(false);
            return;
        }

        setLoading(true);
        // Use PB ID (15 chars) to subscribe to jobs
        const unsubscribe = jobService.subscribeJobs(userData.id, (data) => {
            setRawJobs(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userData?.id]); // Only subscribe when PB ID changes

    // ADAPTER: Convert Firestore RAW (CSV Keys) -> Legacy Keys (Exact Match + Normalization)
    const jobs = useMemo(() => {
        // Status Translation Map (CSV Raw String -> App Constant)
        // CSV likely contains: "A faire", "A traiter", "Postulée", "Entretien", "Rejetée"
        const statusMap = {
            'À faire': STATUS.NOUVELLE,
            'A faire': STATUS.NOUVELLE,
            'Nouvelle': STATUS.NOUVELLE, // Just in case

            'A traiter': STATUS.A_TRAITER,
            'Traitement': STATUS.TRAITEMENT,

            'A vérifier': STATUS.A_VERIFIER, // UI String
            'A verifier': STATUS.A_VERIFIER,

            'Prête': STATUS.PRETE,
            'Prete': STATUS.PRETE,

            'Postulée': STATUS.ENVOYEE,
            'Postulee': STATUS.ENVOYEE,
            'Envoyée': STATUS.ENVOYEE,

            'Entretien': STATUS.ENTRETIEN,

            'Offre': STATUS.OFFRE,

            'Filtre ATS': STATUS.FILTRE_ATS,

            'Refusée': STATUS.REFUSEE,
            'Rejetée': STATUS.REFUSEE, // CSV uses Rejetée sometimes
            'Refusée après entretien': STATUS.REFUSEE_APRES_ENTRETIEN,
            'Non validée': STATUS.NON_VALIDEE
        };

        const getLegacyStatus = (rawStatus) => {
            if (!rawStatus) return STATUS.NOUVELLE;
            return statusMap[rawStatus] || STATUS.NOUVELLE;
        };

        const getDateIso = (dateObj) => {
            if (!dateObj) return '';
            // Handle Firestore Timestamp
            if (dateObj.toDate && typeof dateObj.toDate === 'function') {
                return dateObj.toDate().toISOString();
            }
            // Handle JS Date or String
            try {
                return new Date(dateObj).toISOString();
            } catch {
                return '';
            }
        };

        const parseTrackingField = (value, defaultType, defaultTitle) => {
            if (!value) return [];
            try {
                // Try parsing as JSON array
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed;
                // If JSON but not array (unlikely but possible), wrap it
                return [parsed];
            } catch {
                // Fallback: Simple string (Legacy format)
                return [{
                    content: value,
                    date: new Date().toISOString(),
                    type: defaultType,
                    title: defaultTitle,
                    from: 'Legacy',
                    subject: value
                }];
            }
        };

        return rawJobs.map(job => {
            // RAW SCHEMA = CSV KEYS
            const mappedStatus = getLegacyStatus(job['Statut'] || job['status']);

            const partialJob = {
                Titre: job['Titre_poste'] || '',
                Entreprise: job['Entreprise'] || '',
                Description: job['Description'] || '',
                Contrat: job['Type_contrat'] || ''
            };

            const { score, matches } = calculateJobScore(partialJob, settings.visualFilters);

            return {
                // 1. IDENTIFIANT: Use the PocketBase record ID as the primary ID for UI actions
                // so that updateJob(id) works correctly.
                id: job.id,
                ID_Annonce: job.id, // Map PB ID to ID_Annonce for compatibility with components using this field
                ID_Annonce_Origin: job['ID_Annonce'] || '', // Preserve original numeric ID if needed
                Gmail_ID: job['Gmail_ID'] || '',
                toolCallId: job['toolCallId'] || '',

                // 2. OFFRE
                Titre_poste: job['Titre_poste'] || '',
                Entreprise: job['Entreprise'] || '',
                Lieu: job['Lieu'] || '',
                Salaire: job['Salaire'] || '',
                Type_contrat: job['Type_contrat'] || '',
                Description: job['Description'] || '',
                URL_offre: job['URL_offre'] || '',
                URL_Entreprise: job['URL_Entreprise'] || '',
                Source: job['Source'] || '',

                // 3. STATUT & DATES
                Statut: mappedStatus,
                Date_Publication: job['Date_Publication'] || job.created,
                Date_Traitement: job['Date_Traitement'] || '',
                Date_Envoie: job['Date_Envoie'] || '',

                // 4. RECRUTEUR
                Type_Recruteur: job['Type_Recruteur'] || '',
                Prenom_Recruteur: job['Prenom_Recruteur'] || '',
                Nom_Recruteur: job['Nom_Recruteur'] || '',
                Poste_Recruteur: job['Poste_Recruteur'] || '',
                Email_Recruteur: job['Email_Recruteur'] || '',
                tel_recruteur: job['tel_recruteur'] || '',
                Linkedin_Recruteur: job['Linkedin_Recruteur'] || '',

                // 5. DOCUMENTS
                CV_Doc_URL: job['CV_Doc_URL'] || '',
                LM_Doc_URL: job['LM_Doc_URL'] || '',
                Combined_PDF_URL: job['LM_CV'] || job['Combined_PDF_URL'] || '',
                LM_CV: job['LM_CV'] || '',

                // 6. IA & CONTENU
                CV_Texte_Adapte: job['CV_Texte_Adapte'] || '',
                LM_Texte: job['LM_Texte'] || '',
                Message_Contact: job['Message_Contact'] || '',
                JSON_Analysis: job['output'] || job['JSON_Analysis'] || '',
                data_pour_agent_redacteur: job['data_pour_agent_redacteur'] || '',
                mot_cle: job['mot_cle'] || '',
                Mot_cle_source: job['Mot_cle_source'] || '',

                // 7. ATS & SCORING
                titre_ATS: job['titre_ATS'] || '',
                score_ATS: parseInt(job['score_ATS'] || 0, 10), // FORCE NUMBER
                remarque_ATS: job['remarque_ATS'] || '',
                mots_cle_ATS: job['mots_cle_ATS'] || '',

                // DYNAMIC SCORE OVERRIDE (Use PB score_interne as fallback)
                _score: score || parseInt(job['score_interne'] || 0),
                _score_details: matches,

                Score_a_traiter: job['Score_a_traiter'] || '',

                // 8. SUIVI (Raw Strings)
                Action_Requise: job['Action_Requise'] || '',
                Suivi_mail: job['Suivi_mail'] || '',
                Suivi_calendrier: job['Suivi_calendrier'] || '',
                Suivi_note: job['Suivi_note'] || '',
                Suivi_contact: job['Suivi_contact'] || '',

                // 9. VUE 360 (Arrays)
                Notes: job['Suivi_note'] ? [{ content: job['Suivi_note'], date: job['Date_Traitement'] || job.updated || new Date().toISOString() }] : [],
                Emails: parseTrackingField(job['Suivi_mail'], 'email', 'Email Legacy'),
                Events: parseTrackingField(job['Suivi_calendrier'], 'manual', 'Event Legacy'),
                Contacts: parseTrackingField(job['Suivi_contact'], 'contact', 'Contact Legacy'),

                // Extra
                score_AI: 0,
                isRecent: true,
                rowIndex: 0,

                // Keep Original for debugging
                _original: job
            };
        }).sort((a, b) => {
            const dateA = new Date(a.Date_Publication || 0);
            const dateB = new Date(b.Date_Publication || 0);
            return dateB - dateA;
        });
    }, [rawJobs, settings.visualFilters]); // Re-run when jobs OR filters change

    const addJob = useCallback(async (jobData) => {
        if (!userData?.id) throw new Error("User profile not loaded");
        try {
            const jobId = await jobService.addJob(jobData, userData.id);
            // TODO: Auto-trigger ATS analysis here if needed
            return jobId;
        } catch (err) {
            console.error("Add Job Failed:", err);
            setError(err.message);
            throw err;
        }
    }, [userData?.id]);

    const updateJob = useCallback(async (jobId, data) => {
        try {
            await jobService.updateJob(jobId, data);
        } catch (err) {
            console.error("Update Job Failed:", err);
            setError(err.message);
            throw err;
        }
    }, []);

    // LEGACY: updateJobStatus adapter with OPTIMISTIC UPDATE
    const updateJobStatus = useCallback(async (id, newStatus, additionalData = {}, skipSave = false) => {
        if (skipSave) return;

        // OPTIMISTIC UPDATE: Update local state immediately
        const previousJobs = [...rawJobs];
        setRawJobs(prev => prev.map(job =>
            job.id === id
                ? { ...job, Statut: newStatus, ...additionalData }
                : job
        ));

        try {
            const updates = { Statut: newStatus };
            if (additionalData.Date_Envoie) {
                updates['Date_Envoie'] = new Date(additionalData.Date_Envoie);
            }
            if (additionalData.Date_Traitement) {
                updates['Date_Traitement'] = new Date(additionalData.Date_Traitement);
            }
            await updateJob(id, updates);
        } catch (err) {
            // ROLLBACK on error
            console.error("Update Job Status Failed, rolling back:", err);
            setRawJobs(previousJobs);
            throw err;
        }
    }, [updateJob, rawJobs]);

    // LEGACY: updateJobData adapter with OPTIMISTIC UPDATE
    // Used by Kanban, App.jsx (Regenerate), useRecruiter, etc.
    const updateJobData = useCallback(async (id, legacyData) => {
        const updates = { ...legacyData };

        // Handle specific array-to-JSON conversions if needed
        // Note: We use JSON.stringify to store arrays in text fields for tracking
        if (legacyData.Emails !== undefined) {
            updates['Suivi_mail'] = JSON.stringify(legacyData.Emails);
            delete updates.Emails;
        }
        if (legacyData.Events !== undefined) {
            updates['Suivi_calendrier'] = JSON.stringify(legacyData.Events);
            delete updates.Events;
        }
        if (legacyData.Contacts !== undefined) {
            updates['Suivi_contact'] = JSON.stringify(legacyData.Contacts);
            delete updates.Contacts;
        }

        // Remove ID fields if present to avoid errors
        delete updates.id;
        delete updates.ID_Annonce;

        if (Object.keys(updates).length > 0) {
            // OPTIMISTIC UPDATE: Update local state immediately
            const previousJobs = [...rawJobs];
            setRawJobs(prev => prev.map(job =>
                job.id === id
                    ? { ...job, ...updates }
                    : job
            ));

            try {
                await updateJob(id, updates);
            } catch (err) {
                // ROLLBACK on error
                console.error("Update Job Data Failed, rolling back:", err);
                setRawJobs(previousJobs);
                throw err;
            }
        }
    }, [updateJob, rawJobs]);

    // LEGACY: saveJobDraft adapter
    const saveJobDraft = useCallback(async (id, draftData) => {
        const flatUpdates = {};
        // Map to RAW CSV keys: CV_Texte_Adapte, etc.
        if (draftData.cv) flatUpdates["CV_Texte_Adapte"] = JSON.stringify(draftData.cv);
        if (draftData.lm) flatUpdates["LM_Texte"] = JSON.stringify(draftData.lm);
        if (draftData.message) flatUpdates["Message_Contact"] = JSON.stringify(draftData.message);

        if (Object.keys(flatUpdates).length > 0) {
            await updateJob(id, flatUpdates);
        }
    }, [updateJob]);

    return {
        jobs,
        settings, // Return Real Settings
        user: currentUser,
        loading,
        error,
        isAuth: !!currentUser,
        token: currentUser?.accessToken,
        login: loginWithGoogle,
        logout,
        updateJobStatus,
        updateSheetValues: async () => { },
        appendSheetRow: async () => { },
        fetchData: async () => { },
        saveJobDraft,
        updateJobData,
        addJob,
        updateJob
    };
}
