const admin = require('firebase-admin');

// ⚠️ TON UID
const MY_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1'; 

const serviceAccount = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function secureIA() {
  console.log(`🔒 Démarrage de la procédure SÉCURITÉ IA...`);

  // 1. Lire le profil utilisateur actuel (Potentiellement exposé)
  const userRef = db.collection('users').doc(MY_UID);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
      console.error("❌ Profil utilisateur introuvable.");
      return;
  }

  const userData = userDoc.data();
  const iaConfig = userData.settings?.ia_config;

  if (!iaConfig || iaConfig.length === 0) {
      console.log("⚠️ Aucune config IA trouvée dans le profil (Déjà sécurisé ?)");
  } else {
      console.log(`📦 ${iaConfig.length} paramètres IA récupérés depuis le profil.`);
      
      // 2. Transférer dans le COFFRE-FORT (Collection 'system_secrets')
      // On crée un document unique 'ai_core' pour centraliser l'intelligence
      const vaultRef = db.collection('system_secrets').doc('ai_core');
      
      await vaultRef.set({
          prompts: iaConfig,
          lastUpdated: new Date(),
          securityLevel: 'ADMIN_ONLY'
      });
      console.log("✅ Config IA copiée dans le coffre-fort 'system_secrets/ai_core'.");

      // 3. EFFACER du profil utilisateur (Nettoyage des traces)
      // On garde search_config et filters_config qui sont utiles au Frontend
      await userRef.update({
          'settings.ia_config': admin.firestore.FieldValue.delete()
      });
      console.log("🧹 Config IA SUPPRIMÉE du profil utilisateur (Visible par le web).");
  }

  console.log("\n🛡️ OPÉRATION TERMINÉE. Tes prompts sont maintenant invisibles pour le Frontend.");
}

secureIA();