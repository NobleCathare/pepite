const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// --- CONFIGURATION ---
const CSV_FILE = 'Annonces.csv';
const TARGET_COLLECTION = 'jobs';
// ⚠️ TON UID
const MY_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1'; 

const serviceAccount = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// Outils
const clean = (val) => val ? val.toString().trim() : null;

// Générateur d'ID unique de secours (si ID_Annonce est vide)
const generateId = (titre, entreprise) => {
    const raw = `${titre}_${entreprise}`;
    return raw.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
};

const safeDate = (dateString) => {
    if (!dateString) return null;
    let d = new Date(dateString);
    if (!isNaN(d.getTime())) return d;
    const parts = dateString.split('/');
    if (parts.length === 3) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
};

async function importTotal() {
  console.log("🚀 Démarrage Import Annonces - MODE ANTI-DOUBLON...");
  const results = [];

  fs.createReadStream(path.join(__dirname, CSV_FILE))
    .pipe(csv({ separator: ',' })) 
    .on('data', (row) => {
        const r = {}; 
        Object.keys(row).forEach(k => r[k.trim()] = row[k]);

        if (!r['Titre_poste'] && !r['Entreprise']) return;

        const job = {
            ownerId: MY_UID,
            
            // 1. IDENTIFIANT & TECH
            tech: {
                id_annonce: clean(r['ID_Annonce']),
                gmail_id: clean(r['Gmail_ID']),
                tool_call_id: clean(r['toolCallId']),
                no_new_jobs_flag: clean(r['_no_new_jobs'])
            },

            // 2. OFFRE
            title: clean(r['Titre_poste']),
            company: clean(r['Entreprise']),
            location: clean(r['Lieu']),
            salary: clean(r['Salaire']),
            contract_type: clean(r['Type_contrat']),
            description: clean(r['Description']),
            url_offer: clean(r['URL_offre']),
            url_company: clean(r['URL_Entreprise']),
            source: clean(r['Source']),
            
            // 3. STATUT & DATES
            status: clean(r['Statut']), 
            dates: {
                published: safeDate(r['Date_Publication']),
                processed: safeDate(r['Date_Traitement']),
                sent: safeDate(r['Date_Envoie']),
                created: safeDate(r['Date_Publication'] || r['Date_Traitement']) || new Date(),
                updated: new Date()
            },

            // 4. RECRUTEUR
            recruiter: {
                type: clean(r['Type_Recruteur']),
                linkedin: clean(r['Linkedin_Recruteur']),
                fullName: `${clean(r['Prenom_Recruteur'])||''} ${clean(r['Nom_Recruteur'])||''}`.trim(),
                role: clean(r['Poste_Recruteur']),
                email: clean(r['Email_Recruteur']),
                phone: clean(r['tel_recruteur'])
            },

            // 5. DOCUMENTS
            documents: {
                cvUrl: clean(r['CV_Doc_URL']),
                lmUrl: clean(r['LM_Doc_URL']),
                lmPdfUrl: clean(r['LM_CV'])
            },

            // 6. IA OUTPUT
            ia: {
                analysis: clean(r['output']),
                keywords: clean(r['mot_cle']),
                source_keyword: clean(r['Mot_cle_source']),
                redaction_data: clean(r['data_pour_agent_redacteur']),
                generatedCV: clean(r['CV_Texte_Adapte']),
                generatedLM: clean(r['LM_Texte']),
                contactMessage: clean(r['Message_Contact'])
            },

            // 7. SCORING
            scoring: {
                atsTitle: clean(r['titre_ATS']),
                atsScore: clean(r['score_ATS']),
                atsRemarks: clean(r['remarque_ATS']),
                atsKeywords: clean(r['mots_cle_ATS']),
                internalScore: clean(r['_score']),
                internalScoreDetails: clean(r['_score_details']),
                scoreToProcess: clean(r['Score_a_traiter'])
            },

            // 8. SUIVI
            tracking: {
                actionRequired: clean(r['Action_Requise']),
                emailThread: clean(r['Suivi_mail']),
                calendar: clean(r['Suivi_calendrier']),
                notes: clean(r['Suivi_note']),
                errorLog: clean(r['LM_Erreur'])
            }
        };

        job.createdAt = job.dates.created;
        results.push(job);
    })
    .on('end', async () => {
      console.log(`📦 ${results.length} annonces prêtes. Écriture IDEMPOTENTE...`);
      
      const batchSize = 400;
      let batch = db.batch();
      let count = 0;

      for (const job of results) {
        // --- LA CORRECTION EST ICI ---
        // On utilise l'ID du CSV comme ID du document Firestore.
        // Si pas d'ID CSV, on en génère un unique basé sur Titre+Entreprise.
        let docId = job.tech.id_annonce;
        if (!docId || docId === 'null') {
             docId = generateId(job.title, job.company);
        }

        const docRef = db.collection(TARGET_COLLECTION).doc(docId);
        // -----------------------------

        batch.set(docRef, job);
        count++;
        if (count % batchSize === 0) {
            await batch.commit();
            process.stdout.write('█');
            batch = db.batch();
        }
      }
      await batch.commit();
      console.log(`\n✅ MIGRATION TERMINÉE : ${count} annonces uniques.`);
    });
}

importTotal();