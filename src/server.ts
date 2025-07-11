// server.ts
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { processUserMessage } from "./agent";
import { Calendar } from "./calendar";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// API routes
app.post("/api/chat", async (req: Request, res: Response) => {
  const { message } = req.body as { message: string };
  if (!message) {
    return res.status(400).json({ error: "Message manquant" });
  }
  try {
    const response = await processUserMessage(message);
    res.json({ response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

app.get("/api/calendar/events", (_: Request, res: Response) => {
  res.json(Calendar.list());
});

// Static front-end (React build)
const distDir = path.join(process.cwd(), "dist");
app.use(express.static(distDir));

// Catch all handler pour React Router
app.get("*", (_: Request, res: Response) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
}); 