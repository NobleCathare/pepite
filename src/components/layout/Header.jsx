import React, { useState, useEffect } from 'react';
import { useGoogleSheets } from '../../hooks/useGoogleSheets';

import { Moon, Sun, Search, X } from 'lucide-react';

const Header = ({ searchQuery, setSearchQuery }) => {
    const { isAuth, login, logout } = useGoogleSheets();
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        // Initial check
        if (localStorage.getItem('theme') === 'dark' ||
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        if (darkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setDarkMode(true);
        }
    };

    return (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-3 px-4 md:px-8 fixed top-0 left-0 right-0 z-40 md:left-20 h-16 flex items-center shadow-sm transition-colors duration-200">
            <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img
                        src={darkMode ? "/logo-pepite-dark.png" : "/logo-pepite.png"}
                        alt="Pépite Logo"
                        className="h-10 w-auto object-contain"
                    />

                </div>

                {/* SEARCH BAR - CENTER */}
                <div className="flex-1 max-w-md mx-4 relative hidden md:block">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher (Poste, Entreprise, Mots-clés)..."
                            value={searchQuery || ""}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pepite-gold/50 transition-all dark:text-gray-200 placeholder-gray-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                            title={darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>

                    <div className="text-sm text-right hidden sm:block">
                        <p className="font-medium text-pepite-dark dark:text-gray-200">
                            {isAuth ? "Connecté" : "Hors ligne"}
                        </p>
                    </div>

                    {isAuth ? (
                        <button onClick={logout} className="h-9 w-9 rounded-full bg-pepite-light dark:bg-gray-800 flex items-center justify-center text-pepite-dark dark:text-gray-200 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            CP
                        </button>
                    ) : (
                        <button onClick={login} className="text-sm bg-pepite-gold text-white px-5 py-2 rounded-full font-semibold hover:bg-yellow-500 shadow-sm transition-all">
                            Connexion
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
