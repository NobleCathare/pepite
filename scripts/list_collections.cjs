const PocketBase = require('pocketbase').default || require('pocketbase');
const PB_URL = 'https://pocketbase.circumambule.synology.me';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';

async function run() {
    console.log("🔍 Listing All Collections...");

    try {
        const pb = new PocketBase(PB_URL);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        // Fetch ALL collections
        const collections = await pb.collections.getFullList();

        console.log(`Found ${collections.length} collections:`);
        collections.forEach(c => {
            console.log(`- Name: [${c.name}] | ID: [${c.id}] | Type: ${c.type}`);
        });

    } catch (e) {
        console.error("❌ Error:", e.originalError || e.message);
    }
}

run();
