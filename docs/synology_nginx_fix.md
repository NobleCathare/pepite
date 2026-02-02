# Correction Erreur HTTP2 Realtime sur Synology

Cette erreur (`net::ERR_HTTP2_PROTOCOL_ERROR`) survient car le serveur web (Nginx) du Synology "bufferise" (met en mémoire tampon) la réponse. Or, pour le temps réel (SSE), PocketBase a besoin d'envoyer les données en continu sans attendre.

Voici la procédure pour corriger cela via l'interface de votre Synology.

## Méthode 1 : Via l'interface graphique (Le plus simple)

C'est la première chose à tenter. Souvent, activer le support WebSocket suffit à configurer Nginx correctement (en forçant HTTP/1.1 et en gardant la connexion ouverte).

1.  Connectez-vous à votre **DSM Synology**.
2.  Allez dans **Panneau de configuration** > **Portail de connexion** (ou "Portail des applications").
3.  Cliquez sur l'onglet **Avancé**.
4.  Cliquez sur le bouton **Proxy inversé**.
5.  Sélectionnez la règle qui correspond à `pocketbase.circumambule.synology.me` et cliquez sur **Modifier**.
6.  Allez dans l'onglet **En-tête personnalisé**.
7.  Cliquez sur la flèche à côté du bouton "Créer" > **WebSocket**.
    *   Cela va ajouter deux en-têtes : `Upgrade` et `Connection`.
8.  Cliquez sur **OK** pour sauvegarder.

Testez votre application. Si l'erreur disparait, c'est gagné !

---

## Méthode 2 : Modification du profil Nginx (Si la méthode 1 échoue)

Si l'interface ne suffit pas, il faut dire explicitement à Nginx de ne pas bufferiser. Sur Synology, c'est plus technique car les fichiers de config sont écrasés au redémarrage.

L'astuce consiste à ajouter ces directives dans l'interface si possible ou via un script, mais la **Méthode 1** résout 90% des cas d'usage PocketBase sur Synology car elle force le mode "longue connexion".

### Ce qu'il manque techniquement (pour info)
Si vous deviez éditer le fichier Nginx manuellement (expert), voici ce qui manque pour le `location /` :

```nginx
proxy_http_version 1.1;
proxy_set_header Connection '';
proxy_buffering off;
proxy_cache off;
chunked_transfer_encoding off;
```

**Note :** Ne tentez pas d'éditer les fichiers `/etc/nginx/...` en SSH sauf si vous êtes très à l'aise, car Synology les réinitialise souvent.

## Vérification

Après avoir appliqué la **Méthode 1** :
1.  Rafraichissez votre application Pépite.
2.  Ouvrez la console (F12).
3.  Vérifiez que la requête rouge `/api/realtime` ne revient pas.
4.  Vous devriez voir un message "Robot en veille intelligente..." ou similaire qui indique que la connexion tient bon.
