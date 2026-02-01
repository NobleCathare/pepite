const PocketBase = require('pocketbase/cjs');

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const pb = new PocketBase(PB_URL);

async function test() {
    console.log("Testing connection to:", PB_URL);
    try {
        const health = await pb.health.check();
        console.log("Health Check OK:", health);

        console.log("Attempting Admin Login...");
        // On teste les deux méthodes
        try {
            const authData = await pb.admins.authWithPassword('test@test.com', 'testtesttest');
            console.log("Admin Login OK (via .admins)");
        } catch (e1) {
            console.log("Admin Login Failed (via .admins):", e1.message);
            console.log("Attempting Superuser Login...");
            const authData = await pb.collection('_superusers').authWithPassword('test@test.com', 'testtesttest');
            console.log("Superuser Login OK (via _superusers)");
        }
    } catch (err) {
        console.error("Test Failed:", err.message);
        if (err.originalError) console.error("Details:", err.originalError);
    }
}

test();
