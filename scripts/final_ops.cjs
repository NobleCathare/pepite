const PB_URL = 'https://pocketbase.circumambule.synology.me';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';

// UID Firebase long
const FB_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1';
// ID PocketBase compatible (exactement 15 chars)
const PB_ID = FB_UID.substring(0, 15);

const PURGE_TARGETS = [
    { coll: 'config_filters', field: 'Type' },
    { coll: 'jobs', field: 'ID_Annonce' },
    { coll: 'ref_insee', field: 'Code_INSEE' },
    { coll: 'ref_prenoms', field: 'Prenom' },
    { coll: 'ref_rome', field: 'Code_Rome' }
];

async function run() {
    console.log("🚀 Opération de Finalisation de la BDD...");

    try {
        // 1. AUTH
        const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        const { token } = await authRes.json();
        console.log("✅ Authentifié.");

        // 2. SCHEMA USER (Ajout uid_firebase)
        console.log("Mise à jour du schéma Users...");
        const userCollRes = await fetch(`${PB_URL}/api/collections/users`, {
            headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
        });
        const userColl = await userCollRes.json();
        const userSchema = userColl.schema;
        if (!userSchema.find(f => f.name === 'uid_firebase')) {
            userSchema.push({ name: 'uid_firebase', type: 'text' });
            await fetch(`${PB_URL}/api/collections/${userColl.id}`, {
                method: 'PATCH',
                headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
                body: JSON.stringify({ schema: userSchema })
            });
            console.log("✅ Champ 'uid_firebase' ajouté.");
        }

        // 3. CREATE USER
        console.log(`Création de l'utilisateur (ID: ${PB_ID})...`);
        const createRes = await fetch(`${PB_URL}/api/collections/users/records`, {
            method: 'POST',
            headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({
                id: PB_ID,
                uid_firebase: FB_UID,
                username: 'user_pepite',
                email: 'user@pepite.me',
                password: 'Password123!',
                passwordConfirm: 'Password123!',
                name: 'Utilisateur Pépite'
            })
        });
        if (createRes.ok) console.log("✅ Utilisateur créé.");
        else if (createRes.status === 400) console.log("ℹ️ L'utilisateur semble déjà exister (ou erreur de validation).");
        else console.log("❌ Erreur creation:", await createRes.text());

        // 4. PURGE N/A ET VIDES
        for (const target of PURGE_TARGETS) {
            console.log(`\n🧹 Purge de ${target.coll} (${target.field} == "N/A" ou vide)...`);

            // Suppression des "N/A"
            await purge(token, target.coll, `${target.field} = "N/A"`);
            // Suppression des vides
            await purge(token, target.coll, `${target.field} = ""`);
        }

        console.log("\n🎊 BDD PRÊTE ET PROPRE !");

    } catch (err) { console.error("FATAL:", err); }
}

async function purge(token, collection, filter) {
    let deleted = 0;
    while (true) {
        const res = await fetch(`${PB_URL}/api/collections/${collection}/records?filter=${encodeURIComponent(filter)}&perPage=100`, {
            headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
        });
        const data = await res.json();
        if (!data.items || data.items.length === 0) break;

        for (const item of data.items) {
            await fetch(`${PB_URL}/api/collections/${collection}/records/${item.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
            });
            deleted++;
            if (deleted % 20 === 0) process.stdout.write('█');
        }
    }
    if (deleted > 0) console.log(`\n   Supprimés [${filter}]: ${deleted}`);
}

run();
