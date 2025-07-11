// memoryStore.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface UserFact {
  id: string;
  text: string;
  timestamp: number;
  type?: "fact" | "event_created" | "question_asked" | "response_given";
  context?: string;
}

export interface ConversationContext {
  lastQuestion?: string;
  lastQuestionType?: "time" | "date" | "confirmation" | "clarification";
  pendingEvent?: {
    title: string;
    day: string;
    category: string;
    originalRequest: string;
  };
  lastAction?: string;
  awaitingResponse?: boolean;
}

const DATA_DIR = join(process.cwd(), "data");
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR);
}
const MEMORY_FILE = join(DATA_DIR, "memory.json");
const CONTEXT_FILE = join(DATA_DIR, "conversation_context.json");

function safeRead(): UserFact[] {
  if (!existsSync(MEMORY_FILE)) {
    return [];
  }
  try {
    const raw = readFileSync(MEMORY_FILE, "utf-8");
    return JSON.parse(raw) as UserFact[];
  } catch {
    return [];
  }
}

function safeWrite(facts: UserFact[]) {
  try {
    writeFileSync(MEMORY_FILE, JSON.stringify(facts, null, 2));
  } catch (err) {
    console.error("Erreur d'écriture mémoire", err);
  }
}

function safeReadContext(): ConversationContext {
  if (!existsSync(CONTEXT_FILE)) {
    return {};
  }
  try {
    const raw = readFileSync(CONTEXT_FILE, "utf-8");
    return JSON.parse(raw) as ConversationContext;
  } catch {
    return {};
  }
}

function safeWriteContext(context: ConversationContext) {
  try {
    writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2));
  } catch (err) {
    console.error("Erreur d'écriture contexte", err);
  }
}

export const MemoryStore = {
  getAll(): UserFact[] {
    return safeRead();
  },
  
  add(fact: UserFact) {
    const facts = safeRead();
    facts.push(fact);
    safeWrite(facts);
  },
  
  // Nouvelle méthode pour la mémoire conversationnelle
  getConversationContext(): ConversationContext {
    return safeReadContext();
  },
  
  setConversationContext(context: ConversationContext) {
    safeWriteContext(context);
  },
  
  // Méthode pour gérer les questions en attente
  setAwaitingResponse(question: string, type: "time" | "date" | "confirmation" | "clarification", pendingEvent?: any) {
    const context = safeReadContext();
    context.lastQuestion = question;
    context.lastQuestionType = type;
    context.awaitingResponse = true;
    if (pendingEvent) {
      context.pendingEvent = pendingEvent;
    }
    safeWriteContext(context);
  },
  
  // Méthode pour nettoyer le contexte après réponse
  clearAwaitingResponse() {
    const context = safeReadContext();
    context.awaitingResponse = false;
    context.lastQuestion = undefined;
    context.lastQuestionType = undefined;
    context.pendingEvent = undefined;
    safeWriteContext(context);
  },
  
  // Récupérer les derniers faits pertinents
  getRecentFacts(limit: number = 5): UserFact[] {
    const facts = safeRead();
    return facts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}; 