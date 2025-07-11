"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatGraph = void 0;
exports.processUserMessage = processUserMessage;
// agent.ts
const langgraph_1 = require("@langchain/langgraph");
const openrouter_1 = require("./openrouter");
const memoryStore_1 = require("./memoryStore");
const calendar_1 = require("./calendar");
const uuid_1 = require("uuid");
const State = langgraph_1.Annotation.Root({
    messages: (0, langgraph_1.Annotation)({ reducer: (prev, next) => next }),
    response: (0, langgraph_1.Annotation)({ reducer: (_prev, next) => next }),
});
// Helper function pour détecter les intentions d'annulation
function parseDeleteIntent(input) {
    const deleteKeywords = ["annule", "annuler", "supprime", "supprimer", "enlève", "enlever", "retire", "retirer", "efface", "effacer"];
    const lowercaseInput = input.toLowerCase();
    // Vérifier si c'est une intention d'annulation
    const hasDeleteKeyword = deleteKeywords.some(keyword => lowercaseInput.includes(keyword));
    if (!hasDeleteKeyword)
        return null;
    // Extraire le jour avec support des jours de la semaine
    let day = "aujourd'hui"; // par défaut
    if (lowercaseInput.includes("demain") || lowercaseInput.includes("tomorrow")) {
        day = "demain";
    }
    else if (lowercaseInput.includes("aujourd'hui") || lowercaseInput.includes("today") || lowercaseInput.includes("ce soir")) {
        day = "aujourd'hui";
    }
    else {
        // Vérifier les jours de la semaine
        const weekDays = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
        for (const weekDay of weekDays) {
            if (lowercaseInput.includes(weekDay)) {
                day = weekDay;
                break;
            }
        }
    }
    // Extraire l'heure
    const hourMatch = input.match(/(\d{1,2})h/i);
    const hour = hourMatch ? parseInt(hourMatch[1]) : undefined;
    // Extraire le contexte
    let context = "";
    const contextPatterns = [
        /(?:repas|restaurant|resto|dîner|déjeuner)/i,
        /(?:tennis|sport|foot|football)/i,
        /(?:dentiste|médecin|docteur)/i,
        /(?:réunion|meeting|travail)/i,
        /(?:avec\s+([a-zA-ZÀ-ÿ]+))/i
    ];
    for (const pattern of contextPatterns) {
        const match = input.match(pattern);
        if (match) {
            context = match[0];
            break;
        }
    }
    return {
        action: "delete",
        day,
        hour,
        context: context || undefined
    };
}
// Helper function pour parser les dates naturelles et détecter les catégories
async function parseNaturalDate(input) {
    // Utiliser l'heure de Paris explicitement
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    // Permettre la création d'événements quand on a juste une heure (réponse à une question)
    const isJustTime = /^(\d{1,2})h?(\d{2})?\s*$/i.test(input.trim());
    const hasExplicitTime = /(\d{1,2})h|\bmidi\b|\bsoir\b|\bmatin\b|\baprès-midi\b/i.test(input);
    const isAnniversary = /anniversaire|fête/i.test(input);
    const hasWeekReference = /semaine\s+prochaine/i.test(input);
    // Si c'est juste une heure, essayer de créer un événement générique pour demain
    if (isJustTime) {
        const hour = parseInt(input.match(/(\d{1,2})/)?.[1] || "12");
        const tomorrow = new Date(parisTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hour, 0, 0, 0);
        const endTime = new Date(tomorrow);
        endTime.setHours(hour + 1, 0, 0, 0);
        return {
            start: tomorrow.toISOString(),
            end: endTime.toISOString(),
            title: "Événement",
            category: "Autre",
            color: "#6b7280"
        };
    }
    if (!hasExplicitTime && !isAnniversary && !hasWeekReference) {
        console.log("🚫 Pas d'heure précise détectée, événement non créé:", input);
        return null; // Ne pas créer d'événement sans heure précise
    }
    // Définir les catégories avec leurs mots-clés et couleurs
    const categories = {
        "Sport": {
            keywords: ["tennis", "foot", "football", "basket", "volleyball", "course", "gym", "sport", "match", "entrainement", "entraînement", "yoga", "pilates", "natation", "vélo", "escalade"],
            color: "#22c55e", // Vert
            defaultDuration: 1.5
        },
        "Médical": {
            keywords: ["médecin", "docteur", "dentiste", "kiné", "kinésithérapeute", "ostéo", "ostéopathe", "ophtalmo", "cardio", "dermato", "consultation", "visite médicale", "rdv médical", "cabinet"],
            color: "#ef4444", // Rouge
            defaultDuration: 1
        },
        "Travail": {
            keywords: ["réunion", "meeting", "entretien", "présentation", "conf call", "conference", "boulot", "bureau", "travail", "projet", "client", "patron", "équipe"],
            color: "#3b82f6", // Bleu
            defaultDuration: 1
        },
        "Personnel": {
            keywords: ["famille", "parents", "enfants", "maman", "papa", "grand-mère", "grand-père", "frère", "sœur", "cousin", "tante", "oncle"],
            color: "#f59e0b", // Orange
            defaultDuration: 2
        },
        "Social": {
            keywords: ["ami", "amie", "copain", "copine", "pote", "sortie", "restaurant", "resto", "café", "bar", "cinéma", "théâtre", "concert", "fête", "anniversaire", "soirée", "apéro", "dîner", "déjeuner"],
            color: "#8b5cf6", // Violet
            defaultDuration: 2
        },
        "Amoureux": {
            keywords: ["chéri", "chérie", "amour", "copain", "copine", "petit ami", "petite amie", "date", "dîner romantique", "saint-valentin"],
            color: "#ec4899", // Rose
            defaultDuration: 2
        },
        "Courses": {
            keywords: ["courses", "shopping", "magasin", "supermarché", "pharmacie", "banque", "poste", "mairie", "acheter", "achats"],
            color: "#06b6d4", // Cyan
            defaultDuration: 1
        },
        "Formation": {
            keywords: ["cours", "formation", "école", "université", "stage", "apprentissage", "étude", "examen", "contrôle"],
            color: "#84cc16", // Vert lime
            defaultDuration: 2
        }
    };
    // Fonction pour détecter la catégorie
    function detectCategory(text) {
        const lowercaseText = text.toLowerCase();
        for (const [catName, catData] of Object.entries(categories)) {
            for (const keyword of catData.keywords) {
                if (lowercaseText.includes(keyword)) {
                    return {
                        category: catName,
                        color: catData.color,
                        duration: catData.defaultDuration
                    };
                }
            }
        }
        // Catégorie par défaut
        return {
            category: "Autre",
            color: "#6b7280", // Gris
            duration: 1
        };
    }
    // Fonction pour extraire le titre intelligent avec l'IA
    async function extractTitle(text, category) {
        try {
            const titlePrompt = `Créé un titre court et précis pour cet événement de calendrier (max 4 mots):

Phrase utilisateur: "${text}"
Catégorie: ${category}

Règles:
- Titre COURT (2-4 mots max)
- AUCUN mot technique ("ajoute", "calendrier", etc.)
- Si activité + personne → "Tennis avec Paul"
- Si juste activité → "Restaurant", "Dentiste"
- Si lieu précis → "Cinéma Pathé"
- RÉPONSE: juste le titre, rien d'autre

Exemples:
- "ajoute mon repas avec la fille ce soir 21h" → "Dîner avec La"
- "tennis avec Franck demain 15h" → "Tennis avec Franck"  
- "j'ai dentiste demain 10h" → "Dentiste"
- "réunion équipe demain 14h" → "Réunion équipe"`;
            const titleResponse = await (0, openrouter_1.chatCompletion)([
                { role: "system", content: titlePrompt },
                { role: "user", content: text }
            ]);
            // Nettoyer la réponse (enlever guillemets, etc.)
            const cleanTitle = titleResponse
                .replace(/["""'']/g, '')
                .replace(/^(Titre:|Réponse:)/i, '')
                .trim();
            // Vérifier que le titre est valide (pas trop long, pas vide)
            if (cleanTitle && cleanTitle.length <= 50 && !cleanTitle.includes('calendrier')) {
                return cleanTitle;
            }
            // Fallback si l'IA échoue
            if (text.toLowerCase().includes("anniversaire")) {
                return "Mon anniversaire";
            }
            return `Rendez-vous ${category}`;
        }
        catch (error) {
            console.error("Erreur lors de la génération du titre:", error);
            // Fallback simple avec détection d'anniversaire
            if (text.toLowerCase().includes("anniversaire")) {
                return "Mon anniversaire";
            }
            return `Rendez-vous ${category}`;
        }
    }
    // Détection de "demain" avec heure OU "demain" + "soir"
    const tomorrowWithHourMatch = input.match(/(demain|tomorrow).*?(\d{1,2})h?/i);
    const tomorrowWithEveningMatch = input.match(/(demain|tomorrow).*?(soir|evening)/i);
    if (tomorrowWithHourMatch) {
        const hour = parseInt(tomorrowWithHourMatch[2]);
        const tomorrow = new Date(parisTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hour, 0, 0, 0);
        const categoryInfo = detectCategory(input);
        const endTime = new Date(tomorrow);
        endTime.setHours(hour + categoryInfo.duration, 0, 0, 0);
        return {
            start: tomorrow.toISOString(),
            end: endTime.toISOString(),
            title: await extractTitle(input, categoryInfo.category),
            category: categoryInfo.category,
            color: categoryInfo.color
        };
    }
    else if (tomorrowWithEveningMatch) {
        // "demain soir" sans heure précise = 20h par défaut
        const hour = 20;
        const tomorrow = new Date(parisTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hour, 0, 0, 0);
        const categoryInfo = detectCategory(input);
        const endTime = new Date(tomorrow);
        endTime.setHours(hour + categoryInfo.duration, 0, 0, 0);
        return {
            start: tomorrow.toISOString(),
            end: endTime.toISOString(),
            title: await extractTitle(input, categoryInfo.category),
            category: categoryInfo.category,
            color: categoryInfo.color
        };
    }
    // Détection des jours de la semaine avec "prochain" + heure ou "midi" (STRICTE)
    const weekDayProchainMatch = input.match(/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(prochain|prochaine).*?((\d{1,2})h?|midi)/i);
    if (weekDayProchainMatch && (weekDayProchainMatch[3] || weekDayProchainMatch[4])) {
        const dayName = weekDayProchainMatch[1].toLowerCase();
        let hour = 12; // Par défaut midi
        if (weekDayProchainMatch[3] && weekDayProchainMatch[3].toLowerCase() === "midi") {
            hour = 12;
        }
        else if (weekDayProchainMatch[4]) {
            hour = parseInt(weekDayProchainMatch[4]);
        }
        const weekDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
        const targetDayIndex = weekDays.indexOf(dayName);
        if (targetDayIndex !== -1) {
            const currentDayIndex = parisTime.getDay();
            let daysToAdd = targetDayIndex - currentDayIndex;
            // Pour "prochain", toujours la semaine suivante
            if (daysToAdd <= 0) {
                daysToAdd += 7;
            }
            else {
                daysToAdd += 7; // Forcer la semaine suivante pour "prochain"
            }
            const targetDate = new Date(parisTime);
            targetDate.setDate(targetDate.getDate() + daysToAdd);
            targetDate.setHours(hour, 0, 0, 0);
            const categoryInfo = detectCategory(input);
            const endTime = new Date(targetDate);
            endTime.setHours(hour + categoryInfo.duration, 0, 0, 0);
            return {
                start: targetDate.toISOString(),
                end: endTime.toISOString(),
                title: await extractTitle(input, categoryInfo.category),
                category: categoryInfo.category,
                color: categoryInfo.color
            };
        }
    }
    // Détection des jours de la semaine avec heure (lundi 15h, mardi 10h, etc.)
    const weekDayMatch = input.match(/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche).*?(\d{1,2})h?/i);
    if (weekDayMatch) {
        const dayName = weekDayMatch[1].toLowerCase();
        const hour = parseInt(weekDayMatch[2]);
        const weekDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
        const targetDayIndex = weekDays.indexOf(dayName);
        if (targetDayIndex !== -1) {
            const currentDayIndex = parisTime.getDay(); // 0 = dimanche, 1 = lundi, etc.
            let daysToAdd = targetDayIndex - currentDayIndex;
            // Si le jour est déjà passé cette semaine, on prend la semaine suivante
            if (daysToAdd <= 0) {
                daysToAdd += 7;
            }
            const targetDate = new Date(parisTime);
            targetDate.setDate(targetDate.getDate() + daysToAdd);
            targetDate.setHours(hour, 0, 0, 0);
            const categoryInfo = detectCategory(input);
            const endTime = new Date(targetDate);
            endTime.setHours(hour + categoryInfo.duration, 0, 0, 0);
            return {
                start: targetDate.toISOString(),
                end: endTime.toISOString(),
                title: await extractTitle(input, categoryInfo.category),
                category: categoryInfo.category,
                color: categoryInfo.color
            };
        }
    }
    // Détection de "semaine prochaine" générale
    const semaineProchainMatch = input.match(/semaine\s+prochaine.*?(je\s+)?(vais|prends|prendre)/i);
    if (semaineProchainMatch && !hasExplicitTime) {
        console.log("🤔 Semaine prochaine détectée mais pas d'heure précise, pas de création:", input);
        return null; // Ne pas créer d'événement, laisser l'IA poser la question
    }
    // Détection spéciale pour les anniversaires (vendredi prochain, etc.)
    const anniversaryMatch = input.match(/(vendredi|samedi|dimanche|lundi|mardi|mercredi|jeudi)\s+(prochain|prochaine).*?(anniversaire|fête)/i);
    if (anniversaryMatch) {
        const dayName = anniversaryMatch[1].toLowerCase();
        const weekDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
        const targetDayIndex = weekDays.indexOf(dayName);
        if (targetDayIndex !== -1) {
            const currentDayIndex = parisTime.getDay();
            let daysToAdd = targetDayIndex - currentDayIndex;
            // Ajouter 7 jours pour "prochain" (semaine suivante)
            if (daysToAdd <= 0) {
                daysToAdd += 7;
            }
            else {
                daysToAdd += 7; // Forcer la semaine suivante pour "prochain"
            }
            const targetDate = new Date(parisTime);
            targetDate.setDate(targetDate.getDate() + daysToAdd);
            // Heure par défaut pour anniversaire ou heure spécifiée
            let hour = 12; // Par défaut midi
            if (input.includes("midi")) {
                hour = 12;
            }
            else {
                const hourMatch = input.match(/(\d{1,2})h/i);
                if (hourMatch) {
                    hour = parseInt(hourMatch[1]);
                }
            }
            targetDate.setHours(hour, 0, 0, 0);
            const endTime = new Date(targetDate);
            endTime.setHours(hour + 3, 0, 0, 0); // 3h pour un anniversaire
            return {
                start: targetDate.toISOString(),
                end: endTime.toISOString(),
                title: await extractTitle(input, "Social"),
                category: "Social",
                color: "#8b5cf6"
            };
        }
    }
    // Détection d'aujourd'hui avec heure
    const todayMatch = input.match(/(aujourd'hui|today).*?(\d{1,2})h?/i);
    if (todayMatch) {
        const hour = parseInt(todayMatch[2]);
        const today = new Date(parisTime);
        today.setHours(hour, 0, 0, 0);
        const categoryInfo = detectCategory(input);
        const endTime = new Date(today);
        endTime.setHours(hour + categoryInfo.duration, 0, 0, 0);
        return {
            start: today.toISOString(),
            end: endTime.toISOString(),
            title: await extractTitle(input, categoryInfo.category),
            category: categoryInfo.category,
            color: categoryInfo.color
        };
    }
    // Détection de pattern "rdv" ou "j'ai" avec heure (même sans "demain" explicite)
    const eventWithHourMatch = input.match(/(rdv|j'ai|rendez-vous|réunion|meeting).*?(\d{1,2})h?/i);
    if (eventWithHourMatch) {
        const hour = parseInt(eventWithHourMatch[2]);
        // Si pas de mention de jour, assume que c'est pour demain
        const targetDate = new Date(parisTime);
        if (!input.match(/(aujourd'hui|today)/i)) {
            targetDate.setDate(targetDate.getDate() + 1); // Demain par défaut
        }
        targetDate.setHours(hour, 0, 0, 0);
        const categoryInfo = detectCategory(input);
        const endTime = new Date(targetDate);
        endTime.setHours(hour + categoryInfo.duration, 0, 0, 0);
        return {
            start: targetDate.toISOString(),
            end: endTime.toISOString(),
            title: await extractTitle(input, categoryInfo.category),
            category: categoryInfo.category,
            color: categoryInfo.color
        };
    }
    // Détection de "ce soir" ou "le soir" avec heure
    const eveningMatch = input.match(/(ce soir|le soir|soir).*?(\d{1,2})h?/i);
    if (eveningMatch) {
        const hour = parseInt(eveningMatch[2]);
        const today = new Date(parisTime);
        today.setHours(hour, 0, 0, 0);
        const categoryInfo = detectCategory(input);
        const endTime = new Date(today);
        endTime.setHours(hour + categoryInfo.duration, 0, 0, 0);
        return {
            start: today.toISOString(),
            end: endTime.toISOString(),
            title: await extractTitle(input, categoryInfo.category),
            category: categoryInfo.category,
            color: categoryInfo.color
        };
    }
    // Détection d'heure seule (21h, 15h, etc.) sans contexte de rdv
    const hourOnlyMatch = input.match(/(\d{1,2})h(?:\d{2})?(?:\s|$)/i);
    if (hourOnlyMatch) {
        const hour = parseInt(hourOnlyMatch[1]);
        // Déterminer si c'est aujourd'hui ou demain
        const currentHour = parisTime.getHours();
        const targetDate = new Date(parisTime);
        // Si l'heure mentionnée est passée aujourd'hui, c'est pour demain
        // Sinon, c'est pour aujourd'hui
        if (hour <= currentHour) {
            targetDate.setDate(targetDate.getDate() + 1); // Demain
        }
        // Sinon on garde aujourd'hui
        targetDate.setHours(hour, 0, 0, 0);
        const categoryInfo = detectCategory(input);
        const endTime = new Date(targetDate);
        endTime.setHours(hour + categoryInfo.duration, 0, 0, 0);
        return {
            start: targetDate.toISOString(),
            end: endTime.toISOString(),
            title: await extractTitle(input, categoryInfo.category),
            category: categoryInfo.category,
            color: categoryInfo.color
        };
    }
    return null;
}
// Helper function pour générer des dates ISO dynamiques
function getDateExamples() {
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const tomorrow = new Date(parisTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Fixer l'heure à 15h00 pour l'exemple
    tomorrow.setHours(15, 0, 0, 0);
    const tomorrowISO = tomorrow.toISOString();
    // Une heure plus tard pour la fin
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(16, 0, 0, 0);
    const tomorrowEndISO = tomorrowEnd.toISOString();
    return { tomorrowISO, tomorrowEndISO };
}
// Node: LLM reasoning
async function llmNode(state) {
    const contextFacts = memoryStore_1.MemoryStore.getAll()
        .map((f) => `- ${f.text}`)
        .join("\n");
    const currentEvents = calendar_1.Calendar.list()
        .map((e) => `- ${e.title} le ${new Date(e.start).toLocaleDateString('fr-FR')} à ${new Date(e.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`)
        .join("\n");
    const userMessage = state.messages.find((m) => m.role === "user")?.content || "";
    // Vérifier d'abord si c'est une intention d'annulation
    const deleteIntent = parseDeleteIntent(userMessage);
    if (deleteIntent) {
        try {
            const eventsToDelete = calendar_1.Calendar.findByTimeAndContext(deleteIntent.day, deleteIntent.hour, deleteIntent.context);
            if (eventsToDelete.length === 0) {
                return {
                    response: `Aucun événement trouvé pour ${deleteIntent.day}${deleteIntent.hour ? ` à ${deleteIntent.hour}h` : ''}${deleteIntent.context ? ` concernant "${deleteIntent.context}"` : ''}.`
                };
            }
            else if (eventsToDelete.length === 1) {
                const event = eventsToDelete[0];
                calendar_1.Calendar.delete(event.id);
                const dayLabel = deleteIntent.day === "demain" ? "demain" : "aujourd'hui";
                const timeStr = new Date(event.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return {
                    response: `✅ Événement "${event.title}" annulé pour ${dayLabel} à ${timeStr}.`
                };
            }
            else {
                const eventsList = eventsToDelete.map(ev => `- ${ev.title} à ${new Date(ev.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`).join('\n');
                return {
                    response: `Plusieurs événements trouvés pour ${deleteIntent.day}:\n${eventsList}\n\nLequel voulez-vous annuler ? Soyez plus précis.`
                };
            }
        }
        catch (error) {
            console.error("Erreur lors de l'annulation:", error);
            return {
                response: "Désolé, j'ai rencontré un problème lors de l'annulation. Pouvez-vous réessayer ?"
            };
        }
    }
    // Essayer de parser automatiquement une date naturelle
    const parsedDate = await parseNaturalDate(userMessage);
    if (parsedDate) {
        // Si on peut parser la date, créer directement l'événement
        try {
            const conflicts = calendar_1.Calendar.conflicts(parsedDate.start, parsedDate.end);
            if (conflicts.length === 0) {
                calendar_1.Calendar.create({
                    title: parsedDate.title,
                    start: parsedDate.start,
                    end: parsedDate.end,
                    description: `${parsedDate.category}: ${parsedDate.title}`,
                    category: parsedDate.category,
                    color: parsedDate.color
                });
                const eventDate = new Date(parsedDate.start);
                const dateStr = eventDate.toLocaleDateString('fr-FR');
                const timeStr = eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                // Déterminer le bon label de jour
                const now = new Date();
                const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
                function getDayLabel(eventDate, parisTime) {
                    const isToday = eventDate.toDateString() === parisTime.toDateString();
                    if (isToday)
                        return "aujourd'hui";
                    const tomorrow = new Date(parisTime);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();
                    if (isTomorrow)
                        return "demain";
                    // Pour les autres jours, utiliser le nom du jour + date
                    const weekDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
                    const dayName = weekDays[eventDate.getDay()];
                    const dateStr = eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
                    return `${dayName} ${dateStr}`;
                }
                const dayLabel = getDayLabel(eventDate, parisTime);
                return {
                    response: `✅ Événement "${parsedDate.title}" ajouté à votre calendrier pour ${dayLabel} à ${timeStr}.`
                };
            }
            else {
                const eventDate = new Date(parsedDate.start);
                const timeStr = eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                // Déterminer le bon label de jour
                const now = new Date();
                const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
                function getDayLabel(eventDate, parisTime) {
                    const isToday = eventDate.toDateString() === parisTime.toDateString();
                    if (isToday)
                        return "aujourd'hui";
                    const tomorrow = new Date(parisTime);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();
                    if (isTomorrow)
                        return "demain";
                    // Pour les autres jours, utiliser le nom du jour + date
                    const weekDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
                    const dayName = weekDays[eventDate.getDay()];
                    const dateStr = eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
                    return `${dayName} ${dateStr}`;
                }
                const dayLabel = getDayLabel(eventDate, parisTime);
                return {
                    response: `⚠️ Conflit détecté : vous avez déjà un événement ${dayLabel} à ${timeStr}.\n\nVoulez-vous quand même ajouter "${parsedDate.title}" ?`
                };
            }
        }
        catch (error) {
            console.error("Erreur lors de la création de l'événement:", error);
            return {
                response: "J'ai compris votre demande de rendez-vous, mais j'ai rencontré un problème technique. Pouvez-vous réessayer ?"
            };
        }
    }
    // Si pas de date parsable, utiliser le LLM normalement
    const { tomorrowISO, tomorrowEndISO } = getDateExamples();
    const today = new Date().toLocaleDateString('fr-FR');
    // Utiliser l'heure de Paris explicitement
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const currentDateTime = parisTime.toLocaleString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris'
    });
    const tomorrow = new Date(parisTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Paris'
    });
    // Calculer les dates des prochains jours de la semaine
    const weekDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const currentDayIndex = parisTime.getDay();
    const nextWeekDays = [];
    for (let i = 0; i < 7; i++) {
        const dayIndex = (currentDayIndex + i + 1) % 7; // +1 pour commencer à demain
        const futureDate = new Date(parisTime);
        futureDate.setDate(futureDate.getDate() + i + 1);
        const dayName = weekDays[dayIndex];
        const dateStr = futureDate.toLocaleDateString('fr-FR');
        nextWeekDays.push(`${dayName} ${dateStr}`);
    }
    const systemPrompt = `Tu es un assistant personnel francophone intelligent et TRÈS DIRECT.

📅 CONTEXTE TEMPOREL ACTUEL (HEURE DE PARIS):
- MAINTENANT: ${currentDateTime}
- DEMAIN: ${tomorrowDate}
- PROCHAINS JOURS: ${nextWeekDays.slice(1, 4).join(', ')}

🗣️ EXPRESSIONS TEMPORELLES À COMPRENDRE:
- "ce soir", "le soir", "soir" = AUJOURD'HUI soir (même jour que maintenant)
- "demain", "tomorrow" = DEMAIN (jour suivant)
- "aujourd'hui", "today" = AUJOURD'HUI (même jour que maintenant)
- "lundi", "mardi", etc. = Le prochain jour de cette semaine (voir PROCHAINS JOURS ci-dessus)
- Si juste une heure "21h" sans précision → si heure future aujourd'hui = AUJOURD'HUI, sinon DEMAIN

💭 MÉMOIRE UTILISATEUR:
${contextFacts || "(aucune)"}

📋 ÉVÉNEMENTS CALENDRIER ACTUELS:
${currentEvents || "(aucun événement)"}

🎯 RÈGLES IMPORTANTES:
- Si l'utilisateur mentionne un rdv/événement avec date ET heure → CRÉE-LE IMMÉDIATEMENT, sans poser de questions
- Si l'utilisateur veut ANNULER (annule, supprime, retire, etc.) → TROUVE et SUPPRIME l'événement automatiquement
- ATTENTION aux expressions temporelles : "ce soir 21h" = AUJOURD'HUI à 21h, pas demain !
- Ne pose des questions QUE si des informations essentielles manquent (pas d'heure par exemple)
- Sois concis dans tes réponses, pas de blabla inutile
- Confirme simplement ce que tu as fait

EXEMPLES DE BONNES RÉACTIONS:
- User: "j'ai rdv dentiste demain 15h" → Tu crées directement et dis "✅ Rdv dentiste noté pour demain 15h"
- User: "lundi j'ai un rdv au dentiste 11h" → Tu crées directement et dis "✅ Rdv dentiste noté pour lundi 14 juillet à 11h"
- User: "restaurant ce soir 21h" → Tu crées directement et dis "✅ Restaurant noté pour ce soir 21h"
- User: "annule le repas de ce soir 21h" → Tu supprimes directement et dis "✅ Repas annulé pour ce soir 21h"
- User: "tennis avec Paul demain" → Tu demandes juste "À quelle heure ?"
- User: "21h au resto" → Tu crées directement et dis "✅ Restaurant noté pour ce soir 21h"

IMPORTANT: AGIS PLUS, PARLE MOINS !`;
    const messages = [
        { role: "system", content: systemPrompt },
        ...state.messages,
    ];
    try {
        // Call OpenRouter
        const answer = await (0, openrouter_1.chatCompletion)(messages);
        return { response: answer };
    }
    catch (error) {
        console.error("Erreur dans llmNode:", error);
        return { response: "Désolé, je rencontre un problème technique. Pouvez-vous réessayer ?" };
    }
}
// Node: mise à jour mémoire simple (enregistrer faits sous forme "Je ...")
function memoryNode(state) {
    const lastUserMsg = state.messages.find((m) => m.role === "user")?.content || "";
    // Sauvegarder les informations importantes
    const patterns = [
        /(je|j\'|j')([^\.]{5,})/i,
        /(rdv|rendez-vous|réunion|meeting)([^\.]{5,})/i,
        /(demain|aujourd'hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)([^\.]{5,})/i
    ];
    patterns.forEach(pattern => {
        const match = lastUserMsg.match(pattern);
        if (match) {
            memoryStore_1.MemoryStore.add({
                id: (0, uuid_1.v4)(),
                text: match[0].trim(),
                timestamp: Date.now()
            });
        }
    });
    return {};
}
// Ajout d'un nœud de calendrier qui inspecte la réponse du LLM pour des actions
function calendarNode(state) {
    // Ce nœud est maintenant simplifié car la logique de calendrier est dans llmNode
    return {};
}
// Reconstruire le graphe
const graphBuilder = new langgraph_1.StateGraph(State)
    .addNode("llm", llmNode)
    .addEdge(langgraph_1.START, "llm")
    .addNode("memory", memoryNode)
    .addEdge("llm", "memory")
    .addNode("calendar", calendarNode)
    .addEdge("memory", "calendar")
    .addEdge("calendar", langgraph_1.END);
exports.chatGraph = graphBuilder.compile();
async function processUserMessage(input) {
    try {
        const messages = [{ role: "user", content: input }];
        const result = await exports.chatGraph.invoke({ messages });
        return result.response || "(pas de réponse)";
    }
    catch (error) {
        console.error("Erreur dans processUserMessage:", error);
        return "Désolé, une erreur est survenue lors du traitement de votre message. Veuillez réessayer.";
    }
}
//# sourceMappingURL=agent.js.map