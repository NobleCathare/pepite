const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const TARGET_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1';

async function inspectUser() {
    const docRef = db.collection('users').doc(TARGET_UID);
    const doc = await docRef.get();

    if (!doc.exists) {
        console.log("❌ User document does not exist for UID:", TARGET_UID);
        // Try listing all users to see what's there
        const snapshot = await db.collection('users').limit(5).get();
        if (snapshot.empty) {
            console.log("❌ 'users' collection is empty.");
        } else {
            console.log("ℹ️ Found other users:");
            snapshot.forEach(d => console.log(`- ${d.id}`));
        }
        return;
    }

    console.log("--- RAW FIRESTORE USER DOC ---");
    console.log(JSON.stringify(doc.data(), null, 2));
}

inspectUser();
