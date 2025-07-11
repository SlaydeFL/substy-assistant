"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
// memoryStore.ts
const fs_1 = require("fs");
const path_1 = require("path");
const DATA_DIR = (0, path_1.join)(process.cwd(), "data");
if (!(0, fs_1.existsSync)(DATA_DIR)) {
    (0, fs_1.mkdirSync)(DATA_DIR);
}
const MEMORY_FILE = (0, path_1.join)(DATA_DIR, "memory.json");
function safeRead() {
    if (!(0, fs_1.existsSync)(MEMORY_FILE)) {
        return [];
    }
    try {
        const raw = (0, fs_1.readFileSync)(MEMORY_FILE, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
}
function safeWrite(facts) {
    try {
        (0, fs_1.writeFileSync)(MEMORY_FILE, JSON.stringify(facts, null, 2));
    }
    catch (err) {
        console.error("Erreur d’écriture mémoire", err);
    }
}
exports.MemoryStore = {
    getAll() {
        return safeRead();
    },
    add(fact) {
        const facts = safeRead();
        facts.push(fact);
        safeWrite(facts);
    },
};
//# sourceMappingURL=memoryStore.js.map