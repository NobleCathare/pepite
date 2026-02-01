import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, Filter, Search, Plus, Trash2, Save, X, Edit2, AlertCircle, MapPin, Check, Info, User, QrCode, Globe, ChevronDown, Cpu, Eye } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

import { useUser } from '../../hooks/useUser';
import { useAuth } from '../../context/AuthContext';
import { pb } from '../../services/pb';
import IaSettingsTab from '../settings/IaSettingsTab';

const EMPTY_ARRAY = [];

/* --- NETWORK DEBUG PROBE --- */
const NetProbe = () => {
    const [status, setStatus] = useState('PENDING');
    const [log, setLog] = useState('');

    useEffect(() => {
        const runProbe = async () => {
            try {
                // Direct Fetch Check (User Profile) - USING TRUNCATED 15-CHAR ID
                const res = await fetch('https://pocketbase.circumambule.synology.me/api/collections/users/records/oyIrfuuqjuXzcZq');
                setStatus(res.status);
                if (res.ok) {
                    const json = await res.json();
                    setLog("KEYS: " + Object.keys(json).join(", "));
                } else {
                    setLog("ERROR: " + res.statusText);
                }
            } catch (err) {
                setStatus('CRASH');
                setLog("NETWORK/CORS: " + err.message);
            }
        };
        runProbe();
    }, []);

    return (
        <div className="fixed bottom-4 left-4 p-4 bg-red-900 text-white text-xs font-mono rounded shadow-lg z-50 max-w-sm pointer-events-none opacity-80">
            <strong>NET PROBE:</strong><br />
            STATUS: {status}<br />
            MSG: {log}
        </div>
    );
};

/* --- SUB-COMPONENT: SYSTEM TAB --- */
const SystemTab = ({ setHeaderActions }) => {
    useEffect(() => { setHeaderActions(null); }, [setHeaderActions]);
    return <div className="text-gray-500 italic p-8">Configuration système (Lecture seule)</div>;
};

/* --- SUB-COMPONENT: PROFILE TAB --- */
const ProfileTab = ({ profile, onUpdate, loading, setHeaderActions }) => {
    const { currentUser } = useAuth();
    const [form, setForm] = useState(profile || {});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentUser && (!form.email || !form.prenom || !form.nom)) {
            const splitName = (currentUser.displayName || '').split(' ');
            setForm(prev => ({
                ...prev,
                email: prev.email || currentUser.email,
                prenom: prev.prenom || splitName[0] || '',
                nom: prev.nom || splitName.slice(1).join(' ') || '',
            }));
        }
    }, [currentUser, form.email, form.prenom, form.nom]);

    useEffect(() => {
        if (profile) setForm(prev => ({ ...prev, ...profile }));
    }, [profile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            await onUpdate(form);
        } catch (error) {
            console.error("Save failed", error);
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setSaving(false);
        }
    }, [form, onUpdate]);

    useEffect(() => {
        setHeaderActions(
            <div className="flex gap-2">
                <button
                    onClick={handleSave}
                    disabled={loading || saving}
                    className="flex items-center gap-2 bg-pepite-gold text-white px-6 py-2 rounded-lg shadow hover:bg-yellow-500 font-bold text-sm transition-all disabled:opacity-50"
                >
                    <Save size={16} /> {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
            </div>
        );
    }, [setHeaderActions, handleSave, loading]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Coordonnées */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="mb-6">
                    <h3 className="font-bold text-gray-700 dark:text-gray-100 text-lg">Mon Profil & Coordonnées</h3>
                    <p className="text-xs text-gray-400">Ces informations sont utilisées pour générer vos CV et lettres de motivation.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">Prénom</label>
                                <input name="prenom" value={form.prenom || ''} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom</label>
                                <input name="nom" value={form.nom || ''} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                            <input name="email" value={form.email || currentUser?.email || ''} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Téléphone</label>
                            <input name="telephone" value={form.telephone || ''} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CP</label>
                                <input name="cp" value={form.cp || form.code_postal || ''} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ville</label>
                                <input name="ville" value={form.ville || ''} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lien LinkedIn Profile</label>
                            <input name="linkedin_url" value={form.linkedin_url || ''} onChange={handleChange} placeholder="https://www.linkedin.com/in/..." className="w-full border rounded-lg p-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Le QR Code sera généré automatiquement à l'enregistrement.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL CV Public (Google Doc)</label>
                            <input name="master_cv_id" value={form.master_cv_id || ''} onChange={handleChange} placeholder="https://docs.google.com/document/d/e/2PACX.../pub" className="w-full border rounded-lg p-2 text-sm font-mono bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Fichier &gt; Partager &gt; Publier sur le web &gt; Copier le lien</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                            <QrCode size={14} /> QR Code LinkedIn
                        </label>
                        {form.qr_code_base64 ? (
                            <div className="relative group">
                                <img src={form.qr_code_base64} alt="QR Code" className="w-48 h-48 object-contain rounded-lg shadow-md bg-white p-2" />
                            </div>
                        ) : (
                            <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-4">
                                Renseignez votre lien LinkedIn et enregistrez pour générer le QR Code.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Options PDF */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="mb-6">
                    <h3 className="font-bold text-gray-700 dark:text-gray-100 text-lg flex items-center gap-2">
                        <span className="w-6 h-6 bg-pepite-gold rounded flex items-center justify-center text-white text-xs">📄</span>
                        Personnalisation PDF
                    </h3>
                    <p className="text-xs text-gray-400">Ces options s'appliquent à vos CV et lettres générés.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Couleur Principale</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                name="pdf_accent_color"
                                value={form.pdf_accent_color || '#2c3e50'}
                                onChange={handleChange}
                                className="w-12 h-12 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-1 bg-white dark:bg-gray-900"
                            />
                            <div className="flex-1">
                                <input
                                    name="pdf_accent_color"
                                    value={form.pdf_accent_color || '#2c3e50'}
                                    onChange={handleChange}
                                    className="w-full border rounded-lg p-2 text-sm font-mono bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Couleur de la sidebar et des accents du CV/LM</p>
                            </div>
                        </div>
                        {/* Preset Colors */}
                        <div className="flex gap-2 mt-3">
                            {[
                                { color: '#2c3e50', name: 'Bleu Professionnel (défaut)' },
                                { color: '#D4AF37', name: 'Pépite Gold' },
                                { color: '#1e40af', name: 'Bleu Royal' },
                                { color: '#059669', name: 'Vert Success' },
                                { color: '#7C3AED', name: 'Violet Créatif' },
                                { color: '#dc2626', name: 'Rouge Impact' }
                            ].map(preset => (
                                <button
                                    key={preset.color}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, pdf_accent_color: preset.color }))}
                                    title={preset.name}
                                    className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${form.pdf_accent_color === preset.color || (!form.pdf_accent_color && preset.color === '#2c3e50') ? 'border-gray-800 dark:border-white ring-2 ring-offset-2 ring-gray-400' : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: preset.color }}
                                />
                            ))}
                        </div>

                        {/* Preview Button */}
                        <button
                            type="button"
                            onClick={() => {
                                // Open preview in new tab with current color
                                const previewUrl = `/preview-pdf?color=${encodeURIComponent(form.pdf_accent_color || '#2c3e50')}&name=${encodeURIComponent(form.prenom || '')}+${encodeURIComponent(form.nom || '')}`;
                                window.open(previewUrl, '_blank', 'width=900,height=1200');
                            }}
                            className="mt-4 flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                            <Eye size={16} />
                            Prévisualiser le template PDF
                        </button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-3">Aperçu des informations PDF</p>
                        <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <span className="font-bold w-20">Nom :</span>
                                <span>{form.prenom || '—'} {form.nom || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold w-20">Domicile :</span>
                                <span>{form.cp || '—'} {form.ville || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold w-20">Téléphone :</span>
                                <span>{form.telephone || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold w-20">Email :</span>
                                <span className="truncate">{form.email || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold w-20">LinkedIn :</span>
                                <span className="truncate">{form.linkedin_url ? '✓ Configuré' : '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold w-20">QR Code :</span>
                                <span>{form.qr_code_base64 ? '✓ Généré' : '—'}</span>
                            </div>
                        </div>

                        {/* Mini Color Preview */}
                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-[10px] text-gray-400 mb-2">Aperçu couleur sidebar</p>
                            <div
                                className="h-16 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: form.pdf_accent_color || '#2c3e50' }}
                            >
                                <span className="text-xl uppercase">{form.prenom?.charAt(0) || 'F'}{form.nom?.charAt(0) || 'F'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --- EDIT RULE MODAL --- */
const EditRuleModal = ({ rule, onSave, onClose, onDelete }) => {
    const [formData, setFormData] = useState({ ...rule });
    useEffect(() => { setFormData({ ...rule }); }, [rule]);
    const handleChange = (field, value) => { setFormData(prev => ({ ...prev, [field]: value })); };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-200 dark:border-gray-700 space-y-5">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center gap-2"><Edit2 size={20} className="text-pepite-gold" /> Édition de la Règle</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X size={20} className="text-gray-500" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                        <select className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium" value={formData.type || 'BONUS'} onChange={e => handleChange('type', e.target.value)}>
                            <option value="BONUS">BONUS (+)</option><option value="PENALTY">PENALTY (-)</option><option value="BLACKLIST">BLACKLIST</option><option value="WHITELIST">WHITELIST</option>
                        </select>
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Catégorie</label>
                        <select className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium" value={formData.category || 'Autre'} onChange={e => handleChange('category', e.target.value)}>
                            <option value="Titre">Titre</option><option value="Description">Description</option><option value="Entreprise">Entreprise</option><option value="Contrat">Contrat</option><option value="Autre">Autre</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mot-Clé / Valeur</label>
                        <input className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-bold" value={formData.value || ''} onChange={e => handleChange('value', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Score</label>
                        <input type="number" className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-mono" value={formData.score || 0} onChange={e => handleChange('score', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-1 flex items-center pt-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={formData.active !== false} onChange={e => handleChange('active', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-pepite-gold" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Active</span>
                        </label>
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Raison</label>
                        <textarea className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-xs h-20 resize-none" value={formData.reason || ''} onChange={e => handleChange('reason', e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => { if (confirm('Supprimer ?')) onDelete(formData.id); }} className="flex items-center gap-2 text-red-500 hover:text-red-600 px-3 py-2 rounded-lg text-sm font-bold"><Trash2 size={16} /> Supprimer</button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-gray-500 rounded-lg text-sm font-bold">Annuler</button>
                        <button onClick={() => onSave(formData)} className="px-6 py-2 bg-pepite-gold text-white rounded-lg hover:bg-yellow-500 text-sm font-bold">Enregistrer</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --- VISUALIZER HELPER --- */
const VisualizerChart = ({ rules, onUpdateRule, onEditRule }) => {
    const getLeftPos = (score) => `${((Math.max(-100, Math.min(100, score)) + 100) / 200) * 100}%`;
    const containerRef = React.useRef(null);
    const [draggingId, setDraggingId] = useState(null);
    const [localDragState, setLocalDragState] = useState(null);
    const dragStartRef = React.useRef({ x: 0, moved: false });

    const handleMouseDown = (e, rule) => {
        e.preventDefault(); setDraggingId(rule.id); dragStartRef.current = { x: e.clientX, moved: false };
        const container = containerRef.current.getBoundingClientRect(); const startX = e.clientX; const initialScore = rule.score;
        const handleMouseMove = (ev) => {
            const deltaX = ev.clientX - startX;
            if (Math.abs(deltaX) > 2) dragStartRef.current.moved = true;
            let newScore = Math.max(-100, Math.min(100, initialScore + Math.round(deltaX * (200 / container.width))));
            setLocalDragState({ id: rule.id, currentScore: newScore });
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp);
            setLocalDragState(cur => { if (cur) onUpdateRule({ ...rule, score: cur.currentScore }); return null; }); setDraggingId(null);
        };
        document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
    };

    const sortedRules = [...rules].sort((a, b) => (a.value || '').localeCompare(b.value || ''));
    const ROW_HEIGHT = 28;
    const totalHeight = Math.max(500, sortedRules.length * ROW_HEIGHT + 100);

    return (
        <div className="bg-gray-900 rounded-b-xl border border-t-0 border-gray-800 shadow-inner overflow-hidden select-none relative" ref={containerRef} style={{ height: `${totalHeight}px` }}>
            <div className="absolute inset-0 pointer-events-none sticky top-48 h-screen w-full">
                <div className="absolute left-1/2 w-px bg-gray-700 h-full"></div>
                <div className="absolute left-1/2 top-2 -translate-x-1/2 text-xs font-mono text-gray-500 bg-gray-900 px-1 rounded z-10">0</div>
                <div className="absolute inset-x-0 top-10 flex justify-between px-10 text-4xl font-black tracking-widest uppercase opacity-20"><span className="text-red-900">Malus</span><span className="text-green-900">Bonus</span></div>
                <div className="absolute left-1/4 w-px bg-gray-800/50 border-r border-dashed border-gray-800 h-full" /><div className="absolute left-3/4 w-px bg-gray-800/50 border-r border-dashed border-gray-800 h-full" />
            </div>
            {sortedRules.map((rule, index) => {
                const isDragging = draggingId === rule.id;
                const scoreDisplay = isDragging && localDragState ? localDragState.currentScore : rule.score;
                const leftPos = getLeftPos(scoreDisplay);
                const topPos = index * ROW_HEIGHT + 60;
                let chipColorClass = scoreDisplay > 0 ? "bg-green-900/80 text-green-300 border-green-700" : scoreDisplay < 0 ? "bg-red-900/80 text-red-300 border-red-700" : "bg-gray-700 text-gray-300 border-gray-600";
                if (rule.type === 'BLACKLIST') chipColorClass = "bg-black text-red-500 border-red-600 border-2";
                return (
                    <div key={rule.id} onMouseDown={(e) => handleMouseDown(e, rule)} onClick={(e) => { e.stopPropagation(); if (!dragStartRef.current.moved) onEditRule(rule); }}
                        style={{ left: leftPos, top: `${topPos}px`, transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out', zIndex: isDragging ? 50 : 10 }}
                        className={`absolute -translate-x-1/2 cursor-grab active:cursor-grabbing px-2 py-0.5 rounded-sm border text-[10px] font-bold flex items-center gap-2 group whitespace-nowrap ${chipColorClass} hover:scale-110 hover:z-40 transition-transform`}>
                        <span className="truncate max-w-[200px]">{rule.value}</span>
                        <span className={`px-1 rounded bg-black/30 font-mono text-[9px] ${rule.score === 0 ? 'opacity-50' : ''}`}>{scoreDisplay}</span>
                        <div className={`absolute top-1/2 ${scoreDisplay > 0 ? 'right-full w-[1000px] origin-right' : 'left-full w-[1000px] origin-left'} scale-x-0 group-hover:scale-x-100 h-px bg-white/20 transition-transform duration-300 pointer-events-none`}></div>
                    </div>
                );
            })}
        </div>
    );
};

/* --- VISUAL FILTERS TAB --- */
const VisualFiltersTab = ({ data = [], onUpdate, loading, setHeaderActions }) => {
    const ORDERED_CATEGORIES = ['Contrat', 'Titre', 'Description', 'Entreprise'];
    const rules = useMemo(() => Array.isArray(data) ? data.map((r, i) => {
        return {
            id: r.id || i,
            category: r.category || r[1],
            value: r.value || r[2],
            active: r.active !== undefined ? r.active : (r[3] === 'TRUE'),
            score: parseInt(r.score || r[4] || 0),
            reason: r.reason || r[5] || '',
            type: r.type || r[6] || (parseInt(r.score || r[4] || 0) < -500 ? 'BLACKLIST' : 'BONUS')
        };
    }) : [], [data]);

    const availableCategories = [...new Set(rules.map(r => r.category))].filter(Boolean);
    const categories = Array.from(new Set([...ORDERED_CATEGORIES, ...availableCategories])).sort((a, b) => {
        const indexA = ORDERED_CATEGORIES.indexOf(a);
        const indexB = ORDERED_CATEGORIES.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    const [activeCategory, setActiveCategory] = useState(categories[0] || 'Titre');
    const [editingRule, setEditingRule] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newRule, setNewRule] = useState({ category: '', value: '', score: 10, type: 'BONUS', reason: '', active: true });

    const catRules = rules.filter(r => r.category === activeCategory);
    const handleSaveRule = useCallback((rule) => {
        let newRules = [...rules];
        const existingIndex = newRules.findIndex(r => r.id === rule.id);
        if (existingIndex >= 0) newRules[existingIndex] = rule;
        else newRules.push({ ...rule, active: true, id: Date.now(), date_creation: new Date().toLocaleDateString() });
        onUpdate(newRules); setEditingRule(null); setIsCreating(false);
    }, [rules, onUpdate]);

    const handleDeleteRule = useCallback((id) => { const newRules = rules.filter(r => r.id !== id); onUpdate(newRules); setEditingRule(null); }, [rules, onUpdate]);

    useEffect(() => {
        setHeaderActions(
            <div className="flex gap-2">
                <button
                    onClick={loading ? null : () => onUpdate([...rules])}
                    className="flex items-center gap-2 bg-pepite-bronze text-white px-4 py-2 rounded-lg hover:bg-yellow-600 font-medium text-sm shadow-sm"
                >
                    <Save size={16} /> Valider & Recalculer
                </button>
                <button
                    onClick={() => { setIsCreating(true); setNewRule({ category: activeCategory, value: '', score: 10, type: 'BONUS', reason: '', active: true }); }}
                    className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-black font-medium text-sm shadow-sm"
                >
                    <Plus size={16} /> Ajouter
                </button>
            </div>
        );
    }, [setHeaderActions, activeCategory, loading, rules]);

    return (
        <div className="pb-20">
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-20">
                <div className="flex px-4 overflow-x-auto bg-gray-50 dark:bg-gray-800/50">
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeCategory === cat ? 'border-pepite-gold text-pepite-gold bg-white dark:bg-gray-900 rounded-t-lg' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                            {cat} <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 rounded-full">{ruleCount(rules, cat)}</span>
                        </button>
                    ))}
                </div>
            </div>
            <VisualizerChart rules={catRules} onUpdateRule={handleSaveRule} onEditRule={(r) => setEditingRule(r)} />
            {(isCreating || editingRule) && <EditRuleModal rule={editingRule || newRule} onSave={handleSaveRule} onClose={() => { setIsCreating(false); setEditingRule(null); }} onDelete={editingRule ? handleDeleteRule : undefined} />}
        </div>
    );
};
const ruleCount = (rules, cat) => rules.filter(r => r.category === cat).length;

const REGIONS = [
    { code: '11', label: 'Île-de-France' },
    { code: '24', label: 'Centre-Val de Loire' },
    { code: '27', label: 'Bourgogne-Franche-Comté' },
    { code: '28', label: 'Normandie' },
    { code: '32', label: 'Hauts-de-France' },
    { code: '44', label: 'Grand Est' },
    { code: '52', label: 'Pays de la Loire' },
    { code: '53', label: 'Bretagne' },
    { code: '75', label: 'Nouvelle-Aquitaine' },
    { code: '76', label: 'Occitanie' },
    { code: '84', label: 'Auvergne-Rhône-Alpes' },
    { code: '93', label: 'Provence-Alpes-Côte d\'Azur' },
    { code: '94', label: 'Corse' }
];

// Helper for safe string
const str = (val) => val ? val.toString() : '';

/* --- HELPER INPUT COMPONENTS --- */
const LocationInput = ({ location, onChange }) => {
    let initialType = 'Ville';
    let initialValue = location || '';

    if (location && location.includes('|')) {
        const parts = location.split('|');
        initialType = parts[0];
        initialValue = parts.slice(1).join('|');
    } else if (location === 'France' || location === 'FranceEntière') {
        initialType = 'France';
        initialValue = '';
    }

    const [type, setType] = useState(initialType);
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (location) {
            if (location.includes('|')) {
                const parts = location.split('|');
                setType(parts[0]);
                setValue(parts.slice(1).join('|'));
            } else if (location === 'France') {
                setType('France');
                setValue('');
            } else {
                setType('Ville');
                setValue(location);
            }
        }
    }, [location]);

    const handleTypeChangeInternal = (newType) => {
        setType(newType);
        const newVal = '';
        setValue(newVal);
        onChange(newType === 'France' ? 'France' : `${newType}|`);
    };

    const handleValueChangeInternal = (newValue) => {
        setValue(newValue);
        onChange(`${type}|${newValue}`);
    };

    return (
        <div className="relative flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-visible focus-within:ring-1 focus-within:ring-pepite-gold">
            <select value={type} onChange={(e) => handleTypeChangeInternal(e.target.value)} className="bg-gray-100 dark:bg-gray-800 text-xs font-bold px-2 py-2 border-r dark:border-gray-700 outline-none w-1/3 cursor-pointer text-gray-800 dark:text-white">
                <option value="France" className="text-gray-900 bg-white">France</option>
                <option value="Region" className="text-gray-900 bg-white">Région</option>
                <option value="Departement" className="text-gray-900 bg-white">Département</option>
                <option value="Ville" className="text-gray-900 bg-white">Ville</option>
            </select>

            {type === 'France' ? (
                <div className="w-2/3 px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-500 italic">Toute la France</div>
            ) : type === 'Region' ? (
                <select
                    value={value}
                    onChange={(e) => handleValueChangeInternal(e.target.value)}
                    className="w-2/3 px-3 py-2 text-sm font-medium bg-transparent outline-none cursor-pointer text-gray-800 dark:text-white"
                >
                    <option value="" className="text-gray-900 bg-white">Choisir une région...</option>
                    {REGIONS.map(r => <option key={r.code} value={r.code} className="text-gray-900 bg-white">{r.label}</option>)}
                </select>
            ) : (
                <input
                    type="number"
                    value={value}
                    onChange={(e) => handleValueChangeInternal(e.target.value)}
                    placeholder={type === 'Ville' ? 'Code Postal (ex: 34000)' : 'N° Dept (ex: 34)'}
                    className="w-2/3 px-3 py-2 text-sm font-medium bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-600 font-mono"
                />
            )}
        </div>
    );
};

/* --- HELPER: ROME DATA LOADER --- */
let romeCache = null;
const useRomeData = () => {
    const [romeCodes, setRomeCodes] = useState(romeCache || []);
    useEffect(() => {
        if (romeCache) return;
        pb.collection('ref_rome').getFullList({ sort: 'Intitule_Rome' })
            .then(records => {
                const raw = records.map(r => ({
                    code: r.Code_Rome,
                    label: r.Intitule_Rome
                }));
                // Deduplicate by Code+Label
                const unique = raw.filter((v, i, a) => a.findIndex(t => (t.code === v.code && t.label === v.label)) === i);
                romeCache = unique;
                setRomeCodes(unique);
            })
            .catch(err => console.error("Error loading ROME data from PB:", err));
    }, []);
    return romeCodes;
};

/* --- COMPONENT: ROME CODE INPUT --- */
const RomeCodeInput = ({ value, onChange }) => {
    const romeData = useRomeData();
    const [search, setSearch] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const selectedCodes = Array.isArray(value) ? value : (value ? value.split(',').map(s => s.trim()).filter(Boolean) : []);

    useEffect(() => {
        if (search.length < 2) { setSuggestions([]); return; }
        const lower = search.toLowerCase();
        const filtered = romeData.filter(item => item.label.toLowerCase().includes(lower) || item.code.toLowerCase().includes(lower)).slice(0, 10);
        setSuggestions(filtered);
    }, [search, romeData]);

    const addCode = (code) => { if (!selectedCodes.includes(code)) { onChange([...selectedCodes, code].join(',')); } setSearch(''); setSuggestions([]); };
    const removeCode = (codeToRemove) => { onChange(selectedCodes.filter(c => c !== codeToRemove).join(',')); };
    const getLabel = (code) => { const found = romeData.find(r => r.code === code); return found ? found.label : code; };

    return (
        <div className="w-full flex items-start gap-2">
            <div className="flex-1 flex flex-wrap gap-1.5 min-h-[32px] content-center">
                {selectedCodes.length === 0 && <span className="text-gray-400 text-[10px] italic py-1">Aucun code ROME sélectionné</span>}
                {selectedCodes.map(code => (
                    <div key={code} title={getLabel(code)} className="group bg-pepite-gold/10 text-pepite-gold border border-pepite-gold/30 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-help hover:bg-pepite-gold hover:text-white transition-colors">
                        <span>{code}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeCode(code); }} className="hover:text-red-500 group-hover:text-white/80 ml-0.5"><X size={10} /></button>
                    </div>
                ))}
            </div>
            <div className="relative w-40 shrink-0">
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus-within:ring-1 focus-within:ring-pepite-gold transition-all">
                    <Search size={12} className="ml-2 text-gray-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ajouter (Code/Nom)..." className="w-full bg-transparent p-1.5 text-[10px] font-medium outline-none placeholder-gray-400" />
                </div>
                {suggestions.length > 0 && (
                    <div className="absolute z-50 right-0 top-full mt-1 w-64 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {suggestions.map(item => (
                            <button key={item.code} onClick={() => addCode(item.code)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 flex justify-between items-center group border-b border-gray-100 dark:border-gray-900 last:border-0">
                                <span className="font-bold text-gray-700 dark:text-gray-100 truncate pr-2">{item.label}</span>
                                <span className="text-gray-400 font-mono text-[10px] bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded group-hover:bg-white shrink-0">{item.code}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

/* --- SUB-COMPONENT: SEARCH TAB (LIST MODE + FULL WIDTH ROME) --- */
const SearchTab = ({ data = [], onUpdate, loading, setHeaderActions }) => {
    const [localRules, setLocalRules] = useState([]);
    const [isDirty, setIsDirty] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Global Source Configuration State (Persisted in localStorage)
    const [sources, setSources] = useState(() => {
        const saved = localStorage.getItem('sasre_source_config');
        return saved ? JSON.parse(saved) : { FT: true, WTTJ: true, RSS: false };
    });

    const [importUrl, setImportUrl] = useState('');
    const [importing, setImporting] = useState(false);

    // Persist sources on change
    useEffect(() => {
        localStorage.setItem('sasre_source_config', JSON.stringify(sources));
    }, [sources]);

    useEffect(() => {
        const formatted = Array.isArray(data) ? data.map((r, i) => {
            if (!Array.isArray(r)) return { ...r, id: r.id || Date.now() + i };
            return { id: Date.now() + i, active: r[0] === 'TRUE', keyword: r[1] || '', romeCodes: r[2] || '', location: r[3] || '', distance: r[5] || 0 };
        }) : [];
        setLocalRules(formatted);
    }, [data]);

    const handleChange = (id, field, value) => { const updated = localRules.map(r => r.id === id ? { ...r, [field]: value } : r); setLocalRules(updated); setIsDirty(true); };
    const handleToggle = (id) => { const updated = localRules.map(r => r.id === id ? { ...r, active: !r.active } : r); setLocalRules(updated); setIsDirty(true); };
    const handleDelete = (id) => {
        if (confirm("Supprimer ?")) {
            const updated = localRules.filter(r => r.id !== id); setLocalRules(updated); setIsDirty(true);
            const newSelected = new Set(selectedIds); newSelected.delete(id); setSelectedIds(newSelected);
        }
    };
    const handleSelectAll = (e) => { if (e.target.checked) { setSelectedIds(new Set(localRules.map(r => r.id))); } else { setSelectedIds(new Set()); } };
    const handleSelectOne = (id) => { const newSelected = new Set(selectedIds); if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id); setSelectedIds(newSelected); };
    const handleBulkDelete = () => { if (confirm(`Supprimer ${selectedIds.size} règle(s) ?`)) { const updated = localRules.filter(r => !selectedIds.has(r.id)); setLocalRules(updated); setIsDirty(true); setSelectedIds(new Set()); } };
    const handleBulkToggle = (status) => { const updated = localRules.map(r => selectedIds.has(r.id) ? { ...r, active: status } : r); setLocalRules(updated); setIsDirty(true); };
    const handleAdd = useCallback(() => { setLocalRules([{ id: Date.now(), active: true, keyword: 'Nouveau', romeCodes: '', location: 'Ville|', distance: 30 }, ...localRules]); setIsDirty(true); }, [localRules]);
    const handleSaveAll = useCallback(() => { onUpdate(localRules); setIsDirty(false); }, [onUpdate, localRules]);

    const handleImportUrl = async () => {
        if (!importUrl) return;
        setImporting(true);
        try {
            // Import dymanique pour éviter erreur SSR/Init si le module n'est pas chargé
            const { importJobFromUrl, pb } = await import('../../services/jobSourcingService');
            // Assuming we can get userID from context or pb.authStore
            const userId = pb.authStore.model?.id;
            if (!userId) throw new Error("Utilisateur non connecté");

            await importJobFromUrl(importUrl, userId);

            // On pourrait appeler une fonction de succès ou toast ici
            alert("Annonce importée avec succès ! (Voir onglet Triage)");
            setImportUrl('');
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'import : " + error.message);
        } finally {
            setImporting(false);
        }
    };

    useEffect(() => {
        setHeaderActions(
            <div className="flex gap-2 items-center">
                {selectedIds.size > 0 && (
                    <div className="flex gap-2 mr-4 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
                        <span className="text-xs font-bold text-blue-800 dark:text-blue-200 flex items-center mr-2">{selectedIds.size} sélectionné(s)</span>
                        <button onClick={() => handleBulkToggle(true)} className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded text-green-600 dark:text-green-400 text-xs font-bold" title="Activer">ON</button>
                        <button onClick={() => handleBulkToggle(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 text-xs font-bold" title="Désactiver">OFF</button>
                        <div className="w-px bg-blue-200 dark:bg-blue-700 mx-1 h-4 self-center"></div>
                        <button onClick={handleBulkDelete} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500 dark:text-red-400" title="Supprimer"><Trash2 size={14} /></button>
                    </div>
                )}
                <button onClick={handleAdd} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm"><Plus size={16} /> Ajouter</button>
                {isDirty && <button onClick={handleSaveAll} className="flex items-center gap-2 bg-pepite-gold text-white px-4 py-2 rounded-lg hover:bg-yellow-500 font-medium text-sm animate-pulse"><Save size={16} /> Sauvegarder</button>}
            </div>
        );
    }, [setHeaderActions, isDirty, localRules, selectedIds]);

    return (
        <div className="pb-20 space-y-6">

            {/* --- SOURCES BAR --- */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sources</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSources(s => ({ ...s, FT: !s.FT }))} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${sources.FT ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-200 grayscale'}`}>
                            <Globe size={14} /> France Travail
                        </button>
                        <button onClick={() => setSources(s => ({ ...s, WTTJ: !s.WTTJ }))} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${sources.WTTJ ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-gray-100 text-gray-400 border border-gray-200 grayscale'}`}>
                            <Globe size={14} /> WTTJ
                        </button>
                        <button onClick={() => setSources(s => ({ ...s, RSS: !s.RSS }))} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${sources.RSS ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-400 border border-gray-200 grayscale'}`}>
                            <Globe size={14} /> RSS
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            placeholder="Importer une annonce (URL)..."
                            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-pepite-gold transition-colors"
                        />
                        <Globe size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <button
                        onClick={handleImportUrl}
                        disabled={!importUrl || importing}
                        className="bg-gray-900 dark:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {importing ? '...' : (
                            <>Importer</>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-[10px] font-bold text-gray-400 uppercase tracking-wider rounded-t-xl">
                    <div className="w-5 flex justify-center"><input type="checkbox" onChange={handleSelectAll} checked={localRules.length > 0 && selectedIds.size === localRules.length} className="rounded border-gray-300 text-pepite-gold focus:ring-pepite-gold" /></div>
                    <div className="flex-1">Configuration</div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-b-xl">
                    {localRules.map(rule => (
                        <div key={rule.id} className={`relative group p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all ${selectedIds.has(rule.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} ${!rule.active ? 'opacity-60 grayscale-[0.5] focus-within:opacity-100 focus-within:grayscale-0' : ''} focus-within:z-20`}>
                            {/* Desktop/Tablet Row Layout */}
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                                <div className="flex items-center gap-3 shrink-0">
                                    <input type="checkbox" checked={selectedIds.has(rule.id)} onChange={() => handleSelectOne(rule.id)} className="rounded border-gray-300 text-pepite-gold focus:ring-pepite-gold" />
                                    <button onClick={() => handleToggle(rule.id)} className={`w-8 h-4 rounded-full flex items-center transition-colors p-0.5 ${rule.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}><div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${rule.active ? 'translate-x-4' : ''}`} /></button>
                                </div>
                                <div className="flex-1">
                                    <input value={rule.keyword} onChange={(e) => handleChange(rule.id, 'keyword', e.target.value)} className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-pepite-gold rounded-none p-1 text-sm font-bold text-gray-800 dark:text-gray-100 outline-none transition-colors" placeholder="Mot-clé..." />
                                </div>

                                { /* Distance Input: Right of Keyword, Left of Location */}
                                <div className="flex items-center gap-2">
                                    {(rule.location?.startsWith('Ville|') || !rule.location || rule.location.indexOf('|') === -1) && (
                                        <div className="w-20 shrink-0 relative flex items-center">
                                            <input type="number" value={rule.distance} onChange={(e) => handleChange(rule.id, 'distance', parseInt(e.target.value))} className="w-full bg-transparent border border-gray-200 dark:border-gray-700 rounded p-1 text-sm text-center focus:border-pepite-gold outline-none pr-6" />
                                            <span className="absolute right-2 text-[10px] text-gray-400 pointer-events-none">km</span>
                                        </div>
                                    )}
                                    <div className="w-full md:w-64 shrink-0"><LocationInput location={rule.location || ''} onChange={(val) => handleChange(rule.id, 'location', val)} /></div>
                                </div>

                                <div className="hidden md:block shrink-0"><button onClick={() => handleDelete(rule.id)} className="text-gray-300 hover:text-red-500 p-1.5 rounded transition-colors" title="Supprimer"><Trash2 size={16} /></button></div>
                                {/* Mobile delete button */}
                                <button onClick={() => handleDelete(rule.id)} className="md:hidden absolute top-3 right-3 text-gray-300 hover:text-red-500 p-1.5 rounded transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <div className="pl-0 md:pl-11 pr-0 md:pr-8"><RomeCodeInput value={rule.romeCodes} onChange={(val) => handleChange(rule.id, 'romeCodes', val)} /></div>
                        </div>
                    ))}
                    {localRules.length === 0 && <div className="p-8 text-center text-gray-400 text-sm italic">Aucune configuration de recherche. Cliquez sur Ajouter.</div>}
                </div>
            </div>
        </div>
    );
};
// IaTab removed (replaced by external IaSettingsTab)

/* --- MAIN COMPONENT --- */
const SettingsView = () => {
    const { tab } = useParams();
    const navigate = useNavigate();
    const [headerActions, setHeaderActions] = useState(null);
    const { user, loading, updateProfile, updateSearchConfig, updateVisualFilters } = useUser();
    const validTabs = ['profil', 'recherche', 'filtres', 'ia', 'systeme'];
    const activeTab = validTabs.includes(tab) ? tab : 'profil';
    const tabs = [
        { id: 'profil', label: 'Profil', icon: User },
        { id: 'recherche', label: 'Recherche', icon: Search },
        { id: 'filtres', label: 'Filtres Visuels', icon: Filter },
        { id: 'ia', label: 'IA & Automation', icon: Cpu },
        { id: 'systeme', label: 'Système', icon: Settings },
    ];
    if (loading) return <div className="h-full flex items-center justify-center">Chargement...</div>;
    return (
        <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between shadow-sm z-10 shrink-0">
                <div className="flex items-center"><Settings className="text-pepite-gold mr-3" size={24} /><h1 className="text-xl font-black text-gray-800 dark:text-white tracking-tight flex items-baseline gap-2">PARAMÈTRES<span className="text-[10px] font-mono font-normal text-gray-400">{user?.id}</span></h1></div>
                <div id="header-actions">{headerActions}</div>
            </div>
            <div className="flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => navigate(`/parametre/${t.id}`)} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === t.id ? 'border-pepite-gold text-pepite-gold bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><t.icon size={18} />{t.label}</button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative hide-scrollbar scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                <main className={`mx-auto w-full max-w-7xl ${activeTab === 'filtres' ? 'p-0' : 'p-4 md:p-8'}`}>
                    {activeTab === 'profil' && <ProfileTab profile={user} onUpdate={updateProfile} loading={loading} setHeaderActions={setHeaderActions} />}
                    {activeTab === 'recherche' && <SearchTab data={user?.searchConfig || EMPTY_ARRAY} onUpdate={updateSearchConfig} loading={loading} setHeaderActions={setHeaderActions} />}
                    {activeTab === 'filtres' && <VisualFiltersTab data={user?.visualFilters || EMPTY_ARRAY} onUpdate={updateVisualFilters} loading={loading} setHeaderActions={setHeaderActions} />}
                    {activeTab === 'ia' && <IaSettingsTab profile={user} onUpdate={updateProfile} loading={loading} setHeaderActions={setHeaderActions} />}
                    {activeTab === 'systeme' && <SystemTab data={EMPTY_ARRAY} setHeaderActions={setHeaderActions} />}
                </main>
            </div>
        </div>
    );
};
export default SettingsView;
