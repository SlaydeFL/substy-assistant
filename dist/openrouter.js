"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCompletion = chatCompletion;
// openrouter.ts
const axios_1 = __importDefault(require("axios"));
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
if (!OPENROUTER_API_KEY) {
    console.warn("[OpenRouter] OPENROUTER_API_KEY non défini – tu peux l’exporter dans tes variables d’environnement.");
}
async function chatCompletion(messages, options = {}) {
    const { model = "gpt-4.1-mini", temperature = 0.7 } = options;
    // Mode de démonstration si pas de clé API - réponses simples pour les titres
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "test_key_for_debugging") {
        console.log("🤖 Mode démonstration - génération d'une réponse simplifiée");
        // Pour les demandes de titre d'événement, générer un titre intelligent
        const systemMessage = messages[0]?.content || "";
        if (systemMessage.includes("Créé un titre court")) {
            const userMessage = messages[messages.length - 1]?.content || "";
            // Détection intelligente des titres
            if (userMessage.toLowerCase().includes("anniversaire")) {
                return "Mon anniversaire";
            }
            // Tennis avec Franck
            if (userMessage.toLowerCase().includes("tennis") && userMessage.toLowerCase().includes("franck")) {
                return "Tennis avec Franck";
            }
            // Tennis seul
            if (userMessage.toLowerCase().includes("tennis")) {
                return "Tennis";
            }
            // Rendez-vous avec fille
            if ((userMessage.toLowerCase().includes("rdv") || userMessage.toLowerCase().includes("rendez-vous"))
                && userMessage.toLowerCase().includes("fille")) {
                return "Rendez-vous avec elle";
            }
            // Dentiste
            if (userMessage.toLowerCase().includes("dentiste")) {
                return "Dentiste";
            }
            // Médecin
            if (userMessage.toLowerCase().includes("médecin") || userMessage.toLowerCase().includes("medecin")) {
                return "Médecin";
            }
            // Restaurant/repas
            if (userMessage.toLowerCase().includes("restaurant") || userMessage.toLowerCase().includes("resto")
                || userMessage.toLowerCase().includes("repas") || userMessage.toLowerCase().includes("dîner")
                || userMessage.toLowerCase().includes("diner") || userMessage.toLowerCase().includes("déjeuner")) {
                return "Restaurant";
            }
            // Réunion
            if (userMessage.toLowerCase().includes("réunion") || userMessage.toLowerCase().includes("reunion")
                || userMessage.toLowerCase().includes("meeting")) {
                return "Réunion";
            }
            // Générique pour rdv
            if (userMessage.toLowerCase().includes("rdv") || userMessage.toLowerCase().includes("rendez-vous")) {
                return "Rendez-vous";
            }
            // Fallback intelligent - extraire le mot principal
            const words = userMessage.toLowerCase().split(' ');
            const importantWords = words.filter(word => !['demain', 'aujourd\'hui', 'ce', 'soir', 'matin', 'après-midi', 'avec', 'un', 'une', 'le', 'la', 'les', 'des', 'du', 'de', 'à', 'au', 'j\'ai', 'jai', 'vais', 'faire', 'aller'].includes(word)
                && word.length > 2);
            if (importantWords.length > 0) {
                return importantWords[0].charAt(0).toUpperCase() + importantWords[0].slice(1);
            }
            return "Événement";
        }
        // Logique conversationnelle intelligente
        const userMessage = messages[messages.length - 1]?.content || "";
        const lowerMessage = userMessage.toLowerCase();
        // Vérifier si c'est juste une heure en réponse à une question
        const isJustTime = /^(\d{1,2})h?(\d{2})?\s*$/i.test(userMessage.trim());
        if (isJustTime) {
            return "✅ Parfait ! J'ai ajouté votre événement au calendrier pour cette heure.";
        }
        // Analyser la demande
        const hasTime = /(\d{1,2})h|\bmidi\b|\bsoir\b|\bmatin\b|\baprès-midi\b/i.test(userMessage);
        const hasDay = /\b(aujourd'hui|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|semaine\s+prochaine)\b/i.test(userMessage);
        const isEventRequest = /\b(rdv|rendez-vous|vais|prendre|faire|aller|controle|dentiste|médecin|avion|train|restaurant|tennis|vol)\b/i.test(userMessage);
        // Détecter le type d'événement pour les questions contextuelles
        let eventType = "événement";
        let questionContext = "";
        if (lowerMessage.includes("avion") || lowerMessage.includes("vol")) {
            eventType = "vol";
            questionContext = "À quelle heure décolle votre avion ?";
        }
        else if (lowerMessage.includes("dentiste")) {
            eventType = "rendez-vous chez le dentiste";
            questionContext = "À quelle heure est votre rendez-vous chez le dentiste ?";
        }
        else if (lowerMessage.includes("médecin")) {
            eventType = "rendez-vous médical";
            questionContext = "À quelle heure est votre rendez-vous médical ?";
        }
        else if (lowerMessage.includes("restaurant") || lowerMessage.includes("resto")) {
            eventType = "repas";
            questionContext = "À quelle heure voulez-vous aller au restaurant ?";
        }
        else if (lowerMessage.includes("tennis")) {
            eventType = "tennis";
            questionContext = "À quelle heure voulez-vous jouer au tennis ?";
        }
        else if (lowerMessage.includes("train")) {
            eventType = "train";
            questionContext = "À quelle heure part votre train ?";
        }
        // Gestion intelligente des réponses
        if (isEventRequest && hasDay && !hasTime) {
            // Événement avec jour mais sans heure -> demander l'heure
            return questionContext || "À quelle heure ?";
        }
        else if (isEventRequest && hasTime) {
            // Événement complet -> confirmer
            if (lowerMessage.includes("anniversaire")) {
                return "🎉 Parfait ! Votre anniversaire est noté au calendrier.";
            }
            else if (eventType === "vol") {
                return "✈️ Vol ajouté à votre calendrier !";
            }
            else if (eventType === "rendez-vous chez le dentiste") {
                return "🦷 Rendez-vous chez le dentiste ajouté !";
            }
            else if (eventType === "rendez-vous médical") {
                return "⚕️ Rendez-vous médical noté !";
            }
            else if (eventType === "tennis") {
                return "🎾 Session de tennis planifiée !";
            }
            else if (eventType === "repas") {
                return "🍽️ Repas ajouté au calendrier !";
            }
            else if (eventType === "train") {
                return "🚄 Voyage en train planifié !";
            }
            else {
                return "✅ Événement ajouté à votre calendrier !";
            }
        }
        else if (isEventRequest && !hasDay) {
            // Événement sans jour -> demander le jour
            return "Quel jour voulez-vous planifier cet " + eventType + " ?";
        }
        else if (lowerMessage.includes("annule") || lowerMessage.includes("supprime")) {
            // Annulation
            return "✅ J'ai supprimé l'événement de votre calendrier.";
        }
        else {
            // Réponse générale
            return "Je peux vous aider à planifier vos événements. Dites-moi ce que vous voulez faire, quel jour et à quelle heure !";
        }
    }
    const response = await axios_1.default.post(ENDPOINT, {
        model,
        messages,
        temperature,
    }, {
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
    });
    const choices = response.data.choices;
    return choices?.[0]?.message?.content || "";
}
//# sourceMappingURL=openrouter.js.map