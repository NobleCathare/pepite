const PocketBase = require('pocketbase').default || require('pocketbase');
const PB_URL = 'https://pocketbase.circumambule.synology.me';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';

async function run() {
    console.log("🔓 Forcing OPEN Read Permissions...");

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

    // Helper to find collection by name
    const findCollectionId = async (nameOrId) => {
        try {
            // Try as ID first
            return (await pb.collections.getOne(nameOrId)).id;
        } catch {
            // Try find by name using getList (Admin API)
            try {
                const list = await pb.collections.getList(1, 1, { filter: `name="${nameOrId}"` });
                if (list.items.length > 0) {
                    return list.items[0].id;
                }
                throw new Error("Not found");
            } catch (e) {
                console.error(`❌ Collection '${nameOrId}' not found.`);
                return null;
            }
        }
    };

    // 1. Users
    const usersId = await findCollectionId('users');
    if (usersId) {
        // Unlock EVERYTHING for debugging/single-user mode
        await pb.collections.update(usersId, {
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: ""
        });
        console.log(`✅ Users (${usersId}): ALL PUBLIC (Read/Write)`);
    }

    // 2. Config Search
    const searchId = await findCollectionId('config_search');
    if (searchId) {
        await pb.collections.update(searchId, {
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: ""
        });
        console.log(`✅ Search (${searchId}): ALL PUBLIC (Read/Write)`);
    }

    // 3. Config Filters
    const filterId = await findCollectionId('config_filters');
    if (filterId) {
        await pb.collections.update(filterId, {
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: ""
        });
        console.log(`✅ Filters (${filterId}): ALL PUBLIC (Read/Write)`);
    }

    console.log("🚀 Done. Browser 404 should be gone.");
}

run();
