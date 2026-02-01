import fs from 'fs';
import path from 'path';

async function debugFT() {
    console.log('🕵️‍♂️ DIAGNOSTIC FRANCE TRAVAIL API\n');

    // 1. LIRE LES CREDENTIALS
    console.log('1. Lecture de .env.local...');
    let CLIENT_ID, CLIENT_SECRET;
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error('❌ Fichier .env.local introuvable !');
            return;
        }
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key?.trim() === 'VITE_FT_CLIENT_ID') CLIENT_ID = val?.trim();
            if (key?.trim() === 'VITE_FT_CLIENT_SECRET') CLIENT_SECRET = val?.trim();
        });

        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error('❌ Credentials manquants dans .env.local');
            console.log(`   VITE_FT_CLIENT_ID: ${CLIENT_ID ? 'OK' : 'MANQUANT'}`);
            console.log(`   VITE_FT_CLIENT_SECRET: ${CLIENT_SECRET ? 'OK' : 'MANQUANT'}`);
            return;
        }
        console.log('✅ Credentials trouvés');
        console.log(`   ID: ${CLIENT_ID.substring(0, 5)}...`);
    } catch (e) {
        console.error('❌ Erreur lecture .env.local:', e.message);
        return;
    }

    // 2. AUTHENTIFICATION
    console.log('\n2. Test Authentification OAuth2...');
    let token;
    try {
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            scope: 'api_offresdemploiv2 o2dsoffre'
        });

        const start = Date.now();
        const response = await fetch('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const duration = Date.now() - start;
        console.log(`   ⏱️ Durée: ${duration}ms`);

        if (!response.ok) {
            console.error(`❌ Échec Auth: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(`   Réponse: ${text}`);
            return;
        }

        const data = await response.json();
        token = data.access_token;
        console.log('✅ Token récupéré avec succès !');
    } catch (e) {
        console.error('❌ Erreur connexion Auth:', e.message);
        return;
    }

    // 3. RECHERCHE TEST
    console.log('\n3. Test Recherche Simple ("boulanger")...');
    try {
        const searchParams = new URLSearchParams({
            motsCles: 'boulanger',
            sort: '1',
            range: '0-49'
        });

        const response = await fetch(`https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${searchParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`❌ Échec Recherche: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(`   Réponse: ${text}`);

            if (response.status === 204) {
                console.log('   ⚠️ (204 signifie "Pas de contenu", donc 0 résultat, mais la requête a fonctionné)');
            }
            return;
        }

        const data = await response.json();
        const results = data.resultats || [];
        console.log(`✅ Recherche réussie !`);
        console.log(`   📊 Résultats trouvés: ${results.length}`);

        if (results.length > 0) {
            console.log(`   Exemple: ${results[0].intitule} chez ${results[0].entreprise?.nom || 'Inconnu'}`);
        }

    } catch (e) {
        console.error('❌ Erreur connexion Recherche:', e.message);
    }
}

debugFT();
