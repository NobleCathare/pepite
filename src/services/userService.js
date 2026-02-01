import { pb } from './pb';

const USERS_COLLECTION = 'users';

// userId is now always the native PocketBase ID (15 chars)
// No more Firebase UID truncation needed

export const userService = {
    async getUserProfile(userId) {
        if (!userId) return null;
        try {
            // 1. Fetch User Record
            let userRecord = null;
            try {
                userRecord = await pb.collection(USERS_COLLECTION).getOne(userId);
            } catch (e) {
                console.error("User fetch failed (likely 404 if not created):", e);
                // Return null if user doesn't exist
                if (e.status === 404) return null;
            }

            // 2. Fetch Configs (using ownerId)
            const [searchConfig, visualFilters] = await Promise.all([
                pb.collection('config_search').getFullList({ filter: `ownerId = '${userId}'` }),
                pb.collection('config_filters').getFullList({ filter: `ownerId = '${userId}'` })
            ]);

            // 3. Transform Arrays (Robust Mapping)
            // Helper to safe parse boolean (handle "TRUE", "True", true, 1)
            const isTrue = (val) => val === true || String(val).toUpperCase() === 'TRUE';

            const mappedSearch = searchConfig.map(r => ({
                id: r.id,
                active: isTrue(r.Actif),
                keyword: r.Mot_Cle || '',
                romeCodes: r.Codes_ROME || '',
                location: r.Lieu || '',
                distance: parseInt(r.Rayon || 0) || 0,
                _originalId: r.id
            }));

            const mappedFilters = visualFilters.map(r => ({
                id: r.id,
                category: r.Categorie || '',
                value: r.Valeur || '',
                active: isTrue(r.Actif),
                type: r.Type || '',
                score: parseInt(r.Poids || 0) || 0,
                reason: r.Impact || '',
                _originalId: r.id
            }));

            // Merge
            return {
                ...(userRecord || {}),
                searchConfig: mappedSearch,
                visualFilters: mappedFilters
            };

        } catch (err) {
            console.error("Error fetching user profile:", err);
            return null;
        }
    },

    /**
     * Écoute les changements du profil utilisateur.
     */
    subscribeUser(userId, callback) {
        if (!userId) return () => { };

        this.getUserProfile(userId).then(callback);

        let unsubscribeFunc = null;
        let isCancelled = false;

        pb.collection(USERS_COLLECTION).subscribe(userId, (e) => {
            if (e.action === 'update' || e.action === 'create') {
                this.getUserProfile(userId).then(callback);
            } else if (e.action === 'delete') {
                callback(null);
            }
        }).then(unsub => {
            if (isCancelled) unsub();
            else unsubscribeFunc = unsub;
        }).catch(err => console.error("Subscribe User Error:", err));

        return () => {
            isCancelled = true;
            if (unsubscribeFunc) unsubscribeFunc();
        };
    },

    /**
     * Met à jour le profil utilisateur (fusionne avec l'existant).
     * @param {string} userId - PocketBase ID (15 chars)
     */
    async updateUserProfile(userId, data) {
        if (!userId) throw new Error("userId manquant");
        console.log(`[userService] PB.update for ${userId}:`, data);
        try {
            const result = await pb.collection(USERS_COLLECTION).update(userId, data);
            console.log("[userService] PB.update success:", result);
            return result;
        } catch (err) {
            console.error("Update User Failed:", err);
            throw err;
        }
    },

    /**
     * Sync Search Config Collection
     */
    async updateSearchConfig(userId, configList) {
        // userId is the 15-char PocketBase ID
        const currentRecords = await pb.collection('config_search').getFullList({ filter: `ownerId = '${userId}'` });
        const currentIds = new Set(currentRecords.map(r => r.id));
        const incomingIds = new Set(configList.map(r => r._originalId || r.id).filter(id => typeof id === 'string' && id.length === 15));

        const toDelete = [...currentIds].filter(id => !incomingIds.has(id));
        const promises = [];

        toDelete.forEach(id => {
            promises.push(pb.collection('config_search').delete(id));
        });

        configList.forEach(item => {
            const payload = {
                ownerId: userId,
                Actif: item.active ? 'TRUE' : 'FALSE',
                Mot_Cle: item.keyword,
                Codes_ROME: item.romeCodes,
                Lieu: item.location,
                Rayon: item.distance
            };

            if (item._originalId || (typeof item.id === 'string' && item.id.length === 15)) {
                promises.push(pb.collection('config_search').update(item._originalId || item.id, payload));
            } else {
                promises.push(pb.collection('config_search').create(payload));
            }
        });

        await Promise.all(promises);
    },

    /**
     * Sync Visual Filters Collection
     */
    async updateVisualFilters(userId, filtersList) {
        // userId is the 15-char PocketBase ID
        const currentRecords = await pb.collection('config_filters').getFullList({ filter: `ownerId = '${userId}'` });
        const currentIds = new Set(currentRecords.map(r => r.id));
        const incomingIds = new Set(filtersList.map(r => r._originalId || r.id).filter(id => typeof id === 'string' && id.length === 15));

        const toDelete = [...currentIds].filter(id => !incomingIds.has(id));
        const promises = [];

        toDelete.forEach(id => {
            promises.push(pb.collection('config_filters').delete(id));
        });

        filtersList.forEach(item => {
            const payload = {
                ownerId: userId,
                Categorie: item.category,
                Valeur: item.value,
                Actif: item.active ? 'TRUE' : 'FALSE',
                Type: item.type,
                Poids: item.score,
                Impact: item.reason
            };

            if (item._originalId || (typeof item.id === 'string' && item.id.length === 15)) {
                promises.push(pb.collection('config_filters').update(item._originalId || item.id, payload));
            } else {
                promises.push(pb.collection('config_filters').create(payload));
            }
        });

        await Promise.all(promises);
    }
};
