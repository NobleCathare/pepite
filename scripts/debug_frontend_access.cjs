const PocketBase = require('pocketbase').default || require('pocketbase'); // Handle ESM/CJS
const fetch = require('node-fetch');

// Polyfill fetch for Node environment if needed (PB SDK uses native fetch usually)
if (!global.fetch) {
    global.fetch = fetch;
    global.Headers = fetch.Headers;
    global.Request = fetch.Request;
    global.Response = fetch.Response;
}

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const TARGET_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1';

async function run() {
    console.log("🚀 Debugging Frontend Access (Unauthenticated Client)...");

    // 1. Init Client (No Admin Auth)
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    try {
        // A. Try to Fetch User
        console.log(`\n👤 Fetching User ${TARGET_UID}...`);
        try {
            const user = await pb.collection('users').getOne(TARGET_UID);
            console.log("✅ User Fetch Success:", user.id, user.email);
        } catch (err) {
            console.error("❌ User Fetch Failed:", err.status, err.message);
        }

        // B. Try to Update User (Simulate Profile Save)
        console.log(`\n💾 Updating User ${TARGET_UID}...`);
        try {
            const update = await pb.collection('users').update(TARGET_UID, {
                ville: "TEST_VILLE_" + Date.now()
            });
            console.log("✅ User Update Success:", update.ville);
        } catch (err) {
            console.error("❌ User Update Failed:", err.status, err.response);
        }

        // C. Try to Fetch Search Config
        console.log(`\n🔍 Fetching Config Search (ownerId = ${TARGET_UID})...`);
        try {
            const search = await pb.collection('config_search').getFullList({
                filter: `ownerId = '${TARGET_UID}'`
            });
            console.log(`✅ Search Fetch Success: Found ${search.length} items`);
            if (search.length > 0) console.log("   Item 1:", search[0]);
        } catch (err) {
            console.error("❌ Search Fetch Failed:", err.status, err.message);
        }

        // D. Try to Fetch Visual Filters
        console.log(`\n🎨 Fetching Config Filters (ownerId = ${TARGET_UID})...`);
        try {
            const filters = await pb.collection('config_filters').getFullList({
                filter: `ownerId = '${TARGET_UID}'`
            });
            console.log(`✅ Filters Fetch Success: Found ${filters.length} items`);
        } catch (err) {
            console.error("❌ Filters Fetch Failed:", err.status, err.message);
        }

    } catch (err) {
        console.error("💥 Fatal Error:", err);
    }
}

run();
