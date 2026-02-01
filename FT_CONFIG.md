# Configuration France Travail API

## 🔑 Obtenir les Credentials

1. **Créer un compte développeur** :
   - Aller sur https://francetravail.io/
   - S'inscrire en tant que développeur
   - Créer une nouvelle application

2. **Récupérer les credentials** :
   - `Client ID` : Identifiant de votre application
   - `Client Secret` : Clé secrète (à garder confidentielle)

3. **Configurer l'application** :
   - Créer un fichier `.env` à la racine du projet (copier `.env.example`)
   - Remplir les valeurs :
     ```env
     VITE_FT_CLIENT_ID=votre_client_id
     VITE_FT_CLIENT_SECRET=votre_client_secret
     ```

## ⚠️ Sécurité

**IMPORTANT** : Les credentials ne doivent JAMAIS être commitées dans Git !

Le fichier `.env` est déjà dans `.gitignore`, mais vérifiez toujours avant de commit.

## 🧪 Tester l'intégration

1. Assurez-vous d'avoir au moins une recherche active dans `config_search`
2. Cliquez sur le bouton bleu "🔍" dans l'onglet Triage
3. Confirmez la recherche
4. Attendez quelques secondes
5. Vérifiez les résultats dans la console et dans l'alerte

## 📊 Données requises dans PocketBase

### Collection `config_search`
Assurez-vous d'avoir au moins un enregistrement avec :
- `Mot_Cle` : "responsable qualite" (exemple)
- `Actif` : `true`
- `ownerId` : Votre ID utilisateur

### Collection `config_filters` (optionnel)
Pour le scoring automatique :
- `Type` : "BOOST", "MALUS", ou "BLACKLIST"
- `Categorie` : "Titre", "Description", "Entreprise", ou "Global"
- `Valeur` : Mot-clé à détecter
- `Poids` : Score à ajouter/soustraire
- `Actif` : `true`
- `ownerId` : Votre ID utilisateur

## 🐛 Dépannage

### Erreur "Credentials not configured"
→ Vérifiez que le fichier `.env` existe et contient les bonnes valeurs

### Erreur "OAuth2 failed: 401"
→ Vérifiez que vos credentials sont corrects

### Erreur "Aucune recherche active configurée"
→ Ajoutez au moins un enregistrement dans `config_search` avec `Actif = true`

### Les offres n'apparaissent pas
→ Rechargez la page (F5) après la recherche
