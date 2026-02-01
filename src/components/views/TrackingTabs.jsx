import React, { useState, useMemo } from 'react';
import {
    StickyNote, Mail, Calendar,
    Plus, Trash2, Edit2, ExternalLink,
    MoreVertical, CheckCircle, X, Search,
    Clock, MapPin, RefreshCw, Users, User, Phone, Key
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
    const [inputMode, setInputMode] = useState(null);

    // Inputs
    const [noteContent, setNoteContent] = useState("");
    const [noteDate, setNoteDate] = useState("");
    const [emailInput, setEmailInput] = useState("");
    const [eventTitle, setEventTitle] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventLocation, setEventLocation] = useState("");
    const [eventCalendarInput, setEventCalendarInput] = useState("");
    const [contactInput, setContactInput] = useState("");
    const [isFetching, setIsFetching] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // --- MERGE & SORT DATA ---
    const timelineItems = useMemo(() => {
        const notes = safeArray(job.Notes).map((n, i) => ({ ...n, type: 'note', originalIndex: i, dateObj: new Date(n.date || 0) }));
        const emails = safeArray(job.Emails).map((e, i) => ({ ...e, type: 'email', originalIndex: i, dateObj: new Date(e.date || 0) }));
        const events = safeArray(job.Events).map((e, i) => ({ ...e, type: 'event', originalIndex: i, dateObj: new Date(e.date || 0) }));
        const contacts = safeArray(job.Contacts).map((c, i) => ({ ...c, type: 'contact', originalIndex: i, dateObj: new Date(c.date || 0) }));
        return [...notes, ...emails, ...events, ...contacts].sort((a, b) => b.dateObj - a.dateObj);
    }, [job.Notes, job.Emails, job.Events, job.Contacts]);

    // --- HELPERS ---
    const checkTokenScopes = async () => {
        if (!accessToken) return false;
        try {
            const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
            if (!res.ok) return true; // Fail safe
            const data = await res.json();
            const scopes = data.scope.split(' ');
            const hasGmail = scopes.some(s => s.includes('gmail.readonly') || s.includes('gmail.modify') || s.includes('mail.google.com'));
            const hasCalendar = scopes.some(s => s.includes('calendar.events.readonly') || s.includes('calendar'));
            const hasContacts = scopes.some(s => s.includes('contacts.readonly') || s.includes('contacts.other.readonly') || s.includes('contacts'));

            if (!hasGmail || !hasCalendar || !hasContacts) {
                const missing = [];
                if (!hasGmail) missing.push("Gmail");
                if (!hasCalendar) missing.push("Agenda");
                if (!hasContacts) missing.push("Contacts");

                alert(`⚠️ Permissions manquantes pour : ${missing.join(', ')}.\n\nGoogle n'a pas validé ces accès.\nVerifiez que vous avez bien coché TOUTES les cases lors de la connexion.\n\n(Essayez de vous reconnecter).`);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Token check failed", e);
            return true;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), "d MMM yyyy HH:mm", { locale: fr });
        } catch {
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

    const fetchWithErr = async (url) => {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!response.ok) {
            const errText = await response.text();
            let errMsg = `${response.status}`;
            try {
                const errJson = JSON.parse(errText);
                errMsg += `: ${errJson.error?.message || errText}`;
            } catch { errMsg += `: ${errText}`; }
            throw new Error(errMsg);
        }
        return await response.json();
    };

    // --- API LOGIC ---

    // GMAIL
    const extractGmailIdContainer = (input) => {
        const text = input.trim();

        // 1. Specific Search Pattern: #search/query/id
        // Example: https://mail.google.com/mail/u/0/#search/martha.enriquez-lenis%40inrae.fr/FMfcgzQfBQKPgvTcLxfqbSvjxcjHWPtB
        const searchMatch = text.match(/[#]search\/([^/]+)\/([a-zA-Z0-9_-]+)/);
        if (searchMatch) {
            return {
                type: 'search_url',
                query: decodeURIComponent(searchMatch[1]),
                value: searchMatch[2] // The ID
            };
        }

        // 2. Standard ID
        const idMatch = text.match(/(?:^|[/#])([a-zA-Z0-9_-]{10,})(?:[/?#]|$)/);
        if (idMatch && idMatch[1]) return { type: 'id', value: idMatch[1] };
        return { type: 'query', value: text };
    };

    const fetchGmailMetadata = async (input, forceQuery = null) => {
        if (!accessToken) return null;
        if (!(await checkTokenScopes())) return null;

        let extraction = forceQuery ? { type: 'query', value: forceQuery } : extractGmailIdContainer(input);

        try {
            let data = null;
            let isThread = false;

            if (extraction.type === 'query') {
                const searchRes = await fetchWithErr(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(extraction.value)}&maxResults=1`);
                if (searchRes.messages && searchRes.messages.length > 0) {
                    data = await fetchWithErr(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${searchRes.messages[0].id}?format=metadata`);
                } else {
                    throw new Error("Aucun email trouvé");
                }
            } else {
                try {
                    // 1. Try as THREAD ID
                    try {
                        const threadData = await fetchWithErr(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${extraction.value}?format=metadata`);
                        if (threadData.messages && threadData.messages.length > 0) {
                            data = threadData.messages[0];
                            isThread = true;
                        } else { throw new Error("Empty Thread"); }
                    } catch (threadErr) {
                        // 2. Try as MESSAGE ID
                        console.warn("Thread fetch failed, trying message", threadErr);
                        data = await fetchWithErr(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${extraction.value}?format=metadata`);
                    }
                } catch (directErr) {
                    // 3. FALLBACK: Try SEARCHING
                    console.warn("Direct fetch failed, trying search fallback", directErr);

                    // 3a. If search_url, search for the QUERY part first (most robust)
                    if (extraction.type === 'search_url' && extraction.query) {
                        try {
                            const searchRes = await fetchWithErr(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(extraction.query)}&maxResults=1`);
                            if (searchRes.messages && searchRes.messages.length > 0) {
                                // Found it via search query!
                                const realId = searchRes.messages[0].id;
                                data = await fetchWithErr(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${realId}?format=metadata`);
                                isThread = true;
                            } else {
                                throw directErr;
                            }
                        } catch (searchErr) {
                            // Fallthrough to next fallback
                            console.warn("Search via query failed", searchErr);
                        }
                    }

                    // 3b. If 3a failed or no query, try searching for the ID itself (q=ID)
                    if (!data) {
                        try {
                            const searchRes = await fetchWithErr(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(extraction.value)}&maxResults=1`);
                            if (searchRes.messages && searchRes.messages.length > 0) {
                                const realId = searchRes.messages[0].id;
                                data = await fetchWithErr(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${realId}?format=metadata`);
                                isThread = true;
                            } else {
                                throw directErr; // Throw original error if search fails
                            }
                        } catch (searchErr) {
                            throw directErr; // Throw original error
                        }
                    }
                }
            }

            if (!data) throw new Error("Données introuvables");

            const headers = data.payload?.headers || [];
            return {
                id: data.id,
                subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
                from: headers.find(h => h.name === 'From')?.value || 'Unknown',
                date: headers.find(h => h.name === 'Date')?.value || new Date().toISOString(),
                snippet: data.snippet,
                link: `https://mail.google.com/mail/u/0/#inbox/${isThread ? data.threadId : data.id}`
            };
        } catch (error) {
            console.error("Gmail Fetch Error", error);
            const cleanErr = error.message.replace('403: ', '').substring(0, 100);
            return {
                id: extraction.value || Date.now().toString(),
                subject: `Erreur API: ${cleanErr}`,
                from: 'Système',
                date: new Date().toISOString(),
                snippet: `Erreur complète: ${error.message}`,
                link: input
            };
        }
    };

    // CALENDAR
    const fetchEventMetadata = async (input) => {
        if (!accessToken) return null;
        if (!(await checkTokenScopes())) return null;

        let eventId = input.trim();
        let isUrl = input.startsWith('http');

        const queryMatch = input.match(/[?&]eid=([^&]+)/);
        if (queryMatch && queryMatch[1]) {
            try {
                const decoded = atob(queryMatch[1]);
                eventId = decoded.split(' ')[0];
            } catch (e) { eventId = queryMatch[1]; }
        } else {
            const eidMatch = input.match(/\/eventedit\/([a-zA-Z0-9]+)/);
            if (eidMatch && eidMatch[1]) {
                try {
                    const decoded = atob(eidMatch[1]);
                    eventId = decoded.split(' ')[0];
                } catch (e) { eventId = eidMatch[1]; }
            }
        }

        if (isUrl && (eventId.includes('http') || eventId.includes('/'))) {
            return { id: Date.now().toString(), summary: 'Lien Agenda (ID non détecté)', start: new Date().toISOString(), location: '', url: input };
        }

        try {
            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                const errText = await response.text();
                let errMsg = `${response.status}`;
                try {
                    const errJson = JSON.parse(errText);
                    errMsg += `: ${errJson.error?.message || errText}`;
                } catch { errMsg += `: ${errText}`; }
                throw new Error(errMsg);
            }

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
            const cleanErr = error.message.replace('403: ', '').substring(0, 60);
            return { id: Date.now().toString(), summary: `Erreur API: ${cleanErr}`, start: new Date().toISOString(), location: '', url: input };
        }
    };

    // CONTACTS (People API)
    const fetchContactMetadata = async (input) => {
        if (!accessToken) return null;
        if (!(await checkTokenScopes())) return null;

        const cleanInput = input.trim();
        let idCandidate = null;
        const personMatch = cleanInput.match(/person\/(c\d+)/);
        if (personMatch) idCandidate = personMatch[1];
        else if (/^c?\d+$/.test(cleanInput)) idCandidate = cleanInput;

        if (!idCandidate) {
            return { id: Date.now().toString(), name: 'Erreur: ID non trouvé', email: '', phone: '', url: cleanInput };
        }

        const tryFetch = async (resName) => {
            const response = await fetch(`https://people.googleapis.com/v1/${resName}?personFields=names,emailAddresses,phoneNumbers`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) {
                const errText = await response.text();
                let errMsg = `${response.status}`;
                try {
                    const errJson = JSON.parse(errText);
                    errMsg += `: ${errJson.error?.message || errText}`;
                } catch { errMsg += `: ${errText}`; }
                throw new Error(errMsg);
            }
            return await response.json();
        };

        try {
            let data = null;
            try {
                data = await tryFetch(`people/${idCandidate}`);
            } catch (e1) {
                if (idCandidate.startsWith('c')) {
                    try {
                        data = await tryFetch(`people/${idCandidate.substring(1)}`);
                    } catch (e2) { throw e2; }
                } else { throw e1; }
            }

            const name = data.names?.[0]?.displayName || 'Sans nom';
            const email = data.emailAddresses?.[0]?.value || '';
            const phone = data.phoneNumbers?.[0]?.value || '';

            return {
                id: data.resourceName,
                name: name,
                email: email,
                phone: phone,
                url: cleanInput.startsWith('http') ? cleanInput : `https://contacts.google.com/${data.resourceName}`
            };

        } catch (error) {
            const cleanErr = error.message.replace('403: ', '').substring(0, 60);
            return { id: Date.now().toString(), name: `Erreur API: ${cleanErr}`, email: '', phone: '', url: cleanInput.startsWith('http') ? cleanInput : '#' };
        }
    };

    // --- ACTION HANDLERS ---
    const handleAddNote = () => {
        if (!noteContent.trim()) return;
        let finalDate = new Date();
        if (noteDate) {
            const d = new Date(noteDate);
            d.setHours(12, 0, 0, 0);
            finalDate = d;
        }
        onAddNote(noteContent, finalDate.toISOString());
        setNoteContent(""); setNoteDate(""); setInputMode(null);
    };

    const handleUpdateNote = () => {
        if (!editingItem) return;
        let finalDate = editingItem.date;
        if (noteDate) {
            const d = new Date(noteDate);
            d.setHours(12, 0, 0, 0);
            finalDate = d.toISOString();
        }
        onUpdateNote(editingItem.originalIndex, noteContent, finalDate);
        setNoteContent(""); setNoteDate(""); setEditingItem(null); setInputMode(null);
    };

    const handleAddEmail = async (forcedQuery = null) => {
        const input = forcedQuery || emailInput;
        if (!input) return;
        setIsFetching(true);
        if (accessToken) {
            const meta = await fetchGmailMetadata(input, forcedQuery ? input : null);
            if (meta) {
                onAddLink('Emails', { ...meta, type: 'linked' });
                setEmailInput(""); setInputMode(null);
            }
        } else {
            onAddLink('Emails', {
                id: Date.now(), type: 'manual', date: new Date().toISOString(),
                subject: input, from: 'Manuel', content: '', url: input.startsWith('http') ? input : '#'
            });
            setEmailInput(""); setInputMode(null);
        }
        setIsFetching(false);
    };

    const handleAddEventManual = () => {
        if (!eventTitle) return;
        const evtData = { id: Date.now(), title: eventTitle, date: eventDate || new Date().toISOString(), location: eventLocation, url: null, type: 'manual' };
        onAddLink('Events', evtData);
        setEventTitle(""); setEventDate(""); setEventLocation(""); setInputMode(null);
    };

    const handleAddEventCalendar = async () => {
        if (!eventCalendarInput) return;
        setIsFetching(true);
        if (accessToken) {
            const meta = await fetchEventMetadata(eventCalendarInput);
            if (meta) {
                onAddLink('Events', { id: meta.id, title: meta.summary, date: meta.start, location: meta.location, url: meta.url });
                setEventCalendarInput(""); setInputMode(null);
            }
        } else {
            onAddLink('Events', {
                id: Date.now(), title: 'Lien Agenda', date: new Date().toISOString(),
                location: '', url: eventCalendarInput, type: 'manual'
            });
            setEventCalendarInput(""); setInputMode(null);
        }
        setIsFetching(false);
    };

    const handleAddContact = async () => {
        if (!contactInput) return;
        setIsFetching(true);
        if (accessToken) {
            const meta = await fetchContactMetadata(contactInput);
            if (meta) {
                onAddLink('Contacts', {
                    id: meta.id,
                    name: meta.name,
                    email: meta.email,
                    phone: meta.phone,
                    url: meta.url,
                    date: new Date().toISOString()
                });
                setContactInput(""); setInputMode(null);
            }
        } else {
            onAddLink('Contacts', {
                id: Date.now(),
                name: 'Contact Google',
                url: contactInput,
                date: new Date().toISOString()
            });
            setContactInput(""); setInputMode(null);
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
                                        inputMode === 'contact' ? 'Lier un Contact' :
                                            'Lier Agenda Google'}
                    </h3>
                    <button onClick={() => { setInputMode(null); setEditingItem(null); }} className="text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>

                {inputMode === 'note' && (
                    <div className="space-y-3">
                        <div className="rsw-pepite-container">
                            <HtmlEditor
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Contenu de la note..."
                                containerProps={{ style: { height: '150px' } }}
                            />
                        </div>
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
                                placeholder="Collez un lien Gmail (https://...) ou ID..."
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
                        <input type="text" placeholder="Titre (ex: Entretien RH)" className="w-full p-2 border rounded text-sm" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
                        <div className="flex gap-2">
                            <input type="datetime-local" className="flex-1 p-2 border rounded text-sm" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                            <input type="text" placeholder="Lieu (Visio, Paris...)" className="flex-1 p-2 border rounded text-sm" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleAddEventManual} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Ajouter au Suivi</button>
                        </div>
                    </div>
                )}

                {inputMode === 'event_calendar' && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input type="text" className="flex-1 p-2 border rounded text-sm" placeholder="Lien Agenda (https://...) ou ID..." value={eventCalendarInput} onChange={(e) => setEventCalendarInput(e.target.value)} />
                            <button onClick={handleAddEventCalendar} disabled={isFetching} className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">{isFetching ? '...' : 'Lier'}</button>
                        </div>
                    </div>
                )}

                {inputMode === 'contact' && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input type="text" className="flex-1 p-2 border rounded text-sm" placeholder="Lien Google Contacts (https://contacts.google.com/person/...)" value={contactInput} onChange={(e) => setContactInput(e.target.value)} />
                            <button onClick={handleAddContact} disabled={isFetching} className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">{isFetching ? '...' : 'Lier Contact'}</button>
                        </div>
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
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center"><StickyNote size={14} /></div>
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
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center"><Mail size={14} /></div>
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
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1"><span className="font-medium text-gray-700 dark:text-gray-300">{item.from}</span></div>
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2 pl-2 border-l-2 border-orange-200">{item.content || item.snippet}</p>
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
                            <span className={`text-xs font-semibold ${isManual ? 'text-green-600' : 'text-purple-600'}`}>{isManual ? 'ÉVÉNEMENT (SUIVI)' : 'AGENDA GOOGLE'} • {formatDate(item.date)}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onDeleteLink('Events', item.originalIndex)} className="p-1 hover:bg-gray-100 rounded text-red-600"><X size={12} /></button>
                            </div>
                        </div>
                        <div className="mt-2">
                            {isManual ? (
                                <div className="flex items-center gap-2"><h4 className="font-bold text-gray-800 dark:text-gray-200">{item.title || item.summary}</h4></div>
                            ) : (
                                <a href={item.url || '#'} target="_blank" rel="noreferrer" className="block no-underline group-hover:opacity-80 transition-opacity">
                                    <div className="flex items-center gap-2"><h4 className="font-bold text-gray-800 dark:text-gray-200 truncate">{item.title || item.summary}</h4></div>
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

        if (item.type === 'contact') {
            return (
                <div key={`contact-${index}`} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-900 shadow-sm relative group">
                    <div className="mt-1 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center"><User size={14} /></div>
                        <div className="h-full w-px bg-gray-100 dark:bg-gray-700 my-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">CONTACT GOOGLE • {formatDate(item.date)}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onDeleteLink('Contacts', item.originalIndex)} className="p-1 hover:bg-gray-100 rounded text-red-600"><X size={12} /></button>
                            </div>
                        </div>
                        <div className="mt-2">
                            <a href={item.url || '#'} target="_blank" rel="noreferrer" className="block no-underline group-hover:opacity-80 transition-opacity mb-2">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 truncate">{item.name || item.url}</h4>
                            </a>

                            <div className="flex flex-wrap gap-3">
                                {item.email && (
                                    <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${item.email}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-gray-600 hover:text-orange-600 bg-gray-50 px-2 py-1 rounded">
                                        <Mail size={12} /> {item.email}
                                    </a>
                                )}
                                {item.phone && (
                                    <a href={`tel:${item.phone}`} className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 bg-gray-50 px-2 py-1 rounded">
                                        <Phone size={12} /> {item.phone}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Journal de Suivi</h2>
                    {!!accessToken ? <Key size={14} className="text-green-500" title="Token API OK" /> : <Key size={14} className="text-gray-300" title="Token API Manquant" />}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setInputMode('note')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === 'note' ? 'bg-pepite-bronze text-white' : 'bg-pepite-bronze/10 text-pepite-bronze hover:bg-pepite-bronze/20'}`}><StickyNote size={14} /> Note</button>
                    <button onClick={() => setInputMode('email')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === 'email' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}><Mail size={14} /> Email</button>
                    <button onClick={() => setInputMode('event_manual')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === 'event_manual' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}><CheckCircle size={14} /> Évènement (Suivi)</button>
                    <button onClick={() => setInputMode('event_calendar')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === 'event_calendar' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}><Calendar size={14} /> Agenda</button>
                    <button onClick={() => setInputMode('contact')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === 'contact' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}><Users size={14} /> Contact</button>
                </div>
            </div>

            {renderInputArea()}

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
