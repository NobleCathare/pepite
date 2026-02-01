const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// --- CONFIGURATION ---
const CSV_FILE = 'Annonces.csv';
const TARGET_COLLECTION = 'jobs';
const MY_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1';

const serviceAccount = require('../serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const safeDate = (dateString, context) => {
    if (!dateString) return null;
    let d = new Date(dateString);
    if (!isNaN(d.getTime())) return d;

    // Try DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
};

async function importRaw() {
    console.log("🚀 Démarrage Import RAW (Zéro Transformation)...");
    const results = [];

    fs.createReadStream(path.join(__dirname, CSV_FILE))
        .pipe(csv({ separator: ',' }))
        .on('data', (row) => {
            // Cleaning keys (trim spaces) but keeping original Casing
            const cleanRow = {};
            Object.keys(row).forEach(k => {
                cleanRow[k.trim()] = row[k];
            });

            if (!cleanRow['Titre_poste'] && !cleanRow['Entreprise']) return;

            // RAW DO NOT TRANSFORM
            // Except adding ownerId and system timestamps
            const job = {
                ...cleanRow,
                ownerId: MY_UID,
                // We need a proper Timestamp for ordering, using Date_Publication or now
                createdAt: safeDate(cleanRow['Date_Publication']) || new Date()
            };

            results.push(job);
        })
        .on('end', async () => {
            console.log(`📦 ${results.length} annonces prêtes. Écriture...`);

            const batchSize = 400;
            let batch = db.batch();
            let count = 0;

            for (const job of results) {
                const docRef = db.collection(TARGET_COLLECTION).doc();
                batch.set(docRef, job);
                count++;
                if (count % batchSize === 0) {
                    await batch.commit();
                    process.stdout.write('█');
                    batch = db.batch();
                }
            }
            await batch.commit();
            console.log(`\n✅ MIGRATION RAW TERMINÉE : ${count} annonces injectées.`);
        });
}

importRaw();
