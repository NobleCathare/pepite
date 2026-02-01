import { createContext, useContext, useEffect, useState } from 'react';
import { pb } from '../services/pb';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(pb.authStore.model);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Sync state with PocketBase authStore on mount
        setCurrentUser(pb.authStore.model);
        setLoading(false);

        // Listen for auth changes (login/logout from any source)
        const unsubscribe = pb.authStore.onChange((token, model) => {
            console.log("🔐 Auth state changed:", model ? model.email : "logged out");
            setCurrentUser(model);
        });

        return () => unsubscribe();
    }, []);

    async function loginWithGoogle() {
        try {
            const authData = await pb.collection('users').authWithOAuth2({
                provider: 'google',
                scopes: ['email', 'profile']
            });
            console.log("✅ Google Login Success:", authData.record?.email);
            return authData;
        } catch (error) {
            console.error("❌ Google Login Error:", error);
            throw error;
        }
    }

    async function loginWithPassword(email, password) {
        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            console.log("✅ Password Login Success:", authData.record?.email);
            return authData;
        } catch (error) {
            console.error("❌ Password Login Error:", error);
            throw error;
        }
    }

    function logout() {
        console.log("👋 Logging out...");
        pb.authStore.clear();
    }

    const value = {
        currentUser,
        loginWithGoogle,
        loginWithPassword,
        logout,
        isAuthenticated: pb.authStore.isValid
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
