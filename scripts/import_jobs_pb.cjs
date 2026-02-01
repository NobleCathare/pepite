const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// CONFIGURATION
const PB_URL = 'https://pocketbase.circumambule.synology.me';
const CSV_FILE = 'Annonces.csv';
const MY_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function run() {
    console.log("🚀 Lancement de l'importation COMPLETE (Toutes colonnes)...");

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

        // 1.5 Nettoyage (Vider la collection pour éviter les doublons du mode JSON précédent)
        console.log("Nettoyage de la collection...");
        // On récupère les 200 premiers pour nettoyer un peu
        const listRes = await fetch(`${PB_URL}/api/collections/jobs/records?perPage=200`, {
            headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
        });
        const listData = await listRes.json();
        if (listData.items) {
            for (const item of listData.items) {
                await fetch(`${PB_URL}/api/collections/jobs/records/${item.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
                });
            }
        }

        // 2. LECTURE CSV
        const results = [];
        const csvPath = path.join(__dirname, CSV_FILE);

        fs.createReadStream(csvPath)
            .pipe(csv({ separator: ',' }))
            .on('data', (row) => {
                const r = {};
                Object.keys(row).forEach(k => r[k.trim()] = row[k]);
                if (!r['Titre_poste'] && !r['Entreprise']) return;

                // MAPPING COMPLET
                const record = {
                    ID_Annonce: r.ID_Annonce || '',
                    Titre_poste: r.Titre_poste || '',
                    Entreprise: r.Entreprise || '',
                    Lieu: r.Lieu || '',
                    Statut: r.Statut || '',
                    Source: r.Source || '',
                    URL_offre: r.URL_offre || '',
                    URL_Entreprise: r.URL_Entreprise || '',
                    Salaire: r.Salaire || '',
                    Type_contrat: r.Type_contrat || '',
                    Description: r.Description || '',
                    Date_Publication: r.Date_Publication || '',
                    Date_Traitement: r.Date_Traitement || '',
                    Date_Envoie: r.Date_Envoie || '',
                    Gmail_ID: r.Gmail_ID || '',
                    toolCallId: r.toolCallId || '',
                    Type_Recruteur: r.Type_Recruteur || '',
                    Linkedin_Recruteur: r.Linkedin_Recruteur || '',
                    Prenom_Recruteur: r.Prenom_Recruteur || '',
                    Nom_Recruteur: r.Nom_Recruteur || '',
                    Poste_Recruteur: r.Poste_Recruteur || '',
                    Email_Recruteur: r.Email_Recruteur || '',
                    tel_recruteur: r.tel_recruteur || '',
                    CV_Doc_URL: r.CV_Doc_URL || '',
                    LM_Doc_URL: r.LM_Doc_URL || '',
                    LM_CV: r.LM_CV || '',
                    output: r.output || '',
                    mot_cle: r.mot_cle || '',
                    Mot_cle_source: r.Mot_cle_source || '',
                    data_pour_agent_redacteur: r.data_pour_agent_redacteur || '',
                    CV_Texte_Adapte: r.CV_Texte_Adapte || '',
                    LM_Texte: r.LM_Texte || '',
                    Message_Contact: r.Message_Contact || '',
                    titre_ATS: r.titre_ATS || '',
                    score_ATS: r.score_ATS || '',
                    remarque_ATS: r.remarque_ATS || '',
                    mots_cle_ATS: r.mots_cle_ATS || '',
                    score_interne: r._score || '',
                    score_details: r._score_details ? {} : {}, // Simple JSON vide si pas parsable
                    Score_a_traiter: r.Score_a_traiter || '',
                    Action_Requise: r.Action_Requise || '',
                    Suivi_mail: r.Suivi_mail || '',
                    Suivi_calendrier: r.Suivi_calendrier || '',
                    Suivi_note: r.Suivi_note || '',
                    LM_Erreur: r.LM_Erreur || '',
                    ownerId: MY_UID,
                    data: {} // On peut laisser vide maintenant
                };
                results.push(record);
            })
            .on('end', async () => {
                console.log(`📦 ${results.length} lignes prêtes. Importation...`);

                let count = 0;
                for (const record of results) {
                    try {
                        const res = await fetch(`${PB_URL}/api/collections/jobs/records`, {
                            method: 'POST',
                            headers: {
                                'Authorization': token,
                                'Content-Type': 'application/json',
                                'User-Agent': USER_AGENT
                            },
                            body: JSON.stringify(record)
                        });

                        if (res.ok) {
                            count++;
                            if (count % 50 === 0) process.stdout.write('█');
                        } else {
                            if (count === 0) {
                                const err = await res.json();
                                console.error("\n❌ Erreur Validation:", JSON.stringify(err.data, null, 2));
                            }
                        }
                    } catch (e) {
                        // Ignorer les micro-erreurs de réseau
                    }
                }
                console.log(`\n✅ TERMINE : ${count} jobs importés avec toutes les colonnes.`);
            });

    } catch (err) {
        console.error("ERREUR FATALE :", err.message);
    }
}

run();
