import { useEffect, useRef, useState } from 'react';
import { pb } from '../services/pb';
import { analyzeJobATS, fetchCVContent } from '../services/atsService';
import { fetchJinaContent } from '../services/jobSourcingService';
import { generateDossier } from '../services/generationService';

const WORKER_HEARTBEAT = 15 * 60 * 1000; // 15 minutes safety check

export const BackgroundWorker = ({ user, setProcessingStatus }) => {
    const [trigger, setTrigger] = useState(0);
    const [logs, setLogs] = useState([]);
    const processingRef = useRef(false);

    // Helper to send logs to the IA Monitor
    const emitLog = (msg, type = 'info') => {
        const log = { id: Date.now(), msg, type, time: new Date().toLocaleTimeString() };
        setLogs(prev => [log, ...prev].slice(0, 50));
        // console.log(`[Worker] ${msg}`);
        const event = new CustomEvent('ia-monitor-log', { detail: { msg, type } });
        window.dispatchEvent(event);
    };

    // 1. RECTIVE TRIGGER: Listen to DB changes
    useEffect(() => {
        if (!user?.id) return;

        console.log("[Worker] Standing by... subscribing to Realtime changes.");
        emitLog('Robot en veille intelligente (Mode Réactif activé)', 'debug');

        // Subscribe to ANY change for this owner
        let unsubscribeFunc = null;
        let isCancelled = false;

        pb.collection('jobs').subscribe('*', (e) => {
            if (e.record.ownerId !== user.id) return;

            // Wake up only for interesting status changes or missing scores
            const isInteresting =
                ["Traitement", "A traiter"].includes(e.record.Statut) ||
                (e.record.score_ATS === 0 || e.record.score_ATS === null);

            if (isInteresting) {
                console.log(`[Worker] Wake up! Change detected on ${e.record.id}`);
                setTrigger(prev => prev + 1);
            }
        }, { filter: `ownerId = "${user.id}"` }).then(unsub => {
            if (isCancelled) unsub();
            else unsubscribeFunc = unsub;
        }).catch(err => console.error("Worker Subscribe Error:", err));

        // 2. SAFETY HEARTBEAT: Run every 15 min just in case
        const heartbeat = setInterval(() => {
            console.log("[Worker] Heartbeat safety check...");
            setTrigger(prev => prev + 1);
        }, WORKER_HEARTBEAT);

        return () => {
            isCancelled = true;
            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
            clearInterval(heartbeat);
        };
    }, [user?.id]);

    useEffect(() => {
        const processQueue = async () => {
            if (processingRef.current || !user) return;

            processingRef.current = true;
            // emitLog('Cycle de vérification lancé...', 'debug'); // Too noisy

            try {
                // 1. Fetch User Config for AI & CV
                // Need AI Config (for model) and User Profile (for CV Master URL)
                const userProfile = await pb.collection('users').getOne(user.id);

                // Default AI Config if not set
                const aiConfig = {
                    // Try to get from user config or use defaults
                    model: 'google/gemini-2.0-flash-001', // Default fast model
                    ...userProfile?.ia_config // Merge user preferences if any
                };

                // --- 1. PRIORITY: DOSSIER GENERATION ---
                // Find ONE Job to Process (Generation)
                // Priority: "Traitement" -> Then maybe "A traiter" if we automate fully
                const jobsToGen = await pb.collection('jobs').getList(1, 1, {
                    filter: `ownerId = "${user.id}" && (Statut = "Traitement" || Statut = "A traiter") && (CV_Texte_Adapte = "" || CV_Texte_Adapte = null)`,
                    sort: '-created'
                });

                if (jobsToGen.items.length > 0) {
                    const jobToGen = jobsToGen.items[0];
                    emitLog(`Démarrage génération pour : ${jobToGen.Titre_poste}...`, 'info');
                    if (setProcessingStatus) setProcessingStatus(`Génération Dossier: ${jobToGen.Titre_poste.slice(0, 20)}...`);

                    // --- ENRICHISSEMENT AUTOMATIQUE (WTTJ) ---
                    if (window.navigator.onLine) {
                        const isWTTJ = jobToGen.Source === 'WTTJ' || (jobToGen.URL_offre && jobToGen.URL_offre.includes('welcometothejungle'));
                        const isPoorDescription = !jobToGen.Description || jobToGen.Description.length < 200 || jobToGen.Description.includes("Voir l'offre");

                        if (isWTTJ && isPoorDescription) {
                            emitLog(`Enrichissement du contenu WTTJ en cours...`, 'info');
                            try {
                                const enriched = await fetchJinaContent(jobToGen.URL_offre);

                                // Update local object & DB
                                jobToGen.Description = enriched.description;
                                // We can also update other fields if needed, but Description is key
                                await pb.collection('jobs').update(jobToGen.id, {
                                    Description: enriched.description
                                });
                                emitLog(`Contenu enrichi avec succès !`, 'success');
                            } catch (fetchErr) {
                                console.error("Enrichment failed", fetchErr);
                                emitLog(`Impossible de récupérer le contenu complet: ${fetchErr.message}`, 'warning');
                                // Continue anyway with partial content
                            }
                        }
                    }

                    // 2.1 Fetch Master CV Content (Text)
                    let cvContent = "";
                    if (userProfile.master_cv_id) {
                        try {
                            cvContent = await fetchCVContent(userProfile.master_cv_id);
                        } catch (err) {
                            emitLog("Erreur lecture CV Master: " + err.message, 'error');
                            // Reset status to avoid loop
                            await pb.collection('jobs').update(jobToGen.id, { Statut: 'A vérifier' });
                            throw err;
                        }
                    } else {
                        emitLog("Aucun CV Master configuré dans le profil !", 'error');
                        await pb.collection('jobs').update(jobToGen.id, { Statut: 'A vérifier' });
                        processingRef.current = false;
                        if (setProcessingStatus) setProcessingStatus(null);
                        return;
                    }

                    // 2.2 Generate Dossier (CV + LM + Message)
                    try {
                        const genResult = await generateDossier(jobToGen, cvContent, aiConfig);

                        // 2.3 Save & Validate
                        await pb.collection('jobs').update(jobToGen.id, {
                            CV_Texte_Adapte: JSON.stringify(genResult.cv),
                            LM_Texte: JSON.stringify(genResult.lettre_motivation),
                            Message_Contact: JSON.stringify(genResult.message_contact),
                            Date_Traitement: new Date().toISOString(),
                            Statut: "A vérifier"
                        });
                        console.log(`[Worker] Job ${jobToGen.id} Generated!`);
                        emitLog(`Génération réussie pour ${jobToGen.Titre_poste}`, 'success');
                    } catch (genErr) {
                        console.error(`[Worker] Failed to generate job ${jobToGen.id}`, genErr);
                        emitLog(`ERREUR GÉNÉRATION sur ${jobToGen.id}: ${genErr.message}`, 'error');
                        await new Promise(r => setTimeout(r, 5000));
                    }

                    processingRef.current = false;
                    if (setProcessingStatus) setProcessingStatus(null);
                    return; // Done for this cycle
                }

                // --- 2. SECONDARY: ATS SCORING (Now using Adapted CV if available) ---
                // Find ANY job that has NO score and HAS adapted content
                const jobsToScore = await pb.collection('jobs').getList(1, 1, {
                    filter: `ownerId = "${user.id}" && (score_ATS = 0 || score_ATS = null) && CV_Texte_Adapte != ""`,
                    sort: '-created',
                });

                if (jobsToScore.items.length > 0) {
                    const job = jobsToScore.items[0];
                    if (setProcessingStatus) setProcessingStatus(`Calcul Score ATS: ${job.Titre_poste}...`);
                    emitLog(`Calcul Score ATS (sur CV Adapté) : ${job.Titre_poste}`, 'info');

                    try {
                        // Extract text from Adapted CV JSON
                        let cvToAnalyze = "";
                        try {
                            const cvObj = JSON.parse(job.CV_Texte_Adapte);
                            // Simple text reconstruction for the LLM auditor
                            cvToAnalyze = `${cvObj.titre}\n\n${cvObj.profil_professionnel}\n\nCompétences: ${cvObj.competences?.join(', ')}\nOutils: ${cvObj.outils?.join(', ')}\n\nExpériences:\n${cvObj.experiences?.map(exp => `- ${exp.titre} | ${exp.entreprise} | ${exp.date}\n  ${exp.realisations?.join('\n  ')}`).join('\n')}`;
                        } catch (err) {
                            console.warn("Failed to parse adapted CV for scoring, falling back to Master CV", err);
                            cvToAnalyze = await fetchCVContent(userProfile.master_cv_id);
                        }

                        // analyzeJobATS normally fetches the CV from URL. We should adapt it or bypass if we have text.
                        // Here we use the text-capable mode if analyzeJobATS is updated (next step)
                        const result = await analyzeJobATS(job, cvToAnalyze, aiConfig, true); // true = useTextDirectly

                        await pb.collection('jobs').update(job.id, {
                            score_ATS: result.score_ATS || 0,
                            remarque_ATS: result.remarque_ATS || "",
                            titre_ATS: result.data_pour_agent_redacteur?.titre_cv_recommande || job.titre_ATS || "",
                            mots_cle_ATS: result.data_pour_agent_redacteur?.mots_cles_obligatoires ? JSON.stringify(result.data_pour_agent_redacteur.mots_cles_obligatoires) : job.mots_cle_ATS || "",
                            data_ats: JSON.stringify(result.data_pour_agent_redacteur || {})
                        });
                        emitLog(`Score calculé (${result.score_ATS}%) pour ${job.Titre_poste}`, 'success');
                    } catch (e) {
                        console.error(`[Worker] Failed to score job ${job.id}`, e);
                        emitLog(`ERREUR SCORING sur ${job.id}: ${e.message}`, 'error');
                        await new Promise(r => setTimeout(r, 2000));
                    }

                    processingRef.current = false;
                    if (setProcessingStatus) setProcessingStatus(null);
                    return;
                }

                // Nothing to do
                if (setProcessingStatus) setProcessingStatus(null);

            } catch (err) {
                console.error("[Worker] Global Error", err);
            } finally {
                processingRef.current = false;
            }
        };

        processQueue();
    }, [trigger, user, setProcessingStatus]);

    return null; // Headless component
};
