import { gapi } from 'gapi-script';

export const initGoogleClient = async () => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    const SCOPES = import.meta.env.VITE_GOOGLE_SCOPES;

    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', () => {
            gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
                scope: SCOPES,
            }).then(() => {
                resolve(gapi.auth2.getAuthInstance());
            }).catch((error) => {
                reject(error);
            });
        });
    });
};

export const signIn = () => {
    const authInstance = gapi.auth2.getAuthInstance();
    if (authInstance) return authInstance.signIn();
    return Promise.reject("GAPI not initialized");
};

export const signOut = () => {
    const authInstance = gapi.auth2.getAuthInstance();
    if (authInstance) return authInstance.signOut();
    return Promise.reject("GAPI not initialized");
};

export const isSignedIn = () => {
    const authInstance = gapi.auth2.getAuthInstance();
    return authInstance ? authInstance.isSignedIn.get() : false;
};
