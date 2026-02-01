const PocketBase = require('pocketbase/cjs');

async function testAuth() {
    const pb = new PocketBase('https://pocketbase.circumambule.synology.me/');
    const email = 'n8n@circumambule.test';
    const pass = '15Milliards!';

    console.log("--- PB AUTH DISCOVERY ---");

    // Test 1: Admins (Legacy)
    try {
        console.log("Test 1: pb.admins.authWithPassword...");
        await pb.admins.authWithPassword(email, pass);
        console.log("✅ SUCCESS: Legacy Admin method worked.");
        return;
    } catch (e) {
        console.log(`❌ FAILED: Status ${e.status}, Message: ${e.message}`);
    }

    // Test 2: Superusers (New)
    try {
        console.log("Test 2: pb.collection('_superusers').authWithPassword...");
        await pb.collection('_superusers').authWithPassword(email, pass);
        console.log("✅ SUCCESS: Superuser collection method worked.");
        return;
    } catch (e) {
        console.log(`❌ FAILED: Status ${e.status}, Message: ${e.message}`);
    }

    // Test 3: Users
    try {
        console.log("Test 3: pb.collection('users').authWithPassword...");
        await pb.collection('users').authWithPassword(email, pass);
        console.log("✅ SUCCESS: Regular User collection worked.");
    } catch (e) {
        console.log(`❌ FAILED: Status ${e.status}, Message: ${e.message}`);
    }
}

testAuth();
