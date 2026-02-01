import { pb, normalizeJob } from './pb';

const JOBS_COLLECTION = 'jobs';

export const jobService = {
    /**
     * Vérifie si un job existe déjà (par ID_Annonce ou URL).
     */
    async isDuplicate(idAnnonce, url) {
        if (!idAnnonce && !url) return false;
        const filters = [];
        if (idAnnonce) filters.push(`ID_Annonce = "${idAnnonce}"`);
        if (url) filters.push(`URL_offre = "${url}"`);

        const record = await pb.collection(JOBS_COLLECTION).getOne("", {
            filter: filters.join(' || '),
            requestKey: null // Disable auto-cancel for this check
        }).catch(() => null);

        return !!record;
    },

    /**
     * Ajoute un nouveau job avec ownerId et vérification de doublon.
     * @param {Object} jobData 
     * @param {string} userId - PocketBase User ID
     * @returns {Promise<string|null>} ID du record créé ou null si doublon
     */
    async addJob(jobData, userId) {
        if (!userId) throw new Error("Security Error: userId is mandatory");

        // Vérification doublon native
        const duplicate = await this.isDuplicate(jobData.ID_Annonce, jobData.URL_offre);
        if (duplicate) {
            console.log(`Job skipped: Duplicate found for ${jobData.ID_Annonce || jobData.URL_offre}`);
            return null;
        }

        const record = await pb.collection(JOBS_COLLECTION).create({
            ...jobData,
            ownerId: userId,
        });
        return record.id;
    },

    /**
     * Écoute les jobs d'un utilisateur en temps réel.
     * @param {string} userId - PocketBase User ID
     * @param {Function} callback 
     * @returns {Function} Unsubscribe function
     */
    subscribeJobs(userId, callback) {
        if (!userId) return () => { };

        let allJobs = [];

        const notify = () => {
            // Split into categories for compatibility with UI expectations if needed
            // But the original code sorted and returned EVERYTHING.
            const sorted = allJobs
                .map(normalizeJob)
                .sort((a, b) => {
                    const dateA = new Date(a.Date_Publication || a.created || 0);
                    const dateB = new Date(b.Date_Publication || b.created || 0);
                    return dateB - dateA;
                });
            callback(sorted);
        };

        // Initial fetch - Load ALL jobs (no limit) to ensure 'Review' and 'Sent' tabs are populated
        pb.collection(JOBS_COLLECTION).getFullList({
            filter: `ownerId = "${userId}" && Statut != "Non validée"`,
            sort: '-created',
        }).then(result => {
            allJobs = result;
            notify();
        });

        // Subscribe to changes for this owner
        // Note: Filter in subscribe is available in PB v0.22+
        // Store the unsubscribe promise/function to call it safely
        let unsubscribeFunc = null;
        let isCancelled = false;

        pb.collection(JOBS_COLLECTION).subscribe('*', (e) => {
            if (e.record.ownerId !== userId) return;

            if (e.action === 'create') {
                // Check if already exists to avoid duplication
                if (!allJobs.find(j => j.id === e.record.id)) {
                    allJobs = [e.record, ...allJobs];
                }
            } else if (e.action === 'update') {
                allJobs = allJobs.map(item => item.id === e.record.id ? e.record : item);
            } else if (e.action === 'delete') {
                allJobs = allJobs.filter(item => item.id !== e.record.id);
            }
            notify();
        }, { filter: `ownerId = "${userId}"` }).then(unsub => {
            if (isCancelled) {
                unsub();
                console.log("Subscription cancelled before established.");
            } else {
                unsubscribeFunc = unsub;
            }
        }).catch(err => console.error("Worker Subscribe Error:", err));

        // Return a safe cleanup function
        return () => {
            isCancelled = true;
            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
        };
    },

    /**
     * Mise à jour partielle d'un job.
     */
    async updateJob(jobId, data) {
        await pb.collection(JOBS_COLLECTION).update(jobId, data);
    }
};
