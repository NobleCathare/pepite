const fetch = require('node-fetch');

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function run() {
    console.log("🚀 Checking and updating 'users' collection schema...");

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
        let schema = collection.schema;
        let modified = false;

        // 3. DEFINE REQUIRED FIELDS
        // Based on user request: prenom, nom, telephone, cp, ville, linkedin_url, qr_code_base64
        const requiredFields = [
            { name: 'prenom', type: 'text' },
            { name: 'nom', type: 'text' },
            { name: 'telephone', type: 'text' },
            { name: 'cp', type: 'text' },
            { name: 'ville', type: 'text' },
            { name: 'linkedin_url', type: 'url' },
            { name: 'qr_code_base64', type: 'text' } // Large text for base64
        ];

        // 4. CHECK AND ADD MISSING FIELDS
        for (const field of requiredFields) {
            const exists = schema.find(f => f.name === field.name);
            if (!exists) {
                console.log(`➕ Adding missing field: ${field.name} (${field.type})`);
                schema.push({
                    name: field.name,
                    type: field.type,
                    required: false,
                    presentable: false,
                    system: false
                });
                modified = true;
            } else {
                console.log(`✅ Field already exists: ${field.name}`);
            }
        }

        // 5. UPDATE SCHEMA IF MODIFIED
        if (modified) {
            console.log("💾 Saving schema updates...");
            const updateRes = await fetch(`${PB_URL}/api/collections/users`, {
                method: 'PATCH',
                headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
                body: JSON.stringify({ schema: schema })
            });

            if (!updateRes.ok) {
                console.error("❌ Failed to update schema:", await updateRes.text());
            } else {
                console.log("✅ Schema successfully updated.");
            }
        } else {
            console.log("✨ No changes needed. Schema is up to date.");
        }

    } catch (err) {
        console.error("❌ Error:", err);
    }
}

run();
