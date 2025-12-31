import React, { useState } from 'react';
import { Settings, Filter, Search, Plus, Trash2, Save, X, Edit2, AlertCircle } from 'lucide-react';
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

/* --- SUB-COMPONENT: RECHERCHE TAB (ROME) --- */
const SearchTab = ({ searchData, romeData }) => {
    if (!searchData || searchData.length === 0) return <div className="text-gray-500">Aucune configuration de recherche.</div>;

    const headers = searchData[0] || ["Mots Clés", "Codes ROME"];
    const rows = searchData.slice(1);

    return (
        <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/50 flex gap-3 text-yellow-800 dark:text-yellow-500 text-sm">
                <AlertCircle size={20} className="shrink-0" />
                <div>
                    <strong>Note:</strong> La modification du mapping ROME n'est pas encore disponible dans cette version.
                    Veuillez modifier directement la feuille <code>Config_Recherche</code>.
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Mapping Actuel</h3>
                    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="min-w-full text-sm text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                                <tr><th>Mots Clés</th><th>Codes ROME</th></tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-3 font-medium">{row[0]}</td>
                                        <td className="p-3 font-mono text-xs text-blue-600 dark:text-blue-400">{row[1]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Référentiel ROME (Aperçu)</h3>
                    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                        <table className="min-w-full text-sm text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 sticky top-0">
                                <tr><th>Code</th><th>Libellé</th></tr>
                            </thead>
                            <tbody>
                                {romeData.slice(1, 100).map((row, i) => ( // Limit display
                                    <tr key={i} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-2 font-mono text-xs font-bold text-gray-600 dark:text-gray-400">{row[0]}</td>
                                        <td className="p-2">{row[1]}</td>
                                    </tr>
                                ))}
                                {romeData.length > 100 && <tr><td colSpan="2" className="p-2 text-center text-gray-400 italic">... {romeData.length - 100} autres fiches ...</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

const SettingsView = ({ settings, updateSheetValues, appendSheetRow, jobs, updateJobStatus, loading }) => {
    const [activeTab, setActiveTab] = useState('filtres');

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
                    <button onClick={() => setActiveTab('filtres')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'filtres' ? 'border-pepite-gold text-pepite-gold' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        <div className="flex items-center gap-2"><Filter size={18} /> Filtres & Règles</div>
                    </button>
                    <button onClick={() => setActiveTab('recherche')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'recherche' ? 'border-pepite-gold text-pepite-gold' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        <div className="flex items-center gap-2"><Search size={18} /> Recherche & ROME</div>
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
                {activeTab === 'recherche' && <SearchTab searchData={settings.recherche} romeData={settings.rome} />}
            </div>
        </div>
    );
};

export default SettingsView;
