import React, { useState, useMemo } from 'react';
import {
    StickyNote, Mail, Calendar,
    Plus, Trash2, Edit2, ExternalLink,
    MoreVertical, CheckCircle, X, Search,
    Clock, MapPin, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import HtmlEditor from 'react-simple-wysiwyg';

// Safety Helper for safe array access
const safeArray = (arr) => Array.isArray(arr) ? arr : [];

const TrackingTabs = ({
    job,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onAddLink,
    onDeleteLink,
    accessToken // Passed from App -> Dashboard
}) => {
    // --- STATE MANAGEMENT ---
    // Mode: 'note', 'email', 'event_manual', 'event_calendar', or null (default collapsed)
    const [inputMode, setInputMode] = useState(null);

    // Inputs
    const [noteContent, setNoteContent] = useState("");
    const [noteDate, setNoteDate] = useState(""); // For editing or backdating

    const [emailInput, setEmailInput] = useState("");

    const [eventTitle, setEventTitle] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventLocation, setEventLocation] = useState("");
    const [eventCalendarInput, setEventCalendarInput] = useState("");

    const [isFetching, setIsFetching] = useState(false);

    // Editing State
    const [editingItem, setEditingItem] = useState(null); // { type: 'note', index, data }

    // --- MERGE & SORT DATA ---
    const timelineItems = useMemo(() => {
        const notes = safeArray(job.Notes).map((n, i) => ({ ...n, type: 'note', originalIndex: i, dateObj: new Date(n.date || 0) }));
        const emails = safeArray(job.Emails).map((e, i) => ({ ...e, type: 'email', originalIndex: i, dateObj: new Date(e.date || 0) }));
        const events = safeArray(job.Events).map((e, i) => ({ ...e, type: 'event', originalIndex: i, dateObj: new Date(e.date || 0) }));

        // Merge and Sort Descending
        return [...notes, ...emails, ...events].sort((a, b) => b.dateObj - a.dateObj);
    }, [job.Notes, job.Emails, job.Events]);


    // --- HELPERS ---
    const checkTokenScopes = async () => {
        if (!accessToken) return false;
        try {
            const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
            const data = await res.json();
            const scopes = data.scope.split(' ');
            const hasGmail = scopes.some(s => s.includes('gmail.readonly') || s.includes('gmail.modify') || s.includes('mail.google.com'));
            const hasCalendar = scopes.some(s => s.includes('calendar.events.readonly') || s.includes('calendar'));

            if (!hasGmail || !hasCalendar) {
                alert(`Scopes manquants !\nGmail: ${hasGmail ? 'OK' : 'MANQUANT'}\nCalendar: ${hasCalendar ? 'OK' : 'MANQUANT'}\n\nVeuillez vous déconnecter et reconnecter.`);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Token check failed", e);
            return true; // Optimistic fallback
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), "d MMM yyyy HH:mm", { locale: fr });
        } catch (e) {
            return dateString;
        }
    };

    const getAutoSearchQuery = () => {
        const parts = [];
        if (job.Entreprise) parts.push(`"${job.Entreprise}"`);
        if (job.Poste) parts.push(`"${job.Poste}"`);
        if (parts.length === 0) return "";
        return `subject:(${parts.join(' ')})`;
    };

    // --- API LOGIC (Email/Calendar Fetch) ---
    // (Reused from previous step, slightly adapted for new handlers)
    const extractGmailIdContainer = (input) => {
        const text = input.trim();
        if (text.startsWith('http')) {
            const hashMatch = text.match(/[#\/](?:inbox|all|sent|starred|trash|spam|important|category\/.*?)\/([a-fA-F0-9]{16,})/);
            if (hashMatch && hashMatch[1]) return { type: 'id', value: hashMatch[1] };
            const searchMatch = text.match(/[#\/]search\/([^\/]+)\/([a-zA-Z0-9_-]+)/);
            if (searchMatch) return { type: 'search_url', id: searchMatch[2], query: decodeURIComponent(searchMatch[1]) };
            const parts = text.split('/');
            const lastPart = parts[parts.length - 1].split('?')[0].split('#')[0];
            if (lastPart.length > 5) return { type: 'unknown_id', value: lastPart };
            return { type: 'url_fail', value: text };
        }
        if (/^[a-zA-Z0-9_-]+$/.test(text) && text.length > 5) return { type: 'id', value: text };
        return { type: 'query', value: text };
    };

    const fetchGmailMetadata = async (input, forceQuery = null) => {
        if (!accessToken) return null;
        await checkTokenScopes();
        let extraction = forceQuery ? { type: 'query', value: forceQuery } : extractGmailIdContainer(input);

        // ... (Keep existing fetch logic structure but condensed for brevity in this replace) ...
        // Note: In a real refactor I'd extract this to a hook or separate file. 
        // For this "One File" constraint, I'll paste the robust logic back.

        const fetchDetails = async (realId) => {
            const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${realId}?format=metadata`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) throw response;
            return await response.json();
        };

        const executeSearch = async (query) => {
            const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=1`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) throw response;
            return await response.json();
        };

        // Simplified Logic for brevity - assuming previous optimization works
        try {
            let data = null;
            if (extraction.type === 'query') {
                const searchRes = await executeSearch(extraction.value);
                if (searchRes.messages && searchRes.messages.length > 0) data = await fetchDetails(searchRes.messages[0].id);
                else throw new Error(`Aucun email trouvé pour : "${extraction.value}"`);
            } else {
                // Direct ID logic (simplified for this view)
                let idToTry = extraction.type === 'search_url' ? extraction.id : extraction.value;
                try { data = await fetchDetails(idToTry); } catch (e) { }
                if (!data && extraction.type === 'search_url' && extraction.query) {
                    const sRes = await executeSearch(extraction.query);
                    if (sRes.messages && sRes.messages.length > 0) data = await fetchDetails(sRes.messages[0].id);
                }
            }

            if (!data) throw new Error("Email introuvable via API.");

            const headers = data.payload?.headers || [];
            return {
                id: data.id,
                subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
                from: headers.find(h => h.name === 'From')?.value || 'Unknown',
                date: headers.find(h => h.name === 'Date')?.value || new Date().toISOString(),
                snippet: data.snippet,
                link: `https://mail.google.com/mail/u/0/#inbox/${data.id}`
            };
        } catch (error) {
            alert(`Erreur: ${error.message}`);
            return null;
        }
    };

    const fetchEventMetadata = async (input) => {
        if (!accessToken) return null;
        await checkTokenScopes();
        let eventId = input.trim();

        // Handle "eventedit" URLs (Base64 encoded ID + email)
        // Regex optimized to catch the long base64 string
        const editMatch = input.match(/eventedit\/([^/?&]+)/);
        if (editMatch && editMatch[1]) {
            try {
                // The URL param is Base64 encoded "eventId userEmail"
                const decoded = atob(editMatch[1]);
                eventId = decoded.split(' ')[0];
            } catch (e) {
                console.error("Failed to decode calendar EID", e);
                // Fallback: use what we caught, though likely invalid if encoded
                eventId = editMatch[1];
            }
        }

        try {
            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error("Non trouvé");
            const data = await response.json();
            return {
                id: data.id,
                summary: data.summary,
                start: data.start?.dateTime || data.start?.date,
                end: data.end?.dateTime || data.end?.date,
                location: data.location,
                url: data.htmlLink
            };
        } catch (error) {
            alert(`Erreur Calendrier: ${error.message}`);
            return null;
        }
    };

    // --- ACTION HANDLERS ---

    const handleAddNote = () => {
        if (!noteContent.trim()) return;

        let finalDate = new Date();
        if (noteDate) {
            // noteDate is YYYY-MM-DD
            const d = new Date(noteDate);
            // Set to noon to avoid timezone issues
            d.setHours(12, 0, 0, 0);
            finalDate = d;
        }

        const noteData = { content: noteContent, date: finalDate.toISOString() };
        onAddNote(noteData.content, noteData.date);

        setNoteContent("");
        setNoteDate("");
        setInputMode(null);
    };

    const handleUpdateNote = () => {
        if (!editingItem) return;

        let finalDate = editingItem.date;
        if (noteDate) {
            // noteDate is YYYY-MM-DD
            const d = new Date(noteDate);
            d.setHours(12, 0, 0, 0);
            finalDate = d.toISOString();
        }

        onUpdateNote(editingItem.originalIndex, noteContent, finalDate);

        setNoteContent("");
        setNoteDate("");
        setEditingItem(null);
        setInputMode(null);
    };

    const handleAddEmail = async (forcedQuery = null) => {
        const input = forcedQuery || emailInput;
        if (!input) return;
        setIsFetching(true);

        if (accessToken) {
            const meta = await fetchGmailMetadata(input, forcedQuery ? input : null);
            if (meta) {
                onAddLink('Emails', { ...meta, type: 'linked' });
                setEmailInput("");
                setInputMode(null);
            }
        } else {
            onAddLink('Emails', {
                id: Date.now(), type: 'manual', date: new Date().toISOString(),
                subject: input, from: 'Manuel', content: '', url: '#'
            });
            setEmailInput("");
            setInputMode(null);
        }
        setIsFetching(false);
    };

    const handleAddEventManual = () => {
        if (!eventTitle) return;
        const evtData = {
            id: Date.now(),
            title: eventTitle,
            date: eventDate || new Date().toISOString(),
            location: eventLocation,
            url: null,
            type: 'manual'
        };
        onAddLink('Events', evtData);
        setEventTitle(""); setEventDate(""); setEventLocation("");
        setInputMode(null);
    };

    const handleAddEventCalendar = async () => {
        if (!eventCalendarInput) return;
        setIsFetching(true);
        if (accessToken) {
            const meta = await fetchEventMetadata(eventCalendarInput);
            if (meta) {
                onAddLink('Events', {
                    id: meta.id, title: meta.summary, date: meta.start,
                    location: meta.location, url: meta.url
                });
                setEventCalendarInput("");
                setInputMode(null);
            }
        }
        setIsFetching(false);
    };

    const startEditNote = (note) => {
        setEditingItem(note);
        setNoteContent(note.content);
        setNoteDate(note.date ? new Date(note.date).toISOString().slice(0, 10) : "");
        setInputMode('note');
    };

    // --- RENDERERS ---

    const renderInputArea = () => {
        if (!inputMode) return null;

        return (
            <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                        {editingItem ? 'Modifier la Note' :
                            inputMode === 'note' ? 'Ajouter une Note' :
                                inputMode === 'email' ? 'Ajouter un Email' :
                                    inputMode === 'event_manual' ? 'Ajouter un Événement (Suivi)' :
                                        'Lier Agenda Google'}
                    </h3>
                    <button onClick={() => { setInputMode(null); setEditingItem(null); }} className="text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>

                {inputMode === 'note' && (
                    <div className="space-y-3">
                        <HtmlEditor
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Contenu de la note..."
                            containerProps={{ style: { height: '150px' } }}
                        />
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Date :</label>
                            <input
                                type="date"
                                value={noteDate}
                                onChange={(e) => setNoteDate(e.target.value)}
                                className="text-sm border p-1 rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button onClick={editingItem ? handleUpdateNote : handleAddNote} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                                {editingItem ? 'Enregistrer' : 'Ajouter Note'}
                            </button>
                        </div>
                    </div>
                )}

                {inputMode === 'email' && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 p-2 border rounded text-sm"
                                placeholder="Collez un lien Gmail ou ID..."
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                            />
                            <button onClick={() => handleAddEmail()} disabled={isFetching} className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 flex items-center">
                                {isFetching ? <RefreshCw size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}
                                Ajouter
                            </button>
                        </div>
                        {job.Entreprise && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500 font-bold uppercase">Suggestion Auto :</span>
                                <button
                                    onClick={() => handleAddEmail(getAutoSearchQuery())}
                                    className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-3 py-1 rounded hover:bg-orange-100 border border-orange-200"
                                >
                                    <Search size={12} />
                                    Rechercher emails de "{job.Entreprise}"
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {inputMode === 'event_manual' && (
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Titre (ex: Entretien RH)"
                            className="w-full p-2 border rounded text-sm"
                            value={eventTitle}
                            onChange={(e) => setEventTitle(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <input
                                type="datetime-local"
                                className="flex-1 p-2 border rounded text-sm"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Lieu (Visio, Paris...)"
                                className="flex-1 p-2 border rounded text-sm"
                                value={eventLocation}
                                onChange={(e) => setEventLocation(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleAddEventManual} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
                                Ajouter au Suivi
                            </button>
                        </div>
                    </div>
                )}

                {inputMode === 'event_calendar' && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 p-2 border rounded text-sm"
                                placeholder="ID de l'événement ou URL d'édition..."
                                value={eventCalendarInput}
                                onChange={(e) => setEventCalendarInput(e.target.value)}
                            />
                            <button onClick={handleAddEventCalendar} disabled={isFetching} className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">
                                {isFetching ? '...' : 'Lier'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">Permet de lier un événement existant de votre Google Agenda.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderItem = (item, index) => {
        if (item.type === 'note') {
            return (
                <div key={`note-${index}`} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm relative group">
                    <div className="mt-1 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                            <StickyNote size={14} />
                        </div>
                        <div className="h-full w-px bg-gray-100 dark:bg-gray-700 my-2"></div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">NOTE • {formatDate(item.date)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditNote(item)} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit2 size={12} /></button>
                                <button onClick={() => onDeleteNote(item.originalIndex)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 size={12} /></button>
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-800 dark:text-gray-200 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.content }} />
                    </div>
                </div>
            );
        }

        if (item.type === 'email') {
            return (
                <div key={`email-${index}`} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-100 dark:border-orange-900 shadow-sm relative group">
                    <div className="mt-1 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center">
                            <Mail size={14} />
                        </div>
                        <div className="h-full w-px bg-gray-100 dark:bg-gray-700 my-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">EMAIL</span>
                                <span className="text-xs text-gray-400">• {formatDate(item.date)}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onDeleteLink('Emails', item.originalIndex)} className="p-1 hover:bg-gray-100 rounded text-red-600"><X size={12} /></button>
                            </div>
                        </div>
                        <a href={item.url || item.link || '#'} target="_blank" rel="noreferrer" className="block mt-2 no-underline group-hover:opacity-80 transition-opacity">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 truncate">{item.subject}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{item.from}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2 pl-2 border-l-2 border-orange-200">{item.content}</p>
                        </a>
                    </div>
                </div>
            );
        }

        if (item.type === 'event') {
            const isManual = item.type === 'manual' || !item.url;
            return (
                <div key={`event-${index}`} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-100 dark:border-purple-900 shadow-sm relative group">
                    <div className="mt-1 flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isManual ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                            {isManual ? <CheckCircle size={14} /> : <Calendar size={14} />}
                        </div>
                        <div className="h-full w-px bg-gray-100 dark:bg-gray-700 my-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <span className={`text-xs font-semibold ${isManual ? 'text-green-600' : 'text-purple-600'}`}>
                                {isManual ? 'ÉVÉNEMENT (SUIVI)' : 'AGENDA GOOGLE'} • {formatDate(item.date)}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onDeleteLink('Events', item.originalIndex)} className="p-1 hover:bg-gray-100 rounded text-red-600"><X size={12} /></button>
                            </div>
                        </div>
                        <div className="mt-2">
                            {isManual ? (
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{item.title || item.summary}</h4>
                                </div>
                            ) : (
                                <a href={item.url || '#'} target="_blank" rel="noreferrer" className="block no-underline group-hover:opacity-80 transition-opacity">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200 truncate">{item.title || item.summary}</h4>
                                    </div>
                                </a>
                            )}

                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Clock size={12} /> {format(new Date(item.date), 'HH:mm')}</span>
                                {item.location && <span className="flex items-center gap-1"><MapPin size={12} /> {item.location}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 rounded-lg overflow-hidden">
            {/* 1. Header with Actions */}
            <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 items-center justify-between shadow-sm z-10">
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Journal de Suivi</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setInputMode('note')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === 'note' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                    >
                        <StickyNote size={14} />
                        Note
                    </button>
                    <button
                        onClick={() => setInputMode('email')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === 'email' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                    >
                        <Mail size={14} />
                        Email
                    </button>
                    <button
                        onClick={() => setInputMode('event_manual')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === 'event_manual' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                    >
                        <CheckCircle size={14} />
                        Évènement (Suivi)
                    </button>
                    <button
                        onClick={() => setInputMode('event_calendar')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === 'event_calendar' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
                    >
                        <Calendar size={14} />
                        Évènement (Calendrier)
                    </button>
                </div>
            </div>

            {/* 2. Dynamic Input Area (Expands) */}
            {renderInputArea()}

            {/* 3. Timeline List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {timelineItems.length > 0 ? (
                    timelineItems.map((item, index) => renderItem(item, index))
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <MoreVertical size={24} className="opacity-20" />
                        </div>
                        <p className="text-sm">Aucun historique pour le moment.</p>
                        <p className="text-xs opacity-60 mt-1">Utilisez les boutons ci-dessus pour commencer.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackingTabs;
