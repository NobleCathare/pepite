/**
 * useRecruiter.js
 * Hook for managing recruiter search workflow.
 * 
 * WORKFLOW:
 * 1. Auto-trigger LLM inference when job is selected (KEEP action)
 * 2. Manual "Enrichir" button triggers Jina LinkedIn scraping
 */

import { useState, useCallback } from 'react';
import {
    inferRecruiterInfo,
    enrichRecruiterInfo,
    isJinaConfigured
} from '../services/recruiterService';
import { useUser } from './useUser';

const useRecruiter = (updateJobFn) => {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [enrichLoading, setEnrichLoading] = useState(false);
    const [error, setError] = useState(null);

    // Get AI config from user profile
    const getAiConfig = useCallback(() => {
        return user?.ai_config || {};
    }, [user?.ai_config]);

    /**
     * AUTO: Called when job is selected (swipe right / KEEP)
     * Performs FREE LLM inference
     * @param {Object} job - The job object
     * @returns {Promise<Object|null>} - Inferred recruiter info
     */
    const autoInferRecruiter = useCallback(async (job) => {
        // Skip if recruiter already populated
        if (job.Prenom_Recruteur && job.Nom_Recruteur) {
            console.log('[Recruiter] Already has recruiter info, skipping');
            return null;
        }

        // Skip if no company
        if (!job.Entreprise && !job.company) {
            console.log('[Recruiter] No company name, skipping');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('[Recruiter] Starting auto-inference for:', job.Entreprise);
            const aiConfig = getAiConfig();
            const result = await inferRecruiterInfo(job, aiConfig);

            // Update job with inferred data
            if (updateJobFn && result) {
                await updateJobFn(job.id, {
                    Type_Recruteur: result.type_recruteur,
                    Prenom_Recruteur: result.prenom || '',
                    Nom_Recruteur: result.nom || '',
                    recruiter_inferred: JSON.stringify(result),
                    recruiter_source: 'llm',
                    recruiter_enriched: false
                });
            }

            return result;
        } catch (err) {
            console.error('[Recruiter] Auto-inference failed:', err);
            setError(err.message);
            // Don't throw - this is a background task
            return null;
        } finally {
            setLoading(false);
        }
    }, [getAiConfig, updateJobFn]);

    /**
     * MANUAL: Called when user clicks "Enrichir via LinkedIn"
     * Uses Jina AI to scrape LinkedIn (costs ~0.001€)
     * @param {Object} job - The job object
     * @returns {Promise<Object|null>} - Enriched recruiter info
     */
    const enrichRecruiter = useCallback(async (job) => {
        if (!isJinaConfigured()) {
            setError('Clé API Jina non configurée');
            return null;
        }

        // Skip if no company
        if (!job.Entreprise && !job.company) {
            setError('Nom d\'entreprise requis');
            return null;
        }

        setEnrichLoading(true);
        setError(null);

        try {
            console.log('[Recruiter] Starting LinkedIn enrichment for:', job.Entreprise);
            const aiConfig = getAiConfig();

            // Parse previous inference if exists
            let previousInference = {};
            try {
                if (job.recruiter_inferred) {
                    previousInference = JSON.parse(job.recruiter_inferred);
                }
            } catch (e) {
                console.warn('Failed to parse previous inference:', e);
            }

            const result = await enrichRecruiterInfo(job, previousInference, aiConfig);

            // Update job with enriched data
            if (updateJobFn && result) {
                await updateJobFn(job.id, {
                    Type_Recruteur: result.type_recruteur || '',
                    Prenom_Recruteur: result.prenom || '',
                    Nom_Recruteur: result.nom || '',
                    recruiter_linkedin: result.linkedin_url || '',
                    recruiter_inferred: JSON.stringify(result),
                    recruiter_source: result.source,
                    recruiter_enriched: true,
                    recruiter_confidence: result.confiance,
                    recruiter_alternatives: JSON.stringify(result.autres_recruteurs || [])
                });
            }

            return result;
        } catch (err) {
            console.error('[Recruiter] Enrichment failed:', err);
            setError(err.message);
            throw err;
        } finally {
            setEnrichLoading(false);
        }
    }, [getAiConfig, updateJobFn]);

    /**
     * Check if enrichment is available (Jina configured)
     */
    const canEnrich = isJinaConfigured();

    return {
        // Auto inference (free)
        autoInferRecruiter,
        loading,

        // Manual enrichment (Jina)
        enrichRecruiter,
        enrichLoading,
        canEnrich,

        // Error state
        error,
        clearError: () => setError(null)
    };
};

export default useRecruiter;
