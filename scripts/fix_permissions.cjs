const fetch = require('node-fetch');

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TARGET_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1'; // Firebase UID used as ID

async function run() {
    console.log("🚀 Fixing Permissions (API Rules)...");

    try {
        // 1. AUTH
        const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        if (!authRes.ok) throw new Error("Auth failed");
        const { token } = await authRes.json();
        console.log("✅ Authenticated as Admin.");

        // 2. DEFINE RULES
        // Since frontend is NOT authenticated with PB (Guest), we must allow access based on ID matching.
        // For 'users': Allow viewing/updating the specific record.
        const userRules = {
            listRule: `id = '${TARGET_UID}'`,
            viewRule: `id = '${TARGET_UID}'`,
            updateRule: `id = '${TARGET_UID}'`,
            createRule: "", // Creation handled manually or by migration
            deleteRule: ""  // No delete
        };

        // For 'jobs' and configs: Allow access where ownerId matches.
        // Note: For create, we can't check ownerId easily if it's in the body unless we trust the body?
        // Actually, PB rules check the RECORD being accessed or created.
        // For createRule, '@request.data.ownerId' = TARGET_UID ensures we only create for this user.
        const resourcesRules = {
            listRule: `ownerId = '${TARGET_UID}'`,
            viewRule: `ownerId = '${TARGET_UID}'`,
            createRule: `@request.data.ownerId = '${TARGET_UID}'`,
            updateRule: `ownerId = '${TARGET_UID}'`,
            deleteRule: `ownerId = '${TARGET_UID}'`
        };

        // For Reference tables (ReadOnly for everyone is useful)
        const refRules = {
            listRule: "", // Public list? Or just for valid users? Let's make it public for simplicity implies ""? NO. "" is Locked.
            // We want PUBLIC. 
            // In PB, true or "id != ''" works.
            listRule: "id != ''",
            viewRule: "id != ''",
            createRule: "", // Admin only
            updateRule: "",
            deleteRule: ""
        };

        // 3. APPLY UPDATE
        await applyRules(token, 'users', userRules);

        await applyRules(token, 'jobs', resourcesRules);
        await applyRules(token, 'config_filters', resourcesRules);
        await applyRules(token, 'config_ia', resourcesRules);
        await applyRules(token, 'config_search', resourcesRules);

        await applyRules(token, 'ref_rome', refRules);
        await applyRules(token, 'ref_insee', refRules);
        await applyRules(token, 'ref_prenoms', refRules);

        console.log("\n🎉 All permissions fixed!");

    } catch (err) {
        console.error("❌ Fatal Error:", err);
    }
}

async function applyRules(token, collection, rules) {
    console.log(`\n🔧 Updating rules for ${collection}...`);
    try {
        // Fetch current to get ID
        const getRes = await fetch(`${PB_URL}/api/collections/${collection}`, {
            headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
        });
        if (!getRes.ok) throw new Error("Collection not found");
        const coll = await getRes.json();

        // Patch
        const patchRes = await fetch(`${PB_URL}/api/collections/${coll.id}`, {
            method: 'PATCH',
            headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify(rules)
        });

        if (patchRes.ok) console.log(`✅ ${collection} updated.`);
        else console.error(`❌ STUPID ERROR for ${collection}:`, await patchRes.text());

    } catch (e) {
        console.error(`⚠️ Failed to update ${collection}:`, e.message);
    }
}

run();
