const admin = require('firebase-admin');
const PocketBase = require('pocketbase/cjs');
const fs = require('fs');
const path = require('path');

const PB_URL = 'https://pocketbase.circumambule.synology.me/';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const pb = new PocketBase(PB_URL);

async function run() {
    console.log("Migration Start...");
    try {
        const snap = await db.collection('jobs').get();
        console.log(`Found ${snap.size} jobs in Firebase.`);

        for (let i = 0; i < snap.docs.length; i++) {
            const doc = snap.docs[i];
            const data = doc.data();

            const pbData = {
                ID_Annonce: data.ID_Annonce || doc.id,
                Titre_poste: data.Titre_poste || '',
                Entreprise: data.Entreprise || '',
                Lieu: data.Lieu || '',
                Statut: data.Statut || 'Nouvelle',
                ownerId: data.ownerId || '',
                initialData: data
            };

            try {
                await pb.collection('jobs').create(pbData);
                if (i % 10 === 0) console.log(`Progress: ${i}/${snap.size}`);
            } catch (e) {
                console.log(`Error on ${doc.id}: ${e.message}`);
                // Don't log the whole 'e' if it's too big
            }
        }
        console.log("Migration Jobs Done.");

        // Users
        console.log("Migrating Users...");
        const userSnap = await db.collection('users').get();
        for (const doc of userSnap.docs) {
            const data = doc.data();
            try {
                // On tente de créer dans user_profiles
                await pb.collection('user_profiles').create({
                    uid: doc.id,
                    email: data.email || '',
                    displayName: data.displayName || '',
                    searchConfig: data.searchConfig || [],
                    visualFilters: data.visualFilters || [],
                    settings: data
                });
            } catch (e) {
                console.log(`User ${doc.id} skip or error: ${e.message}`);
            }
        }
        console.log("Migration Complete.");

    } catch (err) {
        console.log("FATAL ERROR: " + err.message);
    }
}

run();
