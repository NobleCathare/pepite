import React, { useState } from 'react';
import { Settings, Filter, Search, Plus, Trash2, Save, X, Edit2, AlertCircle, MapPin, Check, Info } from 'lucide-react';
import { useWebhook } from '../../hooks/useWebhook';

/* --- SUB-COMPONENT: SYSTEM TAB --- */
const SystemTab = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-gray-500 italic">Aucune configuration système chargée.</div>;

    // Assume Row 0 is header
    const headers = data[0] || ["Catégorie", "Clé", "Valeur", "Description"];
    const rows = data.slice(1);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium uppercase text-xs">
                    <tr>
                        {headers.map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            {headers.map((_, colIndex) => (
                                <td key={colIndex} className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                    {colIndex === 2 ? <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{row[colIndex]}</span> : (row[colIndex] || '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/* --- SUB-COMPONENT: VISUAL FILTERS TAB --- */
const VisualFiltersTab = ({ data, onUpdate, onAdd, onDelete, onRecalculate, loading, webhookError }) => {
    const startIndex = (data.length > 0 && data[0][0] === "Type") ? 1 : 0;
    const rules = data.slice(startIndex).map((r, i) => ({
        flatIndex: i + startIndex,
        type: r[0],
        category: r[1] || 'Uncategorized',
        value: r[2], // This is the keyword
        active: r[3],
        score: parseInt(r[4] || 0),
        reason: r[5]
    }));

    // STRICT CATEGORY ORDERING
    const ORDERED_CATEGORIES = ['Contrat', 'Titre', 'Description', 'Entreprise'];

    // Valid categories available in data + any forced ones
    const availableCategories = [...new Set(rules.map(r => r.category))].filter(Boolean);
    // Sort them according to strict order
    const categories = Array.from(new Set([...ORDERED_CATEGORIES, ...availableCategories])).sort((a, b) => {
        const indexA = ORDERED_CATEGORIES.indexOf(a);
        const indexB = ORDERED_CATEGORIES.indexOf(b);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    // TABS STATE
    const [activeCategory, setActiveCategory] = useState(categories[0]);

    // State
    const [editingRuleIndex, setEditingRuleIndex] = useState(null);
    const [editForm, setEditForm] = useState({ value: '', reason: '' }); // Local state for editing in popup

    const [draggingId, setDraggingId] = useState(null);
    const [localScores, setLocalScores] = useState({});

    // Creation Modal State
    const [isCreating, setIsCreating] = useState(false);
    const [newRule, setNewRule] = useState({ category: '', value: '', priority: '0', reason: '' });

    const SCALE_MIN = -50;
    const SCALE_MAX = 50;

    const getScore = (id, ruleScore) => {
        return localScores[id] !== undefined ? localScores[id] : ruleScore;
    };

    // Effect to clear local scores once props update matches them
    React.useEffect(() => {
        setLocalScores(prev => {
            const next = { ...prev };
            let changed = false;
            rules.forEach(r => {
                if (next[r.flatIndex] !== undefined && next[r.flatIndex] === r.score) {
                    delete next[r.flatIndex];
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [rules]);

    const getLeftPercent = (score) => {
        let s = Math.max(SCALE_MIN, Math.min(SCALE_MAX, score));
        return ((s - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
    };

    // DRAG HANDLERS
    const handleDragStart = (e, rule) => {
        if (loading) return; // Prevent drag if loading
        e.preventDefault();
        e.stopPropagation();
        const container = e.currentTarget.closest('.scale-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        setDraggingId(rule.flatIndex);
        setEditingRuleIndex(null);

        const onMove = (moveEvent) => {
            let clientX = moveEvent.clientX;
            if (moveEvent.touches) clientX = moveEvent.touches[0].clientX;

            const x = clientX - rect.left;
            const width = rect.width;

            let percent = (x / width);
            percent = Math.max(0, Math.min(1, percent));

            const rawScore = SCALE_MIN + (percent * (SCALE_MAX - SCALE_MIN));
            const score = Math.round(rawScore);

            setLocalScores(prev => ({ ...prev, [rule.flatIndex]: score }));
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);

            setDraggingId(null);
            // Do NOT clear localScores here. Wait for useEffect to clear it when prop updates.

            // Trigger update
            // We need to access the LATEST local score for this rule.
            setLocalScores(currentScores => {
                const finalScore = currentScores[rule.flatIndex];
                if (finalScore !== undefined && finalScore !== rule.score) {
                    const newType = finalScore < 0 ? 'PENALTY' : 'BONUS';
                    const newRow = [newType, rule.category, rule.value, rule.active, finalScore.toString(), rule.reason];
                    onUpdate(rule.flatIndex, newRow);
                }
                return currentScores;
            });
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // Improved Vertical Scattering using Golden Ratio
    // Guarantees maximal dispersion for any number of items
    const getVerticalStyle = (index, total) => {
        if (total === 0) return { top: '50%' };

        if (total < 10) {
            // Simple stagger for very few items
            const slots = [20, 50, 80, 35, 65];
            const slot = slots[index % slots.length];
            return { top: `${slot}%` };
        }

        // Golden Ratio Dispersion
        // PHI = 0.618033988749895
        const PHI = 0.618033988749895;
        // Fractional part of (index * PHI) -> gives a number between 0 and 1
        // that is evenly distributed but non-repeating
        const rnd = (index * PHI) % 1;

        // Map to 5% - 95% range
        const pos = 5 + (rnd * 90);

        return { top: `${pos}%` };
    };

    const handleCreate = () => {
        if (!newRule.value) return alert("La valeur est obligatoire");
        if (!newRule.category) return alert("La catégorie est obligatoire");

        // Validate Category
        if (!ORDERED_CATEGORIES.includes(newRule.category)) {
            if (!confirm(`La catégorie "${newRule.category}" n'est pas standard. Continuer ?`)) return;
        }

        const initialScore = parseInt(newRule.priority || "0");
        const type = initialScore < 0 ? 'PENALTY' : 'BONUS';
        const dateStr = new Date().toLocaleDateString('fr-FR');

        // Add Date at index 6 (Col G)
        const row = [
            type,
            newRule.category,
            newRule.value,
            "TRUE",
            initialScore.toString(),
            newRule.reason || "",
            dateStr
        ];

        onAdd(row);

        setIsCreating(false);
        setNewRule({ category: activeCategory || 'Titre', value: '', priority: '0', reason: '' });
    };

    const handleEditSave = (rule, currentScore) => {
        const newType = currentScore < 0 ? 'PENALTY' : 'BONUS';
        // Use the edited values from state
        const newRow = [newType, rule.category, editForm.value || rule.value, rule.active, currentScore.toString(), editForm.reason || rule.reason];
        onUpdate(rule.flatIndex, newRow);
        setEditingRuleIndex(null);
    };

    // Filter rules for active tab and sort alphabetically
    const catRules = rules
        .filter(r => r.category === activeCategory)
        .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }));

    const ITEM_HEIGHT = 30;
    const MARGIN_TOP = 20;
    const MARGIN_BOTTOM = 20;
    const dynamicHeight = Math.max(400, MARGIN_TOP + (catRules.length * ITEM_HEIGHT) + MARGIN_BOTTOM);

    const [showFab, setShowFab] = useState(false);
    const sentinelRef = React.useRef(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // If sentinel is NOT intersecting (scrolled past), show FAB
                setShowFab(!entry.isIntersecting);
            },
            { threshold: 0, rootMargin: "-20px 0px 0px 0px" } // Trigger slightly after scrolling
        );

        if (sentinelRef.current) observer.observe(sentinelRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div className="space-y-6 pb-20" onClick={() => setEditingRuleIndex(null)}>
            {/* Scroll Sentinel */}
            <div ref={sentinelRef} className="absolute top-0 h-px w-full pointer-events-none opacity-0" />

            {/* Header / Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 sticky top-0 z-20 transition-colors">
                <div className="flex justify-between items-center p-4">
                    <div>
                        <h3 className="font-bold text-gray-700 dark:text-gray-100 text-lg">Visualiseur de Règles</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Gérez vos critères de filtre par catégorie.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onRecalculate(); }}
                            disabled={loading}
                            className={`flex items-center gap-2 text-white px-4 py-2 rounded-full shadow transition-all font-medium text-sm ${loading ? 'bg-yellow-200 cursor-wait' : 'bg-pepite-gold hover:bg-yellow-500'}`}
                        >
                            <Save size={16} /> {loading ? "Sauvegarde..." : "Valider & Recalculer"}
                        </button>
                        {webhookError && (
                            <div className="absolute top-full mt-2 right-0 bg-red-100 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-1 z-50 whitespace-nowrap">
                                <AlertCircle size={14} />
                                {webhookError}
                            </div>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsCreating(true); setNewRule({ category: activeCategory || 'Titre', value: '', priority: '0', reason: '' }); }}
                            disabled={loading}
                            className={`flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Plus size={16} /> Ajouter
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex px-4 border-t border-gray-100 dark:border-gray-700 overflow-x-auto">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap
                                ${activeCategory === cat
                                    ? 'border-pepite-gold text-pepite-gold'
                                    : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700'
                                }`}
                        >
                            {cat} <span className="ml-1 text-xs opacity-50 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{rules.filter(r => r.category === cat).length}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Creation Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsCreating(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold text-gray-800">Ajouter une nouvelle règle</h3>
                            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catégorie</label>
                            <select
                                className="w-full border rounded-lg p-2 text-sm bg-white"
                                value={newRule.category}
                                onChange={e => setNewRule({ ...newRule, category: e.target.value })}
                            >
                                <option value="" disabled>Choisir...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mot-clé / Valeur</label>
                            <input
                                className="w-full border rounded-lg p-2 text-sm"
                                placeholder="Ex: Javascript"
                                value={newRule.value}
                                onChange={e => setNewRule({ ...newRule, value: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Score Initial</label>
                            <input
                                type="number"
                                className="w-full border rounded-lg p-2 text-sm"
                                placeholder="0"
                                value={newRule.priority}
                                onChange={e => setNewRule({ ...newRule, priority: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Raison (Optionnel)</label>
                            <textarea
                                className="w-full border rounded-lg p-2 text-sm h-20"
                                value={newRule.reason}
                                onChange={e => setNewRule({ ...newRule, reason: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={handleCreate} className="flex-1 bg-pepite-gold text-white py-2 rounded-lg font-bold hover:bg-yellow-500">Créer</button>
                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Annuler</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area - Single Category */}
            <div className="px-4">
                <div key={activeCategory} className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* SCALE CONTAINER */}
                    <div
                        className={`scale-container relative bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 px-12 select-none shadow-inner transition-all ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                        style={{ height: `${dynamicHeight}px` }}
                    >
                        {/* Center Line */}
                        <div className="absolute left-1/2 top-4 bottom-4 w-px bg-gray-300 dark:bg-gray-700 z-0"></div>
                        <div className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 z-0 rounded-b">0</div>

                        {/* Graduations */}
                        <div className="absolute left-1/4 top-1/2 w-px h-8 bg-gray-200 dark:bg-gray-700 -translate-y-1/2"></div>
                        <div className="absolute left-3/4 top-1/2 w-px h-8 bg-gray-200 dark:bg-gray-700 -translate-y-1/2"></div>

                        {/* Labels */}
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-black text-red-500/5 dark:text-red-500/20 uppercase pointer-events-none tracking-[0.2em] z-0">Malus</div>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-green-500/5 dark:text-green-500/20 uppercase pointer-events-none tracking-[0.2em] z-0">Bonus</div>

                        {/* Tags */}
                        {catRules.map((rule, idx) => {
                            const currentScore = getScore(rule.flatIndex, rule.score);
                            const isDragging = draggingId === rule.flatIndex;
                            const isEditing = editingRuleIndex === rule.flatIndex;

                            return (
                                <div
                                    key={rule.flatIndex}
                                    className={`absolute z-10 -translate-y-1/2 ${isDragging ? 'z-50 cursor-grabbing' : 'cursor-grab hover:z-40'}`}
                                    style={{
                                        left: `${getLeftPercent(currentScore)}%`,
                                        top: `${MARGIN_TOP + (idx * ITEM_HEIGHT)}px`,
                                        transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out'
                                    }}
                                    onMouseDown={(e) => handleDragStart(e, rule)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isDragging) {
                                            const newIdx = isEditing ? null : rule.flatIndex;
                                            setEditingRuleIndex(newIdx);
                                            if (newIdx !== null) setEditForm({ value: rule.value, reason: rule.reason });
                                        }
                                    }}
                                >
                                    <div className={`
                                         relative -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border
                                         flex items-center gap-2 group transition-colors
                                         ${rule.active === 'FALSE' ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 opacity-50 decoration-dashed line-through' :
                                            currentScore < 0 ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border-red-200 dark:border-red-900' :
                                                currentScore > 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 border-green-200 dark:border-green-900' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}
                                         ${isEditing ? 'ring-2 ring-pepite-gold ring-offset-1 z-50 scale-110' : ''}
                                         ${isDragging ? 'shadow-lg scale-110 ring-2 ring-yellow-400' : 'hover:scale-105'}
                                     `}>
                                        <span className="whitespace-nowrap select-none max-w-[150px] truncate">{rule.value}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] bg-black/5 dark:bg-white/10`}>{currentScore}</span>

                                        {/* EDIT POPUP */}
                                        {isEditing && !isDragging && (
                                            <div
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white shadow-2xl rounded-xl p-4 z-50 min-w-[240px] border border-gray-100 animate-in fade-in zoom-in-95 cursor-default text-left"
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="mb-2">
                                                    <label className="text-[10px] uppercase font-bold text-gray-400">Mot-clé</label>
                                                    <input
                                                        className="w-full border rounded p-1 text-sm font-bold text-gray-800"
                                                        value={editForm.value}
                                                        onChange={e => setEditForm({ ...editForm, value: e.target.value })}
                                                    />
                                                </div>

                                                <div className="mb-3">
                                                    <label className="text-[10px] uppercase font-bold text-gray-400">Raison</label>
                                                    <textarea
                                                        className="w-full border rounded p-1 text-xs text-gray-600 h-16"
                                                        value={editForm.reason}
                                                        onChange={e => setEditForm({ ...editForm, reason: e.target.value })}
                                                    />
                                                </div>

                                                <div className="flex justify-between items-center pt-2 border-t border-gray-100 gap-2">
                                                    <button
                                                        onClick={() => handleEditSave(rule, currentScore)}
                                                        className="bg-pepite-gold text-white p-1.5 rounded hover:bg-yellow-500 flex-1 flex justify-center"
                                                        title="Enregistrer"
                                                    >
                                                        <Save size={14} />
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            const newRow = [rule.type, rule.category, rule.value, rule.active === 'TRUE' ? 'FALSE' : 'TRUE', rule.score, rule.reason];
                                                            onUpdate(rule.flatIndex, newRow);
                                                            setEditingRuleIndex(null);
                                                        }}
                                                        className={`p-1.5 rounded transition-colors ${rule.active === 'TRUE' ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                                        title={rule.active === 'TRUE' ? 'Désactiver' : 'Activer'}
                                                    >
                                                        {rule.active === 'TRUE' ? <X size={14} /> : <Plus size={14} />}
                                                    </button>

                                                    <button
                                                        onClick={() => { onDelete(rule.flatIndex); setEditingRuleIndex(null); }}
                                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                                                        title="Supprimer la règle"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-b border-r border-gray-100"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* FLOATING ACTIONS (Bottom Right) */}
            <div className={`fixed bottom-6 right-8 flex flex-col gap-3 transition-all duration-500 z-[60] ${showFab ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                {webhookError && (
                    <div className="bg-red-100 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-right-1 whitespace-nowrap mb-1">
                        <AlertCircle size={14} />
                        {webhookError}
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsCreating(true); setNewRule({ category: activeCategory || 'Titre', value: '', priority: '0', reason: '' }); }}
                        disabled={loading}
                        className="flex items-center justify-center w-12 h-12 bg-white text-gray-600 border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 hover:scale-105 transition-all"
                        title="Ajouter une règle"
                    >
                        <Plus size={24} />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); onRecalculate(); }}
                        disabled={loading}
                        className={`flex items-center gap-2 text-white px-6 py-3 rounded-full shadow-xl transition-all font-bold text-sm ${loading ? 'bg-yellow-200 cursor-wait' : 'bg-pepite-gold hover:bg-yellow-500 hover:scale-105'} hover:shadow-2xl`}
                    >
                        <Save size={18} /> {loading ? "..." : "Valider & Recalculer"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* --- SUB-COMPONENT: RECHERCHE TAB (Interactive) --- */
const SearchTab = ({ searchData, romeData, inseeData, onUpdate, onAdd, onDelete, onBulkUpdate }) => {
    // State for List
    const rules = searchData.map((r, i) => ({
        index: i,
        active: r[0],
        keyword: r[1],
        romeCodes: r[2],
        location: r[3],
        locationType: r[4],
        distance: r[5],
        contracts: r[6]
    }));

    // State for Modal
    const [isCreating, setIsCreating] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [form, setForm] = useState({
        active: 'TRUE',
        keyword: '',
        romeCodes: [],
        location: '',
        locationType: 'france', // 'france', 'region', 'departement', 'commune'
        distance: '',
        contracts: []
    });
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [isBulkEditing, setIsBulkEditing] = useState(false);


    // Sub-states for Search Logic
    const [romeSearch, setRomeSearch] = useState('');
    const [inseeSearch, setInseeSearch] = useState(''); // User input for postal code/city
    const [inseeSuggestions, setInseeSuggestions] = useState([]); // Filtered list from Sheet
    const [showInseeSuggestions, setShowInseeSuggestions] = useState(false);

    // Derived Data
    // Guard against romeData being null/undefined or containing null rows
    // User Update: C=Code(2), D=Qualif(3), E=Title(4)
    const romeOptions = (romeData || []).map(r => {
        if (!r || !r[2]) return null;
        return {
            code: r[2],
            label: r[4] || 'Sans titre',
            qualif: r[3] || '',
            full: `${r[2]} - ${r[4] || ''} (${r[3] || ''})`
        };
    }).filter(Boolean);

    // REGIONS CONSTANT
    const REGIONS = [
        { code: '84', name: 'Auvergne-Rhône-Alpes' },
        { code: '27', name: 'Bourgogne-Franche-Comté' },
        { code: '53', name: 'Bretagne' },
        { code: '24', name: 'Centre-Val de Loire' },
        { code: '94', name: 'Corse' },
        { code: '44', name: 'Grand Est' },
        { code: '32', name: 'Hauts-de-France' },
        { code: '11', name: 'Île-de-France' },
        { code: '28', name: 'Normandie' },
        { code: '75', name: 'Nouvelle-Aquitaine' },
        { code: '76', name: 'Occitanie' },
        { code: '52', name: 'Pays de la Loire' },
        { code: '93', name: 'Provence-Alpes-Côte d\'Azur' }
    ];

    const CONTRACT_OPTIONS = [
        { code: 'CDI', label: 'CDI' },
        { code: 'CDD', label: 'CDD' },
        { code: 'MIS', label: 'Intérim' },
        { code: 'SAI', label: 'Saisonnier' },
        { code: 'LIB', label: 'Libéral' },
        { code: 'FRA', label: 'Franchise' },
        { code: 'DIN', label: 'Stage' }, // 'DIN' often acts as catch-all or specific 'Divers'. 'STA' not always standard.
        { code: 'APP', label: 'Apprentissage' },
        { code: 'PRO', label: 'Contrat Pro' }
        // 'Alternance' usually implies APP or PRO. User can select both.
    ];

    const getContractLabel = (c) => CONTRACT_OPTIONS.find(o => o.code === c)?.label || c;

    // HANDLERS
    const handleSave = () => {
        if (!form.keyword && form.romeCodes.length === 0) return alert("Un mot-clé ou un code ROME est requis.");

        const row = [
            form.active,
            form.keyword,
            form.romeCodes.join(','),
            form.location,
            form.locationType,
            form.distance,
            form.contracts.join(',')
        ];

        if (editingIndex !== null) {
            onUpdate(editingIndex, row);
        } else {
            onAdd(row);
        }
        resetForm();
    };

    const handleBulkSave = () => {
        const newRechercheData = [...searchData];
        selectedIndices.forEach(index => {
            const original = newRechercheData[index];
            const newActive = original[0];
            const newKeyword = original[1];

            // Only apply if form field is NOT empty (or handling explicit clear? Assume accumulation for now or overwrite if set)
            // User said "appliquer les champs de recherche en commun". 
            // If I set "Paris" in modal, all selected get "Paris".
            // If I leave "Paris" empty, they keep their location.

            const newRome = form.romeCodes.length > 0 ? form.romeCodes.join(',') : original[2];
            const newLocation = form.location ? form.location : original[3];
            const newLocationType = form.location ? form.locationType : original[4];
            const newDistance = form.distance ? form.distance : original[5];
            const newContracts = form.contracts.length > 0 ? form.contracts.join(',') : original[6];

            newRechercheData[index] = [newActive, newKeyword, newRome, newLocation, newLocationType, newDistance, newContracts];
        });

        onBulkUpdate(newRechercheData);
        setIsBulkEditing(false);
        setSelectedIndices([]);
        resetForm();
    };

    const toggleSelection = (index) => {
        setSelectedIndices(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
    };

    const resetForm = () => {
        setForm({ active: 'TRUE', keyword: '', romeCodes: [], location: '', locationType: 'france', distance: '', contracts: [] });
        setRomeSearch('');
        setInseeSearch('');
        setInseeSuggestions([]);
        setEditingIndex(null);
        setIsCreating(false);
        setIsBulkEditing(false);
    };

    const startEdit = (rule) => {
        // Initialize INSEESearch if location is commune
        let initialInseeSearch = '';
        if (rule.locationType === 'commune' && inseeData) {
            // Try to find the city name for better UX
            const found = inseeData.find(row => row[0] === rule.location);
            if (found) initialInseeSearch = `${found[1]} (${found[0]})`;
            else initialInseeSearch = rule.location;
        }

        setForm({
            active: rule.active,
            keyword: rule.keyword,
            romeCodes: rule.romeCodes ? rule.romeCodes.split(',').filter(Boolean) : [],
            location: rule.location,
            locationType: rule.locationType || 'france',
            distance: rule.distance || '',
            contracts: rule.contracts ? rule.contracts.split(',').filter(Boolean) : []
        });
        setInseeSearch(initialInseeSearch);
        setEditingIndex(rule.index);
        setIsCreating(true);
    };

    const toggleRome = (code) => {
        setForm(prev => {
            const exists = prev.romeCodes.includes(code);
            return {
                ...prev,
                romeCodes: exists ? prev.romeCodes.filter(c => c !== code) : [...prev.romeCodes, code]
            };
        });
    };

    // INSEE LOOKUP LOGIC
    const handleInseeSearch = (val) => {
        setInseeSearch(val);
        // Safety check for inseeData
        if (!inseeData || !Array.isArray(inseeData) || val.length < 2) {
            setInseeSuggestions([]);
            setShowInseeSuggestions(false);
            return;
        }

        const lowerVal = val.toLowerCase();
        // inseeData format: Col A = INSEE code, Col B = Postal/Name or JSON string? 
        // Based on user prompt: "first column is INSEE code and second is postal code". 
        // Let's assume Col A=INSEE, Col B=Postal/Name (e.g., "75001 Paris")

        const matches = inseeData
            .filter(row => {
                if (!row || !row[0] || !row[1]) return false;
                // Matches either code or name
                return row[0].toString().startsWith(val) || row[1].toString().toLowerCase().includes(lowerVal);
            })
            .slice(0, 10); // Limit to 10 suggestions

        setInseeSuggestions(matches);
        setShowInseeSuggestions(true);
    };

    const selectInsee = (row) => {
        setForm({ ...form, location: row[0] }); // Col A is INSEE code
        setInseeSearch(`${row[1]} (${row[0]})`);
        setShowInseeSuggestions(false);
    };

    // Filtered ROME options
    const filteredRome = romeOptions.filter(r =>
        r.full.toLowerCase().includes(romeSearch.toLowerCase()) ||
        form.romeCodes.includes(r.code)
    ).slice(0, 50);

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h3 className="font-bold text-gray-700 dark:text-gray-100 text-lg">Configuration Recherche</h3>
                    <p className="text-xs text-gray-400">Paramètres pour l'API France Travail</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsCreating(true); }}
                    className="flex items-center gap-2 bg-pepite-gold text-white px-4 py-2 rounded-lg hover:bg-yellow-500 font-medium text-sm transition-colors"
                >
                    <Plus size={16} /> Ajouter
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rules.map((rule) => {
                    const romeList = rule.romeCodes ? rule.romeCodes.split(',').filter(Boolean) : [];
                    const isActive = rule.active === 'TRUE';


                    return (
                        <div key={rule.index}
                            className={`
                                relative bg-white dark:bg-gray-800 rounded-xl p-5 border shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[160px]
                                ${isActive ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-75 grayscale-[0.5]'}
                             `}
                        >
                            {/* Header: Checkbox + Keyword + Actions */}
                            <div className="flex items-start gap-4 mb-2">
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedIndices.includes(rule.index)}
                                        onChange={(e) => { e.stopPropagation(); toggleSelection(rule.index); }}
                                        className="w-5 h-5 rounded border-gray-300 text-pepite-gold focus:ring-pepite-gold cursor-pointer"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight truncate pr-2">
                                            {rule.keyword || <span className="text-gray-400 italic font-normal">Sans mot-clé</span>}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onUpdate(rule.index, [isActive ? 'FALSE' : 'TRUE', rule.keyword, rule.romeCodes, rule.location, rule.locationType, rule.distance, rule.contracts]); }}
                                                className={`w-8 h-5 rounded-full p-1 transition-colors relative ${isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                title={isActive ? "Désactiver" : "Activer"}
                                            >
                                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${isActive ? 'translate-x-3' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>


                                </div>


                            </div>

                            {/* Expanded Content */}
                            {/* Body: Badges & Info */}
                            <div className="space-y-3 flex-1">
                                <div className="flex flex-wrap gap-2">
                                    {/* Location Badge */}
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                                        <MapPin size={12} className="text-pepite-gold" />
                                        <span className="truncate max-w-[120px]">
                                            {(rule.locationType === 'region' ? (REGIONS.find(r => r.code === rule.location)?.name || rule.location) : (rule.locationType === 'france' ? 'France Entière' : rule.location)) || 'France'}
                                        </span>
                                        {rule.distance && <span className="text-pepite-gold ml-0.5">+{rule.distance}km</span>}
                                    </div>

                                    {/* Contracts Badge */}
                                    {rule.contracts && rule.contracts.split(',').filter(Boolean).map(c => (
                                        <span key={c} className="text-[10px] font-bold px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                                            {getContractLabel(c)}
                                        </span>
                                    ))}
                                </div>

                                {/* ROME Summary */}
                                <div className="text-xs text-gray-500 dark:text-gray-400 italic pl-1 border-l-2 border-gray-100 dark:border-gray-700">
                                    {romeList.length > 0 ? (
                                        <span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{romeList.length}</span> code(s) ROME associé(s)
                                        </span>
                                    ) : (
                                        'Aucun code ROME'
                                    )}
                                </div>
                            </div>

                            {/* Footer: Direct Actions (Icons) */}
                            <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-50 dark:border-gray-800 transition-opacity">
                                <button
                                    onClick={() => startEdit(rule)}
                                    className="p-1.5 text-gray-400 hover:text-pepite-gold hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                                    title="Modifier"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => onDelete(rule.index)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Supprimer"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>


                        </div>
                    );
                })}
            </div>

            {/* Bulk Action Bar */}
            {selectedIndices.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-40 animate-slide-up">
                    <span className="font-bold">{selectedIndices.length} sélectionné(s)</span>
                    <div className="h-6 w-px bg-gray-700" />
                    <button
                        onClick={() => {
                            resetForm();
                            setIsBulkEditing(true);
                        }}
                        className="flex items-center gap-2 hover:text-pepite-gold transition-colors font-medium"
                    >
                        <Edit2 size={16} /> Modifier
                    </button>
                    <button
                        onClick={() => setSelectedIndices([])}
                        className="ml-2 text-gray-500 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Modal */}
            {(isCreating || editingIndex !== null || isBulkEditing) && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={resetForm}>
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700 shrink-0">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {isBulkEditing ? `Modifier ${selectedIndices.length} éléments` : (editingIndex !== null ? 'Modifier la configuration' : 'Nouvelle configuration')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {isBulkEditing ? 'Appliquez des modifications en masse aux éléments sélectionnés.' : 'Définissez les critères de recherche pour ce profil.'}
                                </p>
                            </div>
                            <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isBulkEditing && (
                                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/50">
                                    <Info size={20} className="shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-bold mb-1">Mode Édition Groupée</p>
                                        <p>Les champs que vous modifiez ici seront appliqués à <strong>tous</strong> les éléments sélectionnés. Les champs laissés intacts conserveront leur valeur actuelle pour chaque élément.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left Column: Form Fields (Span 5) */}
                                <div className="lg:col-span-5 space-y-6">
                                    {/* Actif / Keyword - Hidden in Bulk */}
                                    {!isBulkEditing && (
                                        <div className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-5">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Statut</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setForm({ ...form, active: 'TRUE' })}
                                                        className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${form.active === 'TRUE'
                                                            ? 'bg-green-50 text-green-700 border-green-200 ring-2 ring-green-500/20'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        Actif
                                                    </button>
                                                    <button
                                                        onClick={() => setForm({ ...form, active: 'FALSE' })}
                                                        className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${form.active === 'FALSE'
                                                            ? 'bg-gray-100 text-gray-700 border-gray-300 ring-2 ring-gray-500/20'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        Inactif
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mot-clé principal</label>
                                                <input
                                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-pepite-gold focus:border-transparent outline-none transition-shadow py-2.5"
                                                    value={form.keyword}
                                                    onChange={e => setForm({ ...form, keyword: e.target.value })}
                                                    placeholder="Ex: Développeur Fullstack"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Location & Contract Section */}
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-gray-500 uppercase border-b pb-1 dark:border-gray-700">Localisation</label>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Type de zone</label>
                                                <select
                                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-pepite-gold focus:border-transparent outline-none"
                                                    value={form.locationType}
                                                    onChange={e => setForm({ ...form, locationType: e.target.value, location: e.target.value === 'france' ? '' : form.location })}
                                                >
                                                    <option value="france">🇫🇷 France Entière</option>
                                                    <option value="region">🌍 Région</option>
                                                    <option value="departement">📍 Département</option>
                                                    <option value="commune">🏘️ Commune (Recherche INSEE)</option>
                                                </select>
                                            </div>

                                            {form.locationType === 'region' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Région</label>
                                                    <select
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-pepite-gold outline-none"
                                                        value={form.location}
                                                        onChange={e => setForm({ ...form, location: e.target.value })}
                                                    >
                                                        <option value="" disabled>Sélectionner une région...</option>
                                                        {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            {form.locationType === 'departement' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Numéro Département</label>
                                                    <input
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-pepite-gold outline-none"
                                                        value={form.location}
                                                        onChange={e => setForm({ ...form, location: e.target.value })}
                                                        placeholder="Ex: 33, 75, 2A"
                                                    />
                                                </div>
                                            )}

                                            {form.locationType === 'commune' && (
                                                <div className="space-y-3">
                                                    <div className="relative">
                                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Recherche Commune</label>
                                                        <input
                                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-pepite-gold outline-none"
                                                            value={inseeSearch}
                                                            onChange={e => handleInseeSearch(e.target.value)}
                                                            placeholder="Code postal ou nom de ville..."
                                                        />
                                                        {showInseeSuggestions && (
                                                            <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-xl rounded-lg mt-1 max-h-48 overflow-y-auto">
                                                                {inseeSuggestions.map((s, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-700 last:border-0"
                                                                        onClick={() => selectInsee(s)}
                                                                    >
                                                                        <span className="font-bold text-gray-800 dark:text-gray-200">{s[1]}</span>
                                                                        <span className="text-gray-400 text-xs ml-2">({s[0]})</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {form.location && <div className="text-xs text-green-600 mt-1 font-mono bg-green-50 px-2 py-1 rounded inline-block">Code INSEE : {form.location}</div>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Rayon (km)</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-pepite-gold outline-none"
                                                                value={form.distance}
                                                                onChange={e => setForm({ ...form, distance: e.target.value })}
                                                                placeholder="0"
                                                            />
                                                            <span className="text-sm text-gray-500">km autour</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase border-b pb-1 dark:border-gray-700">Type de Contrat</label>
                                            <div className="flex flex-wrap gap-2">
                                                {CONTRACT_OPTIONS.map(opt => {
                                                    const isSelected = form.contracts.includes(opt.code);
                                                    return (
                                                        <button
                                                            key={opt.code}
                                                            onClick={() => setForm(prev => ({
                                                                ...prev,
                                                                contracts: isSelected ? prev.contracts.filter(c => c !== opt.code) : [...prev.contracts, opt.code]
                                                            }))}
                                                            className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 ${isSelected
                                                                ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-md transform scale-105'
                                                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-purple-300 hover:text-purple-600'
                                                                }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: ROME Selector (Span 7) */}
                                <div className="lg:col-span-7 flex flex-col h-[500px] lg:h-auto border rounded-xl overflow-hidden dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b dark:border-gray-700 flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Codes ROME</label>
                                            <span className="text-xs bg-pepite-gold/10 text-pepite-dark px-2 py-0.5 rounded-full font-bold">
                                                {form.romeCodes.length} sélectionné(s)
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-pepite-gold transition-shadow"
                                                placeholder="Rechercher un métier ou un code..."
                                                value={romeSearch}
                                                onChange={e => setRomeSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Scrollable List */}
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white dark:bg-gray-800">
                                        {form.romeCodes.length > 0 && !romeSearch && (
                                            <div className="mb-2 pb-2 border-b border-gray-100 dark:border-gray-700/50">
                                                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sélectionnés</div>
                                                {form.romeCodes.map(code => {
                                                    const rome = romeOptions.find(r => r.code === code);
                                                    return (
                                                        <button
                                                            key={code}
                                                            onClick={() => toggleRome(code)}
                                                            className="w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between group bg-pepite-gold/5 border border-pepite-gold/20 hover:bg-red-50 hover:border-red-200 transition-colors mb-1"
                                                        >
                                                            <div className="flex flex-col items-start truncate pr-2">
                                                                <span className="truncate w-full font-medium text-gray-800 dark:text-gray-200">
                                                                    <span className="font-mono font-bold mr-2 text-pepite-dark">{code}</span>
                                                                    {rome?.label}
                                                                </span>
                                                            </div>
                                                            <X size={14} className="text-pepite-dark group-hover:text-red-500" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Résultats de recherche</div>
                                        {filteredRome.map(rome => {
                                            const selected = form.romeCodes.includes(rome.code);
                                            // Don't show already selected items in the main list to save space/reduce clutter? Or show them with active state?
                                            // Let's show them for clarity but maybe distinct style handled below
                                            if (selected && !romeSearch) return null; // Skip if already shown in top section (unless searching)

                                            return (
                                                <button
                                                    key={rome.code}
                                                    onClick={() => toggleRome(rome.code)}
                                                    className={`w-full text-left px-3 py-2.5 text-xs rounded-lg flex items-center justify-between group transition-all ${selected
                                                        ? 'bg-pepite-gold/10 text-pepite-dark font-medium border border-pepite-gold/30'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 border border-transparent hover:text-gray-900 dark:hover:text-white'
                                                        }`}
                                                >
                                                    <div className="flex flex-col items-start truncate pr-2">
                                                        <span className="truncate w-full">
                                                            <span className="font-mono font-bold mr-2 opacity-70">{rome.code}</span>
                                                            {rome.label}
                                                        </span>
                                                        {rome.qualif && <span className="text-[10px] text-gray-400 italic truncate w-full pl-8">{rome.qualif}</span>}
                                                    </div>
                                                    {selected && <Check size={14} className="text-pepite-gold shrink-0" />}
                                                </button>
                                            );
                                        })}
                                        {filteredRome.length === 0 && <div className="p-8 text-center text-sm text-gray-400 flex flex-col items-center"><Search size={24} className="mb-2 opacity-20" />Aucun résultat trouvé</div>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl flex justify-end gap-3 shrink-0">
                            <button
                                onClick={resetForm}
                                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={isBulkEditing ? handleBulkSave : handleSave}
                                className="px-8 py-2.5 bg-pepite-gold text-white text-sm font-bold rounded-lg hover:bg-yellow-500 shadow-lg shadow-yellow-500/20 transform active:scale-95 transition-all flex items-center gap-2"
                            >
                                {isBulkEditing ? (
                                    <><Edit2 size={16} /> Appliquer</>
                                ) : (
                                    <><Save size={16} /> Enregistrer</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SettingsView = ({ settings, updateSheetValues, appendSheetRow, loading }) => {
    const [activeTab, setActiveTab] = useState('recherche');

    // --- SEARCH / ROME HANDLERS ---
    const handleUpdateSearch = (rowIndex, newValues) => {
        const sheetRowNumber = rowIndex + 2;
        updateSheetValues(`Config_Recherche!A${sheetRowNumber}`, [newValues]);
    };

    const handleAddSearch = (newValues) => {
        appendSheetRow('Config_Recherche', newValues);
    };

    const handleDeleteSearch = (rowIndex) => {
        const newData = [...settings.recherche];
        newData.splice(rowIndex, 1);

        // Padding for safety
        const emptyRow = ["", "", "", "", "", ""];
        newData.push(emptyRow);
        newData.push(emptyRow);

        updateSheetValues('Config_Recherche!A2', newData);
    };

    const handleBulkUpdateSearch = (newData) => {
        updateSheetValues('Config_Recherche!A2', newData);
    };

    const handleUpdateFilter = (rowIndex, newValues) => {
        const sheetRowNumber = rowIndex + 2;
        updateSheetValues(`Config_Filtres!A${sheetRowNumber}`, [newValues]);
    };

    const handleAddFilter = (newValues) => {
        appendSheetRow('Config_Filtres', newValues);
    };

    const handleDeleteFilter = (rowIndex) => {
        // Rewrite strategy: Remove the item, shift everything up, and clears the tail.
        // We assume settings.filtres corresponds to Config_Filtres!A2:Fx range logic.

        const newData = [...settings.filtres];
        newData.splice(rowIndex, 1); // Remove the row

        // Pad with empty rows to ensure we overwrite any old data at the bottom
        const emptyRow = ["", "", "", "", "", "", ""];
        newData.push(emptyRow);
        newData.push(emptyRow);
        newData.push(emptyRow);

        updateSheetValues('Config_Filtres!A2', newData);
    };

    const { executeAction, isSubmitting: isRecalculating } = useWebhook();

    // ... (keep earlier code)

    const [webhookError, setWebhookError] = useState(null);

    const handleRecalculate = async () => {
        if (!settings.filtres) return;
        setWebhookError(null);

        const result = await executeAction('RECALCULATE_SCORES', 'batch', { timestamp: new Date().toISOString() });

        if (!result || !result.success) {
            setWebhookError(result?.error || "Erreur inconnue");
            setTimeout(() => setWebhookError(null), 5000); // Clear after 5s
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Header Tabs */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 pt-6 sticky top-0 z-20">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Paramètres</h1>
                <div className="flex gap-6">
                    <button onClick={() => setActiveTab('recherche')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'recherche' ? 'border-pepite-gold text-pepite-gold' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        <div className="flex items-center gap-2"><Search size={18} /> Recherche & ROME</div>
                    </button>
                    <button onClick={() => setActiveTab('filtres')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'filtres' ? 'border-pepite-gold text-pepite-gold' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        <div className="flex items-center gap-2"><Filter size={18} /> Filtres & Règles</div>
                    </button>
                    <button onClick={() => setActiveTab('wsysteme')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'wsysteme' ? 'border-pepite-gold text-pepite-gold' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        <div className="flex items-center gap-2"><Settings size={18} /> Système</div>
                    </button>
                </div>
            </div>

            {/* Content Content */}
            <div className="p-6 flex-1 overflow-auto">
                {activeTab === 'wsysteme' && <SystemTab data={settings.systeme} />}
                {activeTab === 'filtres' && <VisualFiltersTab data={settings.filtres} onUpdate={handleUpdateFilter} onAdd={handleAddFilter} onDelete={handleDeleteFilter} onRecalculate={handleRecalculate} loading={loading || isRecalculating} webhookError={webhookError} />}
                {activeTab === 'recherche' && (
                    <SearchTab
                        searchData={settings.recherche}
                        romeData={settings.rome}
                        inseeData={settings.insee}
                        onUpdate={handleUpdateSearch}
                        onAdd={handleAddSearch}
                        onDelete={handleDeleteSearch}
                        onBulkUpdate={handleBulkUpdateSearch}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
};

export default SettingsView;
