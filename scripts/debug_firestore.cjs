const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function inspectDoc() {
    // Get 1 document
    const snapshot = await db.collection('jobs').limit(1).get();
    if (snapshot.empty) {
        console.log("No ID found");
        return;
    }
    const doc = snapshot.docs[0];
    console.log("--- RAW FIRESTORE DOC ---");
    console.log(JSON.stringify(doc.data(), null, 2));
}

inspectDoc();
