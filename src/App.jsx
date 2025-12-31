import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import SwipeContainer from './components/views/SwipeContainer';
import EditorPanel from './components/views/EditorPanel';
import SubmissionDeck from './components/views/SubmissionDeck';
import DashboardKanban from './components/views/DashboardKanban';
import SettingsView from './components/views/SettingsView';
import MapView from './components/views/MapView';
// Imports verified
import { STATUS } from './utils/consts';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import { useWebhook } from './hooks/useWebhook';

function App() {
  const [currentView, setCurrentView] = useState('triage');
  const [searchQuery, setSearchQuery] = useState(""); // Global Search State
  const { jobs, updateJobStatus, settings, updateSheetValues, appendSheetRow, loading, fetchData, saveJobDraft } = useGoogleSheets();
  const { executeAction } = useWebhook();

  // Auto-refresh logic
  useEffect(() => {
    // Determine polling frequency based on activity
    const pendingCount = jobs.filter(j => j.Statut === STATUS.TRAITEMENT).length;

    // If we have items in processing, we need faster updates (10s)
    // If not, we can slow down to save bandwidth (60s)
    const delay = pendingCount > 0 ? 10000 : 60000;

    const interval = setInterval(() => {
      // Use silent mode to NOT trigger global loading state
      fetchData({ silent: true });
    }, delay);

    return () => clearInterval(interval);
  }, [fetchData, jobs]);

  // Derived state for counters
  const counts = {
    [STATUS.NOUVELLE]: jobs.filter(j => j.Statut === STATUS.NOUVELLE).length,
    [STATUS.A_VERIFIER]: jobs.filter(j => j.Statut === STATUS.A_VERIFIER).length,
    [STATUS.PRETE]: jobs.filter(j => j.Statut === STATUS.PRETE).length,
  };

  // --- FILTERING LOGIC ---
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
    // 1. Trigger Async Background Action
    // Note: For VALIDATE, we handle specifically below to ensure save order

    // 2. Optimistic UI Update & Logic
    switch (action) {
      case 'REFUSE':
        executeAction(action, id, payload);
        updateJobStatus(id, STATUS.NON_VALIDEE);
        break;
      case 'KEEP':
        executeAction(action, id, payload);
        updateJobStatus(id, STATUS.TRAITEMENT);
        executeAction('ENRICH_JOB', id);
        break;
      case 'VALIDATE':
        // A. Persist the edited content to Google Sheet first
        await saveJobDraft(id, payload);

        // B. Trigger N8N with ONLY the ID (User request: "Envoie juste l'ID")
        // n8n will fetch the content (columns AM, AN, AO) from the sheet itself
        executeAction('GENERATE_PDF', id, {});

        // C. Hide locally
        updateJobStatus(id, STATUS.TRAITEMENT, {}, true);
        break;
      case 'SAVE_DRAFT':
        executeAction(action, id, payload); // Optional: log action? actually saveJobDraft does the work
        saveJobDraft(id, payload);
        break;
      case 'REJECT_DRAFT':
        executeAction(action, id, payload);
        updateJobStatus(id, STATUS.NON_VALIDEE);
        break;
      case 'MARK_SENT':
        executeAction(action, id, payload);
        updateJobStatus(id, STATUS.ENVOYEE, { Date_Envoie: new Date().toISOString() });
        break;
      case 'SEND_EMAIL':
        executeAction(action, id, payload);
        updateJobStatus(id, STATUS.ENVOYEE, { Date_Envoie: new Date().toISOString() });
        break;
      default:
        console.warn("Unknown action", action);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'triage':
        return <SwipeContainer jobs={filteredJobs.filter(j => j.Statut === STATUS.NOUVELLE)} onAction={handleAction} />;
      case 'editor':
        return <EditorPanel
          jobs={filteredJobs.filter(j => j.Statut === STATUS.A_VERIFIER)}
          processingCount={jobs.filter(j => j.Statut === STATUS.TRAITEMENT).length}
          onAction={handleAction}
        />;
      case 'submission':
        return <SubmissionDeck jobs={filteredJobs.filter(j => j.Statut === STATUS.PRETE)} onAction={handleAction} />;
      case 'dashboard':
        return <DashboardKanban
          jobs={filteredJobs.filter(j => [STATUS.ENVOYEE, STATUS.ENTRETIEN, STATUS.OFFRE, STATUS.REFUSEE].includes(j.Statut))}
          onStatusChange={updateJobStatus}
        />;
      case 'map':
        return <MapView jobs={filteredJobs} onAction={handleAction} />;
      case 'settings':
        return <SettingsView
          settings={settings}
          updateSheetValues={updateSheetValues}
          appendSheetRow={appendSheetRow}
          jobs={jobs} // Settings might need all jobs for consistency checks, but let's keep it raw for now
          updateJobStatus={updateJobStatus}
          loading={loading}
        />;
      default:
        return <SwipeContainer jobs={filteredJobs.filter(j => j.Statut === STATUS.NOUVELLE)} onAction={handleAction} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <Navigation currentView={currentView} onViewChange={setCurrentView} counts={counts} />

      <main className="flex-1 w-full max-w-7xl mx-auto pt-20 px-4 md:px-8 pb-4">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
