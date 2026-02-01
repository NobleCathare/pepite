const PocketBase = require('pocketbase').default || require('pocketbase');
const PB_URL = 'https://pocketbase.circumambule.synology.me';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';

async function run() {
    console.log("🕵️ Checking REAL User IDs...");

    try {
        const pb = new PocketBase(PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        const users = await pb.collection('users').getFullList();

        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ID: [${u.id}] | Email: ${u.email} | Name: ${u.name || u.prenom}`);
        });

    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

run();
