/**
 * sync_rss.cjs - Synchronisation Native des Flux RSS
 * Version: 1.0
 */

const PB_URL = 'https://pocketbase.circumambule.synology.me';
const ADMIN_EMAIL = 'n8n@circumambule.test';
const ADMIN_PASS = '15Milliards!';
const OWNER_ID = 'oyIrfuuqjuXzcZq';

const FEEDS = [
    {
        name: "Ministère de l'Intérieur",
        url: "https://ministereinterieur-career.talent-soft.com/handlers/offerRss.ashx?lcid=1036&Rss_GeographicalArea=22,24&Rss_JobFamily=3228,3235,3236&Rss_Profile=3572,3827&Rss_JobDescription_CustomCodeTableValue1=1934,1935",
        source: "RSS Min. Int."
    }
];

// Utils portés de jobLogic.js (version CJS)
function simpleHash(str) {
    let hash = 0;
    if (!str || str.length === 0) return '0';
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(16);
}

function cleanText(text) {
    if (!text) return 'N/A';
    return text.toString()
        .replace(/<[^>]*>/g, ' ')
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function run() {
    console.log("🚀 Lancement de la synchronisation RSS...");

    try {
        // 1. AUTHENTICATION PB
        const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        if (!authRes.ok) throw new Error("Auth PB failed");
        const { token } = await authRes.json();
        console.log("✅ Connecté à PocketBase.");

        for (const feed of FEEDS) {
            console.log(`\n📡 Traitement du flux : ${feed.name}...`);
            const rssRes = await fetch(feed.url);
            if (!rssRes.ok) {
                console.error(`❌ Erreur chargement flux: ${rssRes.statusText}`);
                continue;
            }
            const xml = await rssRes.text();

            // Parsing basique sans dépendance externe (Regex pour <item>)
            const itemRegex = /<item>([\s\S]*?)<\/item>/g;
            let match;
            let newCount = 0;
            let skipCount = 0;

            while ((match = itemRegex.exec(xml)) !== null) {
                const itemContent = match[1];
                const title = (itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || itemContent.match(/<title>([\s\S]*?)<\/title>/) || [null, ''])[1];
                const link = (itemContent.match(/<link>([\s\S]*?)<\/link>/) || [null, ''])[1];
                const description = (itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemContent.match(/<description>([\s\S]*?)<\/description>/) || [null, ''])[1];
                const pubDate = (itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [null, ''])[1];

                const idAnnonce = 'RSS_' + simpleHash(link);

                // DÉDOUBLONNAGE
                const dupRes = await fetch(`${PB_URL}/api/collections/jobs/records?filter=(ID_Annonce="${idAnnonce}" || URL_offre="${link}")`, {
                    headers: { 'Authorization': token }
                });
                const dupData = await dupRes.json();
                if (dupData.totalItems > 0) {
                    skipCount++;
                    continue;
                }

                // MAPPING ET INSERTION
                const record = {
                    ID_Annonce: idAnnonce,
                    Titre_poste: cleanText(title),
                    Entreprise: feed.name,
                    Lieu: "France (Voir offre)",
                    Salaire: "Grille indiciaire",
                    URL_offre: link,
                    Description: cleanText(description).substring(0, 2000),
                    Source: feed.source,
                    Date_Publication: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    Statut: 'Nouvelle',
                    Mot_cle_source: "Flux RSS Direct",
                    Date_Traitement: new Date().toISOString().split('T')[0],
                    ownerId: OWNER_ID
                };

                const createRes = await fetch(`${PB_URL}/api/collections/jobs/records`, {
                    method: 'POST',
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(record)
                });

                if (createRes.ok) {
                    newCount++;
                } else {
                    console.error(`❌ Erreur création: ${createRes.statusText}`);
                }
            }
            console.log(`📊 Résultat ${feed.name}: ${newCount} ajoutés, ${skipCount} déjà présents.`);
        }
    } catch (err) {
        console.error("❌ Erreur fatale:", err.message);
    }
}

run();
