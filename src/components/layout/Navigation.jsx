import React from 'react';
import { Layers, FileText, Send, BarChart2, Settings, Map } from 'lucide-react';
import { STATUS } from '../../utils/consts';

const Navigation = ({ currentView, onViewChange, counts }) => {
    const navItems = [
        { id: 'triage', label: 'Triage', icon: Layers, count: counts[STATUS.NOUVELLE] || 0 },
        { id: 'map', label: 'Carte', icon: Map, count: 0 },
        { id: 'editor', label: 'Rédaction', icon: FileText, count: counts[STATUS.A_VERIFIER] || 0 },
        { id: 'submission', label: 'Envoi', icon: Send, count: counts[STATUS.PRETE] || 0 },
        { id: 'dashboard', label: 'Suivi', icon: BarChart2, count: 0 },
        { id: 'settings', label: 'Paramètres', icon: Settings, count: 0 },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-2 px-4 shadow-lg z-50 md:sticky md:top-0 md:h-screen md:w-20 md:flex-col md:py-6 md:border-t-0 md:border-r transition-colors duration-200">
            <div className="flex justify-around md:flex-col md:gap-6 items-center">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`relative p-2 rounded-2xl transition-all flex flex-col items-center gap-1
                            ${currentView === item.id
                                ? 'text-pepite-gold bg-yellow-50 dark:bg-yellow-900/20 font-bold'
                                : 'text-gray-400 dark:text-gray-500 hover:text-pepite-dark dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        <item.icon size={24} strokeWidth={currentView === item.id ? 2.5 : 2} />
                        <span className="text-[10px] font-medium hidden md:block">{item.label}</span>
                        {item.count > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pepite-gold text-[10px] text-white shadow-sm border border-white dark:border-gray-900">
                                {item.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </nav>
    );
};

export default Navigation;
