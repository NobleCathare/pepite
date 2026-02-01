import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import SwipeContainer from './components/views/SwipeContainer';
import EditorPanel from './components/views/EditorPanel';
import SubmissionDeck from './components/views/SubmissionDeck';
import DashboardKanban from './components/views/DashboardKanban';
import SettingsView from './components/views/SettingsView';
import MapView from './components/views/MapView';
import { STATUS } from './utils/consts';
import { useJobs } from './hooks/useJobs';
import { useUser } from './hooks/useUser';
// import { useWebhook } from './hooks/useWebhook'; // REMOVED
import useRecruiter from './hooks/useRecruiter';
import LoginView from './components/views/LoginView';
import { BackgroundWorker } from './components/BackgroundWorker';
import PdfPreview from './components/views/PdfPreview';
import IaMonitorView from './components/views/IaMonitorView';

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [processingStatus, setProcessingStatus] = useState(null); // Added State
  const location = useLocation();

  const { jobs, updateJobStatus, updateJobData, settings, updateSheetValues, appendSheetRow, loading, fetchData, saveJobDraft, token } = useJobs();
  const { user: userProfile, loading: userLoading } = useUser();
  // const { executeAction } = useWebhook(); // REMOVED

  // Recruiter search hook (hybrid workflow: LLM auto + Jina optional)
  const { autoInferRecruiter } = useRecruiter(updateJobData);

  // Auto-refresh logic
  useEffect(() => {
    const pendingCount = jobs.filter(j => j.Statut === STATUS.TRAITEMENT).length;
    const delay = pendingCount > 0 ? 10000 : 60000;

    const interval = setInterval(() => {
      fetchData({ silent: true });
    }, delay);

    return () => clearInterval(interval);
  }, [fetchData, jobs]);

  // Derived state for counters
  const counts = {
    [STATUS.NOUVELLE]: jobs.filter(j => j.Statut === STATUS.NOUVELLE || j.Statut === STATUS.FILTRE_ATS).length,
    [STATUS.A_VERIFIER]: jobs.filter(j => j.Statut === STATUS.A_VERIFIER).length,
    [STATUS.PRETE]: jobs.filter(j => j.Statut === STATUS.PRETE).length,
  };

  // --- FILTERING LOGIC ---
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return (
        job.Titre_poste?.toLowerCase().includes(lowerQuery) ||
        job.Description?.toLowerCase().includes(lowerQuery) ||
        job.Entreprise?.toLowerCase().includes(lowerQuery) ||
        job.Lieu?.toLowerCase().includes(lowerQuery)
      );
    });
  }, [jobs, searchQuery]);

  // Actions handler
  const handleAction = async (action, id, payload = {}) => {
    switch (action) {
      case 'REFUSE':
        updateJobStatus(id, STATUS.NON_VALIDEE);
        break;
      case 'KEEP': {
        // Update status to TRAITEMENT - BackgroundWorker will auto-generate
        updateJobStatus(id, STATUS.TRAITEMENT);

        // Find the job object for recruiter inference
        const targetJob = jobs.find(j => j.id === id);

        // Trigger recruiter auto-inference in background (FREE LLM)
        // This runs async without blocking the main workflow
        if (targetJob && !targetJob.Prenom_Recruteur && !targetJob.Nom_Recruteur) {
          autoInferRecruiter(targetJob).catch(err => {
            console.warn('[KEEP] Recruiter inference failed (non-blocking):', err.message);
          });
        }
        // NOTE: BackgroundWorker will automatically generate CV/LM/Message
        // No need for WRITE_APPLICATION webhook anymore!
        break;
      }
      case 'VALIDATE': {
        // 1. Save the draft content
        await saveJobDraft(id, payload);

        // 2. Mark as ready for submission
        // PDF generation is done on-demand in SubmissionDeck
        updateJobStatus(id, STATUS.PRETE);
        break;
      }
      case 'SAVE_DRAFT':
        saveJobDraft(id, payload);
        break;
      case 'REJECT_DRAFT':
        updateJobStatus(id, STATUS.NON_VALIDEE);
        break;
      case 'MARK_SENT':
        updateJobStatus(id, STATUS.ENVOYEE, {
          Date_Envoie: new Date().toISOString(),
          Date_Traitement: new Date().toISOString()
        });
        break;
      case 'SEND_EMAIL':
        // executeAction(action, id, payload); // REMOVED: Managed by BackgroundWorker or Manual
        updateJobStatus(id, STATUS.ENVOYEE, {
          Date_Envoie: new Date().toISOString(),
          Date_Traitement: new Date().toISOString()
        });
        break;
      case 'STATUS_CHANGE':
        updateJobStatus(id, payload);
        break;
      case 'REGENERATE': {
        // Reset generated content to trigger BackgroundWorker regeneration
        updateJobStatus(id, STATUS.TRAITEMENT);
        // Clear CV_Texte_Adapte to force BackgroundWorker to regenerate
        updateJobData(id, { CV_Texte_Adapte: '', LM_Texte: '', Message_Contact: '' });
        // NOTE: BackgroundWorker will auto-regenerate when it sees empty content
        break;
      }
      default:
        console.warn("Unknown action", action);
    }
  };

  // User Loading Check
  if (userLoading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-400">Chargement...</div>;
  }

  // Not Logged In Check
  if (!userProfile) {
    return (
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">

      {/* Background Worker */}
      <BackgroundWorker user={userProfile} setProcessingStatus={setProcessingStatus} />

      {/* Floating Status Bar */}
      {processingStatus && (
        <Link
          to="/debug-ia"
          className="fixed top-0 left-0 right-0 z-[60] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 text-center shadow-md animate-pulse cursor-pointer flex items-center justify-center gap-2 group transition-colors"
        >
          <span>⚡ {processingStatus}</span>
          <span className="opacity-0 group-hover:opacity-100 text-[10px] bg-white/20 px-2 rounded transition-opacity">Diagnostic →</span>
        </Link>
      )}

      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <Navigation counts={counts} />

      <main className="flex-1 w-full max-w-7xl mx-auto pt-20 px-4 md:px-8 pb-4">
        <Routes>
          <Route path="/" element={<Navigate to="/triage" replace />} />
          <Route path="/triage" element={<SwipeContainer jobs={filteredJobs.filter(j => [STATUS.NOUVELLE, STATUS.FILTRE_ATS].includes(j.Statut))} onAction={handleAction} />} />
          <Route path="/map" element={<MapView jobs={filteredJobs} onAction={handleAction} />} />
          <Route path="/editor" element={<EditorPanel jobs={filteredJobs.filter(j => j.Statut === STATUS.A_VERIFIER)} processingCount={jobs.filter(j => j.Statut === STATUS.TRAITEMENT).length} onAction={handleAction} />} />
          <Route path="/submission" element={<SubmissionDeck jobs={filteredJobs.filter(j => j.Statut === STATUS.PRETE)} onAction={handleAction} />} />
          <Route path="/dashboard" element={<DashboardKanban jobs={filteredJobs.filter(j => [STATUS.ENVOYEE, STATUS.ENTRETIEN, STATUS.OFFRE, STATUS.REFUSEE, STATUS.REFUSEE_APRES_ENTRETIEN].includes(j.Statut))} onStatusChange={updateJobStatus} onUpdateJob={(job) => updateJobData(job.id || job.ID_Annonce, job)} accessToken={token} />} />

          {/* Settings Route */}
          <Route path="/parametre" element={<Navigate to="/parametre/profil" replace />} />
          <Route path="/parametre/:tab" element={
            <SettingsView
              settings={settings}
              updateSheetValues={updateSheetValues}
              appendSheetRow={appendSheetRow}
              jobs={jobs}
              updateJobStatus={updateJobStatus}
              loading={loading}
            />
          } />

          {/* PDF Preview (standalone page) */}
          <Route path="/preview-pdf" element={<PdfPreview />} />

          {/* AI Debug Monitor */}
          <Route path="/debug-ia" element={<IaMonitorView />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/triage" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
