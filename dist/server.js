"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const agent_1 = require("./agent");
const calendar_1 = require("./calendar");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// API routes
app.post("/api/chat", async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: "Message manquant" });
    }
    try {
        const response = await (0, agent_1.processUserMessage)(message);
        res.json({ response });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur interne" });
    }
});
app.get("/api/calendar/events", (_, res) => {
    res.json(calendar_1.Calendar.list());
});
// Static front-end (React build)
const distDir = path_1.default.join(process.cwd(), "dist");
app.use(express_1.default.static(distDir));
// Catch all handler pour React Router
app.get("*", (_, res) => {
    res.sendFile(path_1.default.join(distDir, "index.html"));
});
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map