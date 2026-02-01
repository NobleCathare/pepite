const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// --- CONFIGURATION ---
const FILES = {
  filtres: 'Config_Filtres.csv',
  recherche: 'Config_Recherche.csv'
};

// ⚠️⚠️ TON UID (Le patron) ⚠️⚠️
const MY_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1'; 

// Initialisation
const serviceAccount = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// --- FONCTIONS UTILITAIRES DE TYPAGE ---

// Convertit "TRUE"/"FALSE" en vrai booléen
const parseBool = (val) => {
    if (!val) return false;
    return val.toString().trim().toUpperCase() === 'TRUE';
};

// Convertit en nombre ou garde la chaîne si mixte
const parseNumber = (val) => {
    if (!val || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? val : num;
};

// Nettoie une chaîne (enlève les espaces autour)
const cleanStr = (val) => val ? val.toString().trim() : "";

// Lit un CSV et renvoie un tableau d'objets propres
const readCSV = (fileName, rowMapper) => {
  return new Promise((resolve) => {
    const results = [];
    const filePath = path.join(__dirname, fileName);
    
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Fichier introuvable : ${fileName} (Ignoré)`);
        resolve([]);
        return;
    }

    console.log(`📖 Lecture de ${fileName}...`);
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ',' })) // Séparateur virgule confirmé
      .on('data', (data) => {
         // On nettoie d'abord les clés (header)
         const cleanData = {};
         Object.keys(data).forEach(k => cleanData[k.trim()] = data[k]);

         // On applique le mapping spécifique au fichier
         const mappedRow = rowMapper(cleanData);
         if (mappedRow) results.push(mappedRow);
      })
      .on('end', () => resolve(results));
  });
};

async function importConfigsFull() {
  console.log(`🚀 Démarrage de l'IMPORT CONFIGURATION TOTAL...`);

  if (!MY_UID || MY_UID.includes('FIREBASE_ICI')) {
      console.error("❌ ERREUR : Tu as oublié de mettre ton UID !");
      process.exit(1);
  }

  // 1. MAPPING DES FILTRES
  // Colonnes: Type, Categorie, Valeur, Actif, Priorite, Raison, Date Création, Impact
  const filtersData = await readCSV(FILES.filtres, (row) => {
      // On ignore les lignes vides
      if (!row['Valeur'] && !row['Type']) return null;

      return {
          type: cleanStr(row['Type']),        // WHITELIST, BLACKLIST...
          category: cleanStr(row['Categorie']), // Titre, Entreprise...
          value: cleanStr(row['Valeur']),       // La valeur à filtrer
          isActive: parseBool(row['Actif']),
          priority: parseNumber(row['Priorite']) || 0,
          reason: cleanStr(row['Raison']),
          createdAt: cleanStr(row['Date Création']),
          impact: cleanStr(row['Impact']) || 'Normal'
      };
  });

  // 2. MAPPING DE LA RECHERCHE
  // Colonnes: Actif, Mot_Cle, Codes_ROME, Code_Lieu, Type_Lieu, Km, Contrat
  const searchData = await readCSV(FILES.recherche, (row) => {
      if (!row['Mot_Cle']) return null;

      return {
          isActive: parseBool(row['Actif']),
          keyword: cleanStr(row['Mot_Cle']),
          romeCodes: cleanStr(row['Codes_ROME']).split(',').map(s => s.trim()).filter(Boolean), // Tableau de codes
          locationCode: cleanStr(row['Code_Lieu']),
          locationType: cleanStr(row['Type_Lieu']), // france, region...
          radius: parseNumber(row['Km']) || 0,
          contractTypes: cleanStr(row['Contrat']).split(',').map(s => s.trim()).filter(Boolean) // Tableau de contrats
      };
  });

  console.log(`📊 Bilan : ${filtersData.length} Filtres | ${searchData.length} Mots-clés de recherche`);

  // 3. SAUVEGARDE ATOMIQUE
  console.log("💾 Écriture dans Firestore...");
  
  try {
    await db.collection('users').doc(MY_UID).set({
        settings: {
            filters_config: filtersData,
            search_config: searchData,
            lastUpdated: new Date(),
            configVersion: '2.0_full_import'
        }
    }, { merge: true });

    console.log(`🎉 SUCCÈS ABSOLU : Tes configurations sont en base, typées et complètes !`);
    process.exit(0);
  } catch (error) {
    console.error("❌ ERREUR FIRESTORE :", error.message);
    process.exit(1);
  }
}

importConfigsFull();