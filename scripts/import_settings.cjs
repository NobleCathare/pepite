const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const TARGET_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1';

// Helper to read CSV
function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}

// Transform Config_Filtres to Visual Filters
function transformVisualFilters(rawList) {
    return rawList.map((row, index) => {
        // Map CSV headers to Schema
        // CSV: Type,Categorie,Valeur,Actif,Priorite,Raison,Date Création,Impact
        // SCHEMA: { id, category, value, active, score, reason }

        return {
            id: Date.now() + index, // Simple ID generation
            category: row['Categorie'] || 'Autre',
            value: row['Valeur'] ? row['Valeur'].replace(/^"""|"""$/g, '') : '', // Remove potential CSV quoting artifacts
            active: row['Actif'] === 'TRUE',
            score: parseInt(row['Priorite'] || 0, 10),
            reason: row['Raison'] || '',
            type: row['Type'] || 'BONUS' // Keep Type for logic? (BLACKLIST, WHITELIST, BONUS, PENALTY)
            // Note: Schema in UI used 'score', 'value' etc. 'Type' might be useful for scoring logic later.
        };
    });
}

// Transform Config_Recherche to Search Config
function transformSearchConfig(rawList) {
    return rawList.map((row, index) => {
        // CSV: Actif,Mot_Cle,Codes_ROME,Code_Lieu,Type_Lieu,Km,Contrat
        // SCHEMA: { id, active, keyword, romeCodes, location, locationType, distance, contracts }

        return {
            id: Date.now() + index + 10000,
            active: row['Actif'] === 'TRUE',
            keyword: row['Mot_Cle'] || '',
            romeCodes: row['Codes_ROME'] ? row['Codes_ROME'].split(',').map(c => c.trim()).filter(Boolean) : [],
            location: row['Code_Lieu'] || '',
            locationType: row['Type_Lieu'] || 'france',
            distance: parseInt(row['Km'] || 0, 10),
            contracts: row['Contrat'] ? row['Contrat'].split(',').map(c => c.trim()).filter(Boolean) : []
        };
    });
}

async function run() {
    try {
        console.log(`🚀 Starting settings import for UID: ${TARGET_UID}...`);

        // 1. Read CSVs
        const filtersPath = path.join(__dirname, 'Config_Filtres.csv');
        const searchPath = path.join(__dirname, 'Config_Recherche.csv');

        console.log(`📂 Reading ${filtersPath}...`);
        const rawFilters = await readCSV(filtersPath);
        console.log(`   -> Found ${rawFilters.length} filter rules.`);

        console.log(`📂 Reading ${searchPath}...`);
        const rawSearch = await readCSV(searchPath);
        console.log(`   -> Found ${rawSearch.length} search configs.`);

        // 2. Transform Data
        const visualFilters = transformVisualFilters(rawFilters);
        const searchConfig = transformSearchConfig(rawSearch);

        // 3. Prepare Update
        // "Supprimer toute la partie setting (garder la partie Profil et coordonnées)"
        // This effectively means overwriting visualFilters and searchConfig, and removing old 'settings' field if it existed.
        const updateData = {
            visualFilters: visualFilters,
            searchConfig: searchConfig,
            settings: admin.firestore.FieldValue.delete() // Clean up legacy key if needed
        };

        // 4. Update Firestore
        console.log(`💾 Updating Firestore document...`);
        await db.collection('users').doc(TARGET_UID).set(updateData, { merge: true });

        console.log(`✅ Import successful!`);
        console.log(`   - Visual Filters: ${visualFilters.length}`);
        console.log(`   - Search Configs: ${searchConfig.length}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

run();
