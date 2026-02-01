const fetch = require('node-fetch');

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function run() {
    console.log("🚀 Adding 'avatarUrl' field to users collection...");

    try {
        // 1. AUTHENTICATION
        const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });

        if (!authRes.ok) throw new Error("Auth failed");
        const { token } = await authRes.json();
        console.log("✅ Authenticated.");

        // 2. GET CURRENT SCHEMA
        const collRes = await fetch(`${PB_URL}/api/collections/users`, {
            headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
        });

        if (!collRes.ok) throw new Error("Failed to fetch users collection");
        const collection = await collRes.json();

        // 3. CHECK IF EXISTS
        const exists = collection.schema.find(f => f.name === 'avatarUrl');
        if (exists) {
            console.log("✅ 'avatarUrl' field already exists.");
            return;
        }

        // 4. UPDATE SCHEMA
        const newSchema = [
            ...collection.schema,
            { name: 'avatarUrl', type: 'url', required: false, presentable: false }
        ];

        const updateRes = await fetch(`${PB_URL}/api/collections/users`, {
            method: 'PATCH',
            headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ schema: newSchema })
        });

        if (!updateRes.ok) {
            console.error("Failed to update schema:", await updateRes.text());
        } else {
            console.log("✅ Schema updated with 'avatarUrl'.");
        }

    } catch (err) {
        console.error("❌ Error:", err);
    }
}

run();
