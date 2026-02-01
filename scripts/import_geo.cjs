
const PocketBase = require('pocketbase/cjs');
const https = require('https');

const fs = require('fs');
const path = require('path');

// LOAD ENV LOCAL MANUALLY
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
        console.log("Loaded .env.local");
    }
} catch (e) {
    console.log("Could not load .env.local", e);
}

// CONFIGURATION
const PB_URL = 'https://pocketbase.circumambule.synology.me/';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';


// HELPERS
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function main() {
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    try {
        console.log("Checking API health...");
        const health = await fetchJson(PB_URL + 'api/health');
        console.log("Health Check:", health);
    } catch (e) {
        console.warn("Health check failed (might be 404 if path incorrect):", e.message);
    }

    try {
        console.log(`\n🔑 Authenticating as ${ADMIN_EMAIL} (Manual Fetch)...`);

        // Manual FETCH for auth to avoid SDK 404 issues on this server
        const authRes = await fetch(`${PB_URL}api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });

        if (!authRes.ok) {
            const errBody = await authRes.text();
            throw new Error(`Auth failed with status ${authRes.status}: ${errBody}`);
        }

        const authData = await authRes.json();
        const token = authData.token;

        // Inject token into SDK
        pb.authStore.save(token, authData.admin);
        console.log("✅ Authenticated and token saved in SDK!");

    } catch (e) {
        console.error("❌ Authentication Failed (Manual Fetch).");
        console.error(`Error: ${e.message}`);
        process.exit(1);
    }

    // --- REGIONS ---
    try {
        console.log("\n🌍 Processing REGIONS...");
        let regions = await fetchJson('https://geo.api.gouv.fr/regions');
        console.log(`Found ${regions.length} regions.`);

        // Create Collection if not exists
        try {
            await pb.collections.create({
                name: 'ref_reg',
                type: 'base',
                schema: [
                    { name: 'code', type: 'text', required: true },
                    { name: 'nom', type: 'text', required: true },
                    { name: 'code_ft', type: 'text', required: false }
                ]
            });
            console.log("Created 'ref_reg' collection.");
        } catch (e) {
            // 400 means likely exists, or other error
            if (e.status !== 400) console.log("Info: 'ref_reg' collection might already exist.");
        }

        // Import
        for (const r of regions) {
            try {
                // Check exist
                const existing = await pb.collection('ref_reg').getList(1, 1, { filter: `code='${r.code}'` });
                if (existing.totalItems > 0) {
                    // update ?
                    continue;
                }
                await pb.collection('ref_reg').create({
                    code: r.code,
                    nom: r.nom,
                    code_ft: r.code // Assuming same for now
                });
                process.stdout.write('.');
            } catch (e) {
                console.error(`Error Region ${r.nom}:` + e.message);
            }
        }
        console.log("\n✅ Regions imported.");

    } catch (e) {
        console.error("Regions pipeline failed:", e);
    }

    // --- DEPARTEMENTS ---
    try {
        console.log("\n🇫🇷 Processing DEPARTEMENTS...");
        let depts = await fetchJson('https://geo.api.gouv.fr/departements');
        console.log(`Found ${depts.length} departements.`);

        // Create Collection
        try {
            await pb.collections.create({
                name: 'ref_dept',
                type: 'base',
                schema: [
                    { name: 'code', type: 'text', required: true },
                    { name: 'nom', type: 'text', required: true },
                    { name: 'code_region', type: 'text', required: true }
                ]
            });
            console.log("Created 'ref_dept' collection.");
        } catch (e) {
            if (e.status !== 400) console.log("Info: 'ref_dept' collection might already exist.");
        }

        // Import
        for (const d of depts) {
            try {
                const existing = await pb.collection('ref_dept').getList(1, 1, { filter: `code='${d.code}'` });
                if (existing.totalItems > 0) continue;

                await pb.collection('ref_dept').create({
                    code: d.code,
                    nom: d.nom,
                    code_region: d.codeRegion
                });
                process.stdout.write('.');
            } catch (e) {
                console.error(`Error Dept ${d.nom}:` + e.message);
            }
        }
        console.log("\n✅ Departements imported.");

    } catch (e) {
        console.error("Departements pipeline failed:", e);
    }

    // --- COMMUNES (INSEE) ---
    try {
        console.log("\n🏘️ Processing COMMUNES...");

        // 1. Fetch Communes
        console.log("Fetching Communes from Gouv API...");
        // Filter to keep payload lighter : code, nom, codesPostaux, codeDepartement
        const communes = await fetchJson('https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,codeDepartement');
        console.log(`Found ${communes.length} communes.`);

        // 2. Create/Check Collection
        try {
            // Create if not exists (schema update handled automatically by valid creates often, but let's ensure)
            // If collection exists, we might want to ensure fields exist.
            // We skip explicit create for now, assuming user created it or we rely on auto-schema (if allowed)
            // User said "Upload... dans ref_insee".
        } catch (e) { }

        // 3. Batch Import
        console.log("Starting Import (Batch 100)...");
        const BATCH_SIZE = 100;

        // Use a persistent loop
        for (let i = 0; i < communes.length; i += BATCH_SIZE) {
            const batch = communes.slice(i, i + BATCH_SIZE);

            // Promise.all for speed, but guarded
            await Promise.all(batch.map(async (c) => {
                try {
                    // Try create directly. If duplicates, we catch.
                    // Adapt schema:
                    // code = INSEE
                    // nom = Ville
                    // cp = Primary Postal Code
                    // dept = Dept Code

                    const data = {
                        code: c.code,
                        nom: c.nom,
                        cp: c.codesPostaux && c.codesPostaux.length > 0 ? c.codesPostaux[0] : '',
                        dept: c.codeDepartement,
                        // Custom field for search ease
                        search_text: `${c.nom} (${c.codeDepartement})`
                    };

                    // Check if exists to avoid error spam? Or just Create and catch error?
                    // "create" is faster than "getList + create".
                    // But if valid UNIQUE constraint exists on 'code', we can't create.
                    // Let's try to update or create.

                    // Note: PB doesn't have "upsert" native in one call easily for non-ID.
                    // We'll trust the user wants to FILL the DB.
                    // We will check existence only every N items or just try create.
                    // To be safe and clean:

                    // OPTIMIZATION: Just create. If 400 (validation), assume duplicate.
                    await pb.collection('ref_insee').create(data, { requestKey: null });

                } catch (err) {
                    // Ignore duplicates (validation errors)
                    if (err.status !== 400) console.error(`Err ${c.nom}: ` + err.message);
                }
            }));

            if (i % 1000 === 0) process.stdout.write(`\n${i}/${communes.length} `);
            process.stdout.write('.');
            // Small pause to breathe
            await new Promise(r => setTimeout(r, 50));
        }

        console.log("\n✅ Communes imported.");

    } catch (e) {
        console.error("Main execution failed:", e);
    }
}

main();
