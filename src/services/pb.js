import PocketBase from 'pocketbase';

// URL de votre instance PocketBase (Synology)
const PB_URL = 'https://pocketbase.circumambule.synology.me/';

// Initialisation du client
export const pb = new PocketBase(PB_URL);

// Force Guest Mode to match API Rules (Unauthenticated access based on ID)
// pb.authStore.clear(); // REMOVED: Must persist session!

// Désactive l'auto-cancellation pour permettre plusieurs requêtes simultanées
pb.autoCancellation(false);

/**
 * Collection Reference Helper
 * Pour éviter les fautes de frappe
 */
export const COLLECTIONS = {
    JOBS: 'jobs',
    USERS: 'users', // Collection auth par défaut
};

/**
 * Helper to flatten Record object for frontend usage
 * (PocketBase returns an object with .id, .created, .updated, and other fields)
 * We want a clean object like Firestore
 */
export const normalizeJob = (record) => {
    if (!record) return null;

    return {
        id: record.id,
        created: record.created,
        updated: record.updated,
        ...record,
        // Compatibilité avec les champs attendus par l'UI
        title: record.Titre_poste,
        company: record.Entreprise,
        location: record.Lieu,
        status: record.Statut,
        url_offer: record.URL_offre
    };
};
