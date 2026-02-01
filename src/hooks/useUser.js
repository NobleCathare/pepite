import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';

export function useUser() {
    const { currentUser } = useAuth();
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            setUserProfile(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        // currentUser is now PocketBase model with .id (15 chars)
        const unsubscribe = userService.subscribeUser(currentUser.id, (data) => {
            // data already includes .id from PocketBase record
            setUserProfile(data || {});
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser?.id]);

    const generateQRCode = async (url) => {
        if (!url) return null;
        try {
            const size = "300x300";
            const api = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(url)}`;
            const response = await fetch(api);
            const blob = await response.blob();

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result); // Base64 Data URL
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error("QR Gen Failed", err);
            return null;
        }
    };

    const updateProfile = useCallback(async (data) => {
        if (!userProfile?.id) return;

        // Clean updates to only include actual database fields
        // Remove virtual fields and PB internal ones that shouldn't be overridden directly
        const {
            id, // Explicitly remove id from payload, handled by param
            searchConfig, visualFilters, // Virtual fields added by userService
            created, updated, collectionId, collectionName, expand, // PB internal fields
            ...cleanData
        } = data;

        // Ensure we don't send any other possible PB internals
        Object.keys(cleanData).forEach(key => {
            if (key.startsWith('_')) delete cleanData[key];
        });

        const updates = { ...cleanData };

        // Auto-Generate QR if LinkedIn URL changed or is present but QR missing
        if (updates.linkedin_url) {
            if (updates.linkedin_url !== userProfile?.linkedin_url || !userProfile?.qr_code_base64) {
                const qrCode = await generateQRCode(updates.linkedin_url);
                if (qrCode) {
                    updates.qr_code_base64 = qrCode;
                }
            }
        }

        console.log("[useUser] Persisting profile update:", updates);
        try {
            await userService.updateUserProfile(userProfile.id, updates);
            console.log("[useUser] Persist Successful");
        } catch (err) {
            console.error("[useUser] Persist Failed", err);
            throw err;
        }
    }, [userProfile]);

    const updateSearchConfig = useCallback(async (config) => {
        if (!userProfile?.id) return;
        await userService.updateSearchConfig(userProfile.id, config);
    }, [userProfile?.id]);

    const updateVisualFilters = useCallback(async (filters) => {
        if (!userProfile?.id) return;
        await userService.updateVisualFilters(userProfile.id, filters);
    }, [userProfile?.id]);

    return {
        user: userProfile,
        loading,
        updateProfile,
        updateSearchConfig,
        updateVisualFilters
    };
}
