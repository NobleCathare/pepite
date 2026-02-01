# Méthodologie d'Intégration ATS (Révision 3 - No-Code Phase)

## 1. Architecture Simplifiée (100% SASRE)

### A. Lecture du CV (Directe)
**Contrainte** : Plus d'intermédiaire n8n. Sassre doit lire le Google Doc directement.
**Méthode** : Pour éviter une authentification OAuth lourde (Google Cloud Project, validation d'app...), nous utiliserons la fonction native **"Publier sur le Web"** de Google Docs.
*   **Action Utilisateur** : Dans votre Google Doc > Fichier > Partager > Publier sur le web > "Texte brut" (ou HTML).
*   **Resultat** : Une URL publique (accessible uniquement par ceux qui l'ont) que SASRE peut lire instantanément (`fetch`).
*   **Avantages** : Zéro quota API, zéro configuration technique complexe, mise à jour instantanée quand vous modifiez le doc.

### B. Cerveau IA (Interne)
L'intelligence est gérée par le frontend SASRE via OpenRouter.
*   **Configuration** : Onglet **"IA"** dans les paramètres.
*   **Modulaire** : Vous pourrez changer le modèle (ex: passer de `xiaomi` à `gpt-4o-mini`) et ajuster le prompt système.

## 2. Nouveaux Réglages (Onglet IA)
Création d'un onglet dédié dans `SettingsView` :
1.  **URL CV Public** : Champ pour coller le lien "Publier sur le web" de votre CV.
2.  **API Key OpenRouter** : (Stockée localement ou dans `.env`).
3.  **Choix du Modèle** : Input texte (avec lien vers la liste OpenRouter).
4.  **Prompt Système** : Grande zone de texte pour affiner la personnalité de l'ATS.

## 3. Flux "Analyse ATS"
Lorsqu'une offre est importée (ou via bouton manuel "Analyser") :
1.  SASRE récupère le texte du CV via l'URL configurée.
2.  SASRE prépare le prompt (Prompt Config + CV + Offre).
3.  SASRE appelle OpenRouter.
4.  SASRE sauvegarde le résultat JSON dans PocketBase (champs `score_ATS`, `remarque_ATS`).

## 4. Données Nécessaires (À me fournir pour coder)
Pour que je puisse implémenter cela, j'aurai besoin :
1.  De l'URL **"Publier sur le web"** de votre Master CV (pour tester le fetch).
2.  De votre clé API **OpenRouter** (si différente de celle utilisée ailleurs).

Validez-vous cette méthode "Publier sur le web" le Master CV ? Elle est la plus simple et robuste pour un accès direct.
