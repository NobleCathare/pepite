const PB_URL = 'https://pocketbase.circumambule.synology.me';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function run() {
    console.log("🚀 Mise à jour du schéma PocketBase...");

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

        // 2. RECUPERER LA COLLECTION EXISTANTE
        const collectionsRes = await fetch(`${PB_URL}/api/collections/jobs`, {
            headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
        });
        if (!collectionsRes.ok) throw new Error("Collection 'jobs' non trouvée");
        const collection = await collectionsRes.json();
        const collectionId = collection.id;

        // 3. DEFINIR LE NOUVEAU SCHEMA
        // On garde "data" au cas où, + tous les nouveaux champs
        const newSchema = [
            { name: "ID_Annonce", type: "text" },
            { name: "Titre_poste", type: "text" },
            { name: "Entreprise", type: "text" },
            { name: "Lieu", type: "text" },
            { name: "Statut", type: "text" },
            { name: "Source", type: "text" },
            { name: "URL_offre", type: "url" },
            { name: "URL_Entreprise", type: "url" },
            { name: "Salaire", type: "text" },
            { name: "Type_contrat", type: "text" },
            { name: "Description", type: "editor" },
            { name: "Date_Publication", type: "text" },
            { name: "Date_Traitement", type: "text" },
            { name: "Date_Envoie", "type": "text" },
            { name: "Gmail_ID", "type": "text" },
            { name: "toolCallId", "type": "text" },
            { name: "Type_Recruteur", "type": "text" },
            { name: "Linkedin_Recruteur", "type": "url" },
            { name: "Prenom_Recruteur", "type": "text" },
            { name: "Nom_Recruteur", "type": "text" },
            { name: "Poste_Recruteur", "type": "text" },
            { name: "Email_Recruteur", "type": "text" },
            { name: "tel_recruteur", "type": "text" },
            { name: "CV_Doc_URL", "type": "url" },
            { name: "LM_Doc_URL", "type": "url" },
            { name: "LM_CV", "type": "text" },
            { name: "output", "type": "editor" },
            { name: "mot_cle", "type": "text" },
            { name: "Mot_cle_source", "type": "text" },
            { name: "data_pour_agent_redacteur", "type": "editor" },
            { name: "CV_Texte_Adapte", "type": "editor" },
            { name: "LM_Texte", "type": "editor" },
            { name: "Message_Contact", "type": "editor" },
            { name: "titre_ATS", "type": "text" },
            { name: "score_ATS", "type": "text" },
            { name: "remarque_ATS", "type": "editor" },
            { name: "mots_cle_ATS", "type": "text" },
            { name: "score_interne", "type": "text" }, // ex- _score
            { name: "score_details", "type": "json", "options": { "maxSize": 2000000 } }, // ex- _score_details
            { name: "Score_a_traiter", "type": "text" },
            { name: "Action_Requise", "type": "text" },
            { name: "Suivi_mail", "type": "text" },
            { name: "Suivi_calendrier", "type": "text" },
            { name: "Suivi_note", "type": "editor" },
            { name: "LM_Erreur", "type": "text" },
            { name: "ownerId", "type": "text" },
            { name: "data", "type": "json", "options": { "maxSize": 2000000 } }
        ];

        // 4. METTRE À JOUR LE SCHEMA VIA API
        console.log("Envoi de la mise à jour du schéma...");
        const updateRes = await fetch(`${PB_URL}/api/collections/${collectionId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
                'User-Agent': USER_AGENT
            },
            body: JSON.stringify({ schema: newSchema })
        });

        if (updateRes.ok) {
            console.log("✅ Schéma mis à jour avec succès !");
        } else {
            const err = await updateRes.json();
            console.error("❌ Échec de la mise à jour :", JSON.stringify(err, null, 2));
        }

    } catch (err) {
        console.error("ERREUR FATALE :", err.message);
    }
}

run();
