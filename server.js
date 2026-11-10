import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "14mb" }));
app.use(express.static(path.join(__dirname, "public")));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente." }
});

app.get("/api/config", (_req, res) => {
  res.json({ model: MODEL, configured: Boolean(API_KEY) });
});

app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(503).json({ error: "A API ainda não foi configurada. Adicione OPENROUTER_API_KEY nas variáveis de ambiente do servidor." });
    }

    const { messages, model } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return res.status(400).json({ error: "Histórico de mensagens inválido." });
    }

    const safeMessages = messages.map((m) => {
      if (!m || !["user", "assistant"].includes(m.role)) throw new Error("Mensagem inválida.");
      let content = m.content;
      if (typeof content === "string") content = content.slice(0, 20000);
      else if (Array.isArray(content)) {
        content = content.slice(0, 8).map((part) => {
          if (part.type === "text") return { type: "text", text: String(part.text || "").slice(0, 12000) };
          if (part.type === "image_url" && typeof part.image_url?.url === "string" &&
              /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(part.image_url.url) &&
              part.image_url.url.length < 8_000_000) {
            return { type: "image_url", image_url: { url: part.image_url.url } };
          }
          throw new Error("Anexo inválido ou formato não suportado.");
        });
      } else throw new Error("Conteúdo de mensagem inválido.");
      return { role: m.role, content };
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || `http://localhost:${PORT}`,
        "X-Title": "NOOX AI"
      },
      body: JSON.stringify({
        model: model || MODEL,
        messages: [
          {
            role: "system",
            content: "Você é a NOOX AI, uma assistente útil, clara e honesta. Responda em português brasileiro quando o usuário escrever em português. Não invente fatos; explique incertezas. Ajude com tarefas legítimas e respeite limites de segurança."
          },
          ...safeMessages
        ],
        temperature: 0.7,
        max_tokens: 1800
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `O provedor retornou HTTP ${response.status}.`;
      return res.status(response.status).json({ error: message });
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) return res.status(502).json({ error: "O modelo não retornou uma resposta. Tente novamente ou escolha outro modelo." });
    res.json({ answer, model: data.model || model || MODEL });
  } catch (error) {
    res.status(400).json({ error: error.message || "Não foi possível processar a solicitação." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NOOX AI online na porta ${PORT}`);
});