const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TARGET_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';

async function run() {
    console.log("🚀 Début du raffinage COMPLET de la BDD...");

    try {
        // 1. AUTHENTICATION
        const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        if (!authRes.ok) throw new Error("Auth failed");
        const { token } = await authRes.json();
        console.log("✅ Authentifié.");

        // 2. UTILISATEUR
        await manageUser(token);

        // 3. SCHEMAS & IMPORTS
        // CONFIG FILTERS
        await updateSchema(token, 'config_filters', [
            { name: 'Type', type: 'text' },
            { name: 'Categorie', type: 'text' },
            { name: 'Valeur', type: 'text' },
            { name: 'Actif', type: 'text' },
            { name: 'Impact', type: 'text' },
            { name: 'Poids', type: 'text' },
            { name: 'ownerId', type: 'text' }
        ]);
        await importCSV('Config_Filtres.csv', 'config_filters', token, (row) => ({
            Type: row.Type,
            Categorie: row.Categorie,
            Valeur: row.Valeur,
            Actif: row.Actif,
            Impact: row.Impact,
            Poids: row.Priorite || row.Poids, // On mappe Priorite vers Poids
            ownerId: TARGET_UID
        }));

        // CONFIG IA
        await updateSchema(token, 'config_ia', [
            { name: 'Agent', type: 'text' },
            { name: 'Parametre', type: 'text' },
            { name: 'Valeur', type: 'editor' },
            { name: 'ownerId', type: 'text' }
        ]);
        await importCSV('Config_IA.csv', 'config_ia', token, (row) => ({
            Agent: row.Agent,
            Parametre: row.Parametre,
            Valeur: row.Valeur,
            ownerId: TARGET_UID
        }));

        // CONFIG SEARCH
        await updateSchema(token, 'config_search', [
            { name: 'Actif', type: 'text' },
            { name: 'Mot_Cle', type: 'text' },
            { name: 'Codes_ROME', type: 'text' },
            { name: 'Lieu', type: 'text' },
            { name: 'Rayon', type: 'text' },
            { name: 'Contrat', type: 'text' },
            { name: 'Experience', type: 'text' },
            { name: 'ownerId', type: 'text' }
        ]);
        await importCSV('Config_Recherche.csv', 'config_search', token, (row) => ({
            Actif: row.Actif,
            Mot_Cle: row.Mot_Cle,
            Codes_ROME: row.Codes_ROME,
            Lieu: row.Code_Lieu || row.Lieu,
            Rayon: row.Km || row.Rayon,
            Contrat: row.Contrat,
            Experience: row.Experience,
            ownerId: TARGET_UID
        }));

        // REF ROME
        await updateSchema(token, 'ref_rome', [
            { name: 'Code_Rome', type: 'text' },
            { name: 'Intitule_Rome', type: 'text' }
        ]);
        // Correction Mapping : Rome (CSV) -> Code_Rome (PB), Intitule_Rome (CSV) -> Intitule_Rome (PB)
        await importCSV('ROME.csv', 'ref_rome', token, (row) => {
            const intitule = row['Intitule_Rome'] || row['IntitulÃ© Rome'] || row['Intitulé Rome'] || row['Rome'];
            return {
                Code_Rome: row['Rome'] || row['FAP_2021'],
                Intitule_Rome: intitule
            };
        });

        // REF INSEE
        await updateSchema(token, 'ref_insee', [
            { name: 'Code_INSEE', type: 'text' },
            { name: 'Code_Postal', type: 'text' },
            { name: 'Commune', type: 'text' },
            { name: 'Departement', type: 'text' }
        ]);
        await importCSV('INSEE.csv', 'ref_insee', token, (row) => ({
            Code_INSEE: row['Code INSEE'] || row['Code_INSEE'],
            Code_Postal: row['Code Postal'] || row['Code_Postal'],
            Commune: row['Commune'] || row['Description'] || '',
            Departement: row['Departement'] || ''
        }));

        // REF PRENOMS
        await updateSchema(token, 'ref_prenoms', [
            { name: 'Sexe', type: 'text' },
            { name: 'Prenom', type: 'text' }
        ]);
        await importCSV('Prénoms.csv', 'ref_prenoms', token, (row) => ({
            Sexe: row.Sexe,
            Prenom: row.Prenom
        }));

        console.log("\n🎊 TOUTE LA BASE EST GARNIE ET RAFFINEE !");

    } catch (err) {
        console.error("ERREUR FATALE :", err.message);
    }
}

async function manageUser(token) {
    console.log(`\n👤 Gestion de l'utilisateur ${TARGET_UID}...`);
    const res = await fetch(`${PB_URL}/api/collections/users/records/${TARGET_UID}`, {
        headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
    });
    if (res.status === 404) {
        const create = await fetch(`${PB_URL}/api/collections/users/records`, {
            method: 'POST',
            headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({
                id: TARGET_UID,
                username: 'user_pepite',
                email: 'user@pepite.me',
                name: 'Utilisateur Pépite',
                emailVisibility: true
            })
        });
        if (create.ok) console.log("✅ Créé.");
        else console.log("❌ Erreur création:", await create.text());
    } else {
        console.log("✅ Déjà présent.");
    }
}

async function updateSchema(token, name, schema) {
    console.log(`🔧 Schema ${name}...`);
    const collRes = await fetch(`${PB_URL}/api/collections/${name}`, {
        headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
    });
    if (collRes.ok) {
        const coll = await collRes.json();
        await fetch(`${PB_URL}/api/collections/${coll.id}`, {
            method: 'PATCH',
            headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ schema })
        });
    } else {
        await fetch(`${PB_URL}/api/collections`, {
            method: 'POST',
            headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ name, type: 'base', schema, listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '' })
        });
    }
}

async function importCSV(fileName, collName, token, mapper) {
    console.log(`📥 Import ${fileName} -> ${collName}...`);
    const csvPath = path.join(__dirname, fileName);
    if (!fs.existsSync(csvPath)) return console.log("⚠️ Skip: Absent.");

    // Nettoyage complet
    const listRes = await fetch(`${PB_URL}/api/collections/${collName}/records?perPage=1`, {
        headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
    });
    const listData = await listRes.json();
    if (listData.totalItems > 0) {
        // Trop de records à supprimer un par un si on veut aller vite. 
        // On assume que le script est lancé sur une base propre ou on accepte les doublons si pas d'ID unique.
        // Mais pour config, on nettoie.
        if (collName.startsWith('config')) {
            const all = await fetch(`${PB_URL}/api/collections/${collName}/records?perPage=500`, {
                headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
            });
            const d = await all.json();
            for (const i of d.items) {
                await fetch(`${PB_URL}/api/collections/${collName}/records/${i.id}`, { method: 'DELETE', headers: { 'Authorization': token, 'User-Agent': USER_AGENT } });
            }
        }
    }

    const results = [];
    return new Promise(resolve => {
        fs.createReadStream(csvPath)
            .pipe(csv({ separator: ',' }))
            .on('data', row => results.push(mapper(row)))
            .on('end', async () => {
                console.log(`📦 Envoi de ${results.length} lignes...`);
                let count = 0;
                for (const r of results) {
                    const res = await fetch(`${PB_URL}/api/collections/${collName}/records`, {
                        method: 'POST',
                        headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
                        body: JSON.stringify(r)
                    });
                    if (res.ok) count++;
                    if (count % 100 === 0) process.stdout.write('█');
                    if (count % 1000 === 0) console.log(` (${count}/${results.length})`);
                }
                console.log(`\n✅ Terminé: ${count}/${results.length}\n`);
                resolve();
            });
    });
}

run();
