const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const console = require("console");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;
app.listen(PORT, () => console.log('server ready on https://localhost:${PORT}'));

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Store chat sessions in memory (per session)
const chatSessions = {};

// POST /api/chat — Send a message and get AI response
app.post("/api/chat", async(req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: "Pesan tidak boleh kosong." });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
            return res.status(500).json({
                error: "Gemini API key belum dikonfigurasi. Silakan isi GEMINI_API_KEY di file .env",
            });
        }

        // Create or reuse chat session
        const sid = sessionId || "default";
        if (!chatSessions[sid]) {
            chatSessions[sid] = {
                history: [],
            };
        }

        const session = chatSessions[sid];

        // Build conversation history for context
        const contents = [];

        // Add conversation history
        for (const entry of session.history) {
            contents.push({ role: "user", parts: [{ text: entry.user }] });
            contents.push({ role: "model", parts: [{ text: entry.model }] });
        }

        // Add current user message
        contents.push({ role: "user", parts: [{ text: message }] });

        // Call Gemini API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: contents,
            config: {
                systemInstruction: "Kamu adalah asisten AI yang ramah dan membantu. Jawab dalam bahasa yang sama dengan pengguna. Berikan jawaban yang jelas, informatif, dan mudah dipahami. Jika ditanya tentang topik teknis, berikan penjelasan yang detail namun tetap mudah dimengerti.",
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });

        const aiResponse =
            response.candidates ? .[0] ? .content ? .parts ? .[0] ? .text ||
            "Maaf, saya tidak bisa memberikan respons saat ini.";

        // Save to history
        session.history.push({
            user: message,
            model: aiResponse,
        });

        // Keep history manageable (last 20 exchanges)
        if (session.history.length > 20) {
            session.history = session.history.slice(-20);
        }

        res.json({ response: aiResponse });
    } catch (error) {
        console.error("Error calling Gemini API:", error);

        let errorMessage = "Terjadi kesalahan saat memproses permintaan.";
        if (error.message ? .includes("API_KEY")) {
            errorMessage = "API key tidak valid. Periksa kembali GEMINI_API_KEY di file .env";
        } else if (error.message ? .includes("quota")) {
            errorMessage = "Kuota API habis. Silakan coba lagi nanti.";
        } else if (error.message ? .includes("SAFETY")) {
            errorMessage = "Respons diblokir oleh filter keamanan. Coba pertanyaan lain.";
        }

        res.status(500).json({ error: errorMessage });
    }
});

// POST /api/reset — Reset chat history for a session
app.post("/api/reset", (req, res) => {
    const { sessionId } = req.body;
    const sid = sessionId || "default";
    delete chatSessions[sid];
    res.json({ message: "Chat history berhasil direset." });
});

// Serve the frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`🤖 Gemini AI Chatbot server berjalan di http://localhost:${PORT}`);
});