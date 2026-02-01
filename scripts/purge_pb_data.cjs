const fs = require('fs');

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';

const TARGETS = [
    { collection: 'config_filters', field: 'Type', value: 'N/A' },
    { collection: 'jobs', field: 'ID_Annonce', value: 'N/A' },
    { collection: 'ref_insee', field: 'Code_INSEE', value: 'N/A' },
    { collection: 'ref_prenoms', field: 'Prenom', value: 'N/A' },
    { collection: 'ref_rome', field: 'Code_Rome', value: 'N/A' }
];

async function run() {
    console.log("🚀 Lancement du nettoyage de la base de données...");

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

        for (const target of TARGETS) {
            console.log(`\n🧹 Nettoyage de ${target.collection} (${target.field} == "${target.value}")...`);

            let deletedCount = 0;
            let hasMore = true;

            while (hasMore) {
                // On cherche les records correspondants (par lot de 100)
                const filter = `${target.field} = "${target.value}"`;
                const listRes = await fetch(`${PB_URL}/api/collections/${target.collection}/records?filter=${encodeURIComponent(filter)}&perPage=100`, {
                    headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
                });

                if (!listRes.ok) {
                    const err = await listRes.json();
                    console.error(`❌ Erreur lors de la recherche dans ${target.collection}:`, err.message);
                    break;
                }

                const data = await listRes.json();
                if (data.items.length === 0) {
                    hasMore = false;
                    break;
                }

                console.log(`   Suppression de ${data.items.length} records...`);
                for (const item of data.items) {
                    const delRes = await fetch(`${PB_URL}/api/collections/${target.collection}/records/${item.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
                    });
                    if (delRes.ok) deletedCount++;
                    if (deletedCount % 20 === 0) process.stdout.write('█');
                }

                // Si on a moins que le perPage, c'était le dernier lot
                if (data.items.length < 100) hasMore = false;
            }

            console.log(`\n✅ Terminé pour ${target.collection} : ${deletedCount} records supprimés.`);
        }

        console.log("\n🎊 NETTOYAGE TERMINÉ !");

    } catch (err) {
        console.error("ERREUR FATALE :", err.message);
    }
}

run();
