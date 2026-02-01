const PocketBase = require('pocketbase');
// Si c'est un module ESM importé en CJS, c'est souvent dans .default
const PB = PocketBase.default || PocketBase;

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const pb = new PB(PB_URL);

async function test() {
    try {
        const health = await pb.health.check();
        console.log("Health OK:", health);

        console.log("Testing Admin Login...");
        try {
            await pb.admins.authWithPassword('test@test.com', 'testtesttest');
            console.log("Admin Login OK");
        } catch (e) {
            console.log("Admin Login Error:", e.message);
            console.log("Testing Superuser Collection Login...");
            try {
                await pb.collection('_superusers').authWithPassword('test@test.com', 'testtesttest');
                console.log("Superuser Collection Login OK");
            } catch (e2) {
                console.log("Superuser Collection Login Error:", e2.message);
            }
        }
    } catch (err) {
        console.log("SDK Error:", err.message);
    }
}
test();
