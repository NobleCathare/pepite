const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CONFIGS = [
    {
        name: 'config_ia',
        file: 'Config_IA.csv',
        schema: [
            { name: 'Agent', type: 'text' },
            { name: 'Parametre', type: 'text' },
            { name: 'Valeur', type: 'editor' }
        ]
    },
    {
        name: 'config_search',
        file: 'Config_Recherche.csv',
        schema: [
            { name: 'Actif', type: 'text' },
            { name: 'Mot_Cle', type: 'text' },
            { name: 'Codes_ROME', type: 'text' },
            { name: 'Lieu', type: 'text' },
            { name: 'Rayon', type: 'text' },
            { name: 'Contrat', type: 'text' },
            { name: 'Experience', type: 'text' }
        ]
    },
    {
        name: 'config_filters',
        file: 'Config_Filtres.csv',
        schema: [
            { name: 'Type', type: 'text' },
            { name: 'Categorie', type: 'text' },
            { name: 'Valeur', type: 'text' }
        ]
    },
    {
        name: 'ref_insee',
        file: 'INSEE.csv',
        schema: [
            { name: 'Code_INSEE', type: 'text' },
            { name: 'Code_Postal', type: 'text' },
            { name: 'Commune', type: 'text' },
            { name: 'Departement', type: 'text' }
        ]
    },
    {
        name: 'ref_rome',
        file: 'ROME.csv',
        schema: [
            { name: 'Code_Rome', type: 'text' },
            { name: 'Intitule_Rome', type: 'text' }
        ]
    },
    {
        name: 'ref_prenoms',
        file: 'Prénoms.csv',
        schema: [
            { name: 'Sexe', type: 'text' },
            { name: 'Prenom', type: 'text' },
            { name: 'Intitule_FA', type: 'text' }
        ]
    }
];

async function run() {
    console.log("🚀 Lancement de la migration globale des configurations...");

    try {
        // 1. AUTHENTICATION
        const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ identity: 'test@test.com', password: 'testtesttest' })
        });
        if (!authRes.ok) throw new Error("Auth failed");
        const { token } = await authRes.json();
        console.log("✅ Authentifié.");

        for (const config of CONFIGS) {
            console.log(`\n📂 Traitement de : ${config.name} (${config.file})...`);

            // 2. CREER/VERIFIER LA COLLECTION
            const collRes = await fetch(`${PB_URL}/api/collections`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT
                },
                body: JSON.stringify({
                    name: config.name,
                    type: 'base',
                    schema: config.schema,
                    listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
                })
            });

            if (collRes.status === 400) {
                console.log(`ℹ️ La collection ${config.name} existe déjà.`);
            } else if (collRes.ok) {
                console.log(`✅ Collection ${config.name} créée.`);
            }

            // 3. IMPORTER LES DONNEES
            const results = [];
            const csvPath = path.join(__dirname, config.file);
            if (!fs.existsSync(csvPath)) {
                console.error(`❌ Fichier ${config.file} non trouvé. Skip.`);
                continue;
            }

            await new Promise((resolve) => {
                fs.createReadStream(csvPath)
                    .pipe(csv({ separator: ',' }))
                    .on('data', (row) => {
                        const record = {};
                        // Nettoyage des clés et mapping
                        Object.keys(row).forEach(k => {
                            const cleanKey = k.trim().replace(/ /g, '_').replace(/[^a-zA-Z0-9_]/g, '');
                            // On cherche la correspondance dans le schema (sensible à la casse ou pas)
                            const schemaField = config.schema.find(f => f.name.toLowerCase() === cleanKey.toLowerCase());
                            if (schemaField) {
                                record[schemaField.name] = row[k];
                            }
                        });
                        results.push(record);
                    })
                    .on('end', async () => {
                        console.log(`📦 ${results.length} lignes à importer.`);
                        let count = 0;
                        for (const r of results) {
                            const res = await fetch(`${PB_URL}/api/collections/${config.name}/records`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': token,
                                    'Content-Type': 'application/json',
                                    'User-Agent': USER_AGENT
                                },
                                body: JSON.stringify(r)
                            });
                            if (res.ok) {
                                count++;
                                if (count % 100 === 0) process.stdout.write('█');
                            }
                        }
                        console.log(`\n✅ Importé : ${count} / ${results.length}`);
                        resolve();
                    });
            });
        }

        console.log("\n🎊 TOUTE LA CONFIGURAITON EST IMPORTEE !");

    } catch (err) {
        console.error("ERREUR :", err.message);
    }
}

run();
