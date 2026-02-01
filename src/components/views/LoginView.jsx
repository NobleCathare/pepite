import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import logoLight from '../../assets/logo-pepite-light.png';
import logoDark from '../../assets/logo-pepite-dark.png';

const LoginView = () => {
    const { loginWithGoogle, loginWithPassword } = useAuth();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await loginWithPassword(email, password);
            window.location.reload();
        } catch (err) {
            console.error(err);
            setError("Échec de la connexion. Vérifiez vos identifiants.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("🚀 Starting Google OAuth via PocketBase...");
            await loginWithGoogle();
            console.log("✅ Auth Success! Reloading...");
            window.location.reload();
        } catch (err) {
            console.error("❌ OAuth Error:", err);
            const msg = err?.data?.message || err?.message || "Erreur inconnue";
            setError(`Échec de la connexion: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4 transition-colors duration-200">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-8">
                    {/* Logo for Light Mode (Dark Text) */}
                    <img src={logoLight} alt="Pépite" className="h-20 mx-auto mb-4 block dark:hidden" />
                    {/* Logo for Dark Mode (Light Text) */}
                    <img src={logoDark} alt="Pépite" className="h-20 mx-auto mb-4 hidden dark:block" />
                </div>

                <div className="space-y-6">
                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                        {loading ? (
                            <span className="text-sm">Connexion...</span>
                        ) : (
                            <>
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                Se connecter avec Google
                            </>
                        )}
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-300 dark:text-gray-600 text-xs font-bold uppercase">Ou par email</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-pepite-gold outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                                placeholder="votre@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Mot de passe</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-pepite-gold outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg font-bold text-center break-all">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-pepite-gold hover:bg-yellow-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Connexion...' : 'Se Connecter'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
