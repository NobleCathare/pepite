import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Activity, Bug, Play, RefreshCw, AlertCircle, CheckCircle2,
    FileText, Database, Key, Globe, Search, ArrowLeft, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { pb } from '../../services/pb';
import { fetchCVContent } from '../../services/atsService';
import { generateDossier } from '../../services/generationService';
import { STATUS } from '../../utils/consts';

const IaMonitorView = () => {
    const [jobs, setJobs] = useState([]);
    const [logs, setLogs] = useState([]);
    const [health, setHealth] = useState({
        openrouter: 'checking',
        google: 'checking',
        anthropic: 'checking',
        cv: 'checking',
        cvContent: null
    });
    const [loading, setLoading] = useState(true);
    const [testingId, setTestingId] = useState(null);
    const logEndRef = useRef(null);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = useCallback((msg, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, msg, type }]);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const user = pb.authStore.model;
            // Fetch jobs in Traitement or A traiter for the CURRENT user
            const res = await pb.collection('jobs').getList(1, 50, {
                filter: `ownerId = "${user?.id}" && (Statut = "Traitement" || Statut = "A traiter")`,
                sort: '-created'
            });
            setJobs(res.items);
        } catch (err) {
            addLog(`Erreur PocketBase: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [addLog]);

    const checkHealth = useCallback(async () => {
        addLog('Lancement du Health Check...');

        // 1. Check Env Keys
        const keys = {
            openrouter: !!import.meta.env.VITE_OPENROUTER_API_KEY,
            google: !!import.meta.env.VITE_GOOGLE_API_KEY,
            anthropic: !!import.meta.env.VITE_ANTHROPIC_API_KEY
        };

        setHealth(prev => ({
            ...prev,
            openrouter: keys.openrouter ? 'ok' : 'missing',
            google: keys.google ? 'ok' : 'missing',
            anthropic: keys.anthropic ? 'ok' : 'missing'
        }));

        // 2. Check CV Access
        try {
            const user = pb.authStore.model;
            if (user?.master_cv_id) {
                const content = await fetchCVContent(user.master_cv_id);
                setHealth(prev => ({
                    ...prev,
                    cv: 'ok',
                    cvContent: content.slice(0, 100) + '...'
                }));
                addLog('Accès CV Master: OK');
            } else {
                setHealth(prev => ({ ...prev, cv: 'missing' }));
                addLog('URL CV Master manquante dans le profil', 'error');
            }
        } catch (err) {
            setHealth(prev => ({ ...prev, cv: 'error' }));
            addLog(`Erreur accès CV: ${err.message}`, 'error');
        }
    }, [addLog]);

    // Listen to BackgroundWorker events
    useEffect(() => {
        const handleWorkerLog = (e) => {
            const msg = e.detail.msg;
            addLog(`[Worker] ${msg}`, e.detail.type || 'info');

            // AUTO-REFRESH File d'attente on important events
            const importantKeywords = ['Cycle', 'Génération', 'Score', 'réussie', 'calculé'];
            if (importantKeywords.some(kw => msg.includes(kw))) {
                console.log("[Monitor] Important log detected, refreshing queue...");
                fetchData();
            }
        };
        window.addEventListener('ia-monitor-log', handleWorkerLog);
        return () => window.removeEventListener('ia-monitor-log', handleWorkerLog);
    }, [addLog, fetchData]);

    useEffect(() => {
        fetchData();
        checkHealth();
    }, [fetchData, checkHealth]);

    const handleManualTest = async (job) => {
        setTestingId(job.id);
        addLog(`>>> TEST MANUEL : ${job.Titre_poste}`, 'warn');
        try {
            const user = pb.authStore.model;
            const cvText = await fetchCVContent(user.master_cv_id);
            addLog('CV chargé, appel LLM...');

            const result = await generateDossier(job, cvText, user.ai_config || {});
            addLog('Génération réussie !', 'success');
            console.log('Result:', result);

            if (confirm('Génération réussie. Enregistrer en base et passer en "A vérifier" ?')) {
                await pb.collection('jobs').update(job.id, {
                    CV_Texte_Adapte: JSON.stringify(result.cv),
                    LM_Texte: JSON.stringify(result.lettre_motivation),
                    Message_Contact: JSON.stringify(result.message_contact),
                    Statut: STATUS.A_VERIFIER
                });
                addLog('Job mis à jour en base.', 'success');
                fetchData();
            }
        } catch (err) {
            addLog(`ÉCHEC TEST: ${err.message}`, 'error');
        } finally {
            setTestingId(null);
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/parametre/ia" className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Activity className="text-pepite-gold" />
                                IA Control Center
                            </h1>
                            <p className="text-sm text-gray-500">Diagnostic et monitoring en temps réel</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchData} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                            <RefreshCw size={16} /> Rafraichir
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Column 1: Health & Queue */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Health Checks */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-bold uppercase text-gray-400 mb-4 flex items-center gap-2">
                                <Key size={14} /> Health Check
                            </h3>
                            <div className="space-y-3">
                                <HealthItem label="OpenRouter Key" status={health.openrouter} />
                                <HealthItem label="Google Key" status={health.google} />
                                <HealthItem label="Anthropic Key" status={health.anthropic} />
                                <HealthItem label="CV Master Access" status={health.cv} />
                                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 font-mono">
                                    USER_ID: {pb.authStore.model?.id || 'NON CONNECTÉ'}
                                </div>
                                {health.cvContent && (
                                    <div className="mt-2 text-[10px] font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded border truncate">
                                        {health.cvContent}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Queue */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-bold uppercase text-gray-400 mb-4 flex items-center gap-2">
                                <Search size={14} /> File d'attente ({jobs.length})
                            </h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {loading && <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-gray-400" /></div>}
                                {!loading && jobs.length === 0 && <div className="text-center py-4 text-xs text-gray-500 italic">Aucun job en attente</div>}
                                {jobs.map(job => (
                                    <div key={job.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 group">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-mono text-gray-400">
                                                ID: {job.id.slice(0, 8)} | OWNER: {job.ownerId || 'NULL'}
                                            </span>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${job.Statut === 'Traitement' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {job.Statut}
                                                </span>
                                                <span className={`text-[9px] font-bold ${job.score_ATS > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    ATS: {job.score_ATS}
                                                </span>
                                            </div>
                                        </div>
                                        <h4 className="text-xs font-bold truncate mb-2">{job.Titre_poste}</h4>
                                        <button
                                            onClick={() => handleManualTest(job)}
                                            disabled={!!testingId}
                                            className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            {testingId === job.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                            Tester Génération
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Column 2 & 3: Console Logs */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-800 flex flex-col h-[700px]">
                            <div className="bg-gray-800 px-5 py-3 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                    <Bug size={16} className="text-pepite-gold" />
                                    Système Log Console
                                </h3>
                                <button onClick={() => setLogs([])} className="text-[10px] text-gray-500 hover:text-white transition-colors">
                                    Effacer
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
                                {logs.length === 0 && <div className="text-gray-600 italic">En attente d'activité système...</div>}
                                {logs.map((log, i) => (
                                    <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                                        <span className={
                                            log.type === 'error' ? 'text-red-400' :
                                                log.type === 'success' ? 'text-green-400' :
                                                    log.type === 'warn' ? 'text-yellow-400' :
                                                        'text-gray-300'
                                        }>
                                            {log.msg}
                                        </span>
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const HealthItem = ({ label, status }) => {
    const icons = {
        ok: <CheckCircle2 size={16} className="text-green-500" />,
        missing: <AlertCircle size={16} className="text-red-500" />,
        error: <AlertCircle size={16} className="text-amber-500" />,
        checking: <Loader2 size={16} className="text-gray-400 animate-spin" />
    };

    return (
        <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
            {icons[status] || icons.checking}
        </div>
    );
};

export default IaMonitorView;
