import { Layers, FileText, Send, BarChart2, Settings, Map } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { STATUS } from '../../utils/consts';

const Navigation = ({ counts }) => {
    const location = useLocation();

    // Mapping ids to paths. For settings, we default to /parametre/profil if we click the button? 
    // Actually, NavLink `to` can be just `/parametre` and let the redirect handle it, or `/parametre/profil` explicitly.
    // Let's use explicit paths.
    // Also, NavLink matches if the path starts with TO. So /parametre/profil matches /parametre.

    const navItems = [
        { id: 'triage', path: '/triage', label: 'Triage', icon: Layers, count: counts[STATUS.NOUVELLE] || 0 },
        { id: 'map', path: '/map', label: 'Carte', icon: Map, count: 0 },
        { id: 'editor', path: '/editor', label: 'Rédaction', icon: FileText, count: counts[STATUS.A_VERIFIER] || 0 },
        { id: 'submission', path: '/submission', label: 'Envoi', icon: Send, count: counts[STATUS.PRETE] || 0 },
        { id: 'dashboard', path: '/dashboard', label: 'Suivi', icon: BarChart2, count: 0 },
        { id: 'settings', path: '/parametre', label: 'Paramètres', icon: Settings, count: 0 },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-2 px-4 shadow-lg z-50 md:sticky md:top-0 md:h-screen md:w-20 md:flex-col md:py-6 md:border-t-0 md:border-r transition-colors duration-200">
            <div className="flex justify-around md:flex-col md:gap-6 items-center">
                {navItems.map((item) => (
                    <NavLink
                        key={item.id}
                        to={item.path}
                        className={({ isActive }) => {
                            // Special handling for settings to match sub-paths if needed, but 'to' usually exact match unless 'end' is false.
                            // By default isActive is true for inclusive match? 
                            // wait, /parametre matches /parametre/profil? yes.
                            // BUT /triage does not match /triage/xyz unless...

                            // If path is /parametre, we want it active if location includes /parametre
                            const active = item.id === 'settings'
                                ? location.pathname.startsWith('/parametre')
                                : isActive;

                            return `relative p-2 rounded-2xl transition-all flex flex-col items-center gap-1
                            ${active
                                    ? 'text-pepite-gold bg-yellow-50 dark:bg-yellow-900/20 font-bold'
                                    : 'text-gray-400 dark:text-gray-500 hover:text-pepite-dark dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`;
                        }}
                    >
                        <item.icon size={24} />
                        <span className="text-[10px] font-medium hidden md:block">{item.label}</span>
                        {item.count > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pepite-gold text-[10px] text-white shadow-sm border border-white dark:border-gray-900">
                                {item.count}
                            </span>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default Navigation;
