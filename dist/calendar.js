"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Calendar = void 0;
// calendar.ts
const fs_1 = require("fs");
const path_1 = require("path");
const uuid_1 = require("uuid");
const DATA_DIR = (0, path_1.join)(process.cwd(), "data");
if (!(0, fs_1.existsSync)(DATA_DIR)) {
    (0, fs_1.mkdirSync)(DATA_DIR);
}
const CAL_FILE = (0, path_1.join)(DATA_DIR, "calendar.json");
function safeRead() {
    if (!(0, fs_1.existsSync)(CAL_FILE)) {
        return [];
    }
    try {
        const raw = (0, fs_1.readFileSync)(CAL_FILE, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
}
function safeWrite(events) {
    try {
        (0, fs_1.writeFileSync)(CAL_FILE, JSON.stringify(events, null, 2));
    }
    catch (err) {
        console.error("Erreur calendrier", err);
    }
}
exports.Calendar = {
    list() {
        return safeRead();
    },
    create(event) {
        const events = safeRead();
        const newEvent = { id: (0, uuid_1.v4)(), ...event };
        events.push(newEvent);
        safeWrite(events);
        return newEvent;
    },
    conflicts(startIso, endIso) {
        const events = safeRead();
        const start = new Date(startIso).getTime();
        const end = new Date(endIso).getTime();
        return events.filter((ev) => {
            const evStart = new Date(ev.start).getTime();
            const evEnd = new Date(ev.end).getTime();
            return (start < evEnd && end > evStart); // overlap
        });
    },
    delete(eventId) {
        const events = safeRead();
        const initialLength = events.length;
        const filteredEvents = events.filter(ev => ev.id !== eventId);
        if (filteredEvents.length < initialLength) {
            safeWrite(filteredEvents);
            return true;
        }
        return false;
    },
    findByTimeAndContext(day, hour, context) {
        const events = safeRead();
        return events.filter(ev => {
            const eventDate = new Date(ev.start);
            // Vérifier le jour (aujourd'hui, demain, lundi, mardi, etc.)
            const now = new Date();
            const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
            let targetDate = new Date(parisTime);
            if (day === "demain" || day === "tomorrow") {
                targetDate.setDate(targetDate.getDate() + 1);
            }
            else if (day !== "aujourd'hui" && day !== "today" && day !== "ce soir") {
                // Gérer les jours de la semaine
                const weekDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
                const targetDayIndex = weekDays.indexOf(day.toLowerCase());
                if (targetDayIndex !== -1) {
                    const currentDayIndex = parisTime.getDay(); // 0 = dimanche, 1 = lundi, etc.
                    let daysToAdd = targetDayIndex - currentDayIndex;
                    // Si le jour est déjà passé cette semaine, on prend la semaine suivante
                    if (daysToAdd <= 0) {
                        daysToAdd += 7;
                    }
                    targetDate.setDate(targetDate.getDate() + daysToAdd);
                }
            }
            const sameDay = eventDate.toDateString() === targetDate.toDateString();
            // Vérifier l'heure si spécifiée
            const sameHour = !hour || eventDate.getHours() === hour;
            // Vérifier le contexte si spécifié
            const matchContext = !context ||
                ev.title.toLowerCase().includes(context.toLowerCase()) ||
                ev.description?.toLowerCase().includes(context.toLowerCase());
            return sameDay && sameHour && matchContext;
        });
    },
};
//# sourceMappingURL=calendar.js.map