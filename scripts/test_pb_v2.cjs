const PocketBase = require('pocketbase');

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const pb = new PocketBase(PB_URL);

async function test() {
    try {
        const health = await pb.health.check();
        console.log("Health OK:", health);
    } catch (err) {
        console.log("SDK Error:", err.message);
    }
}
test();
