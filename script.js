/* ==============================================
   GEMINI AI CHATBOT — Frontend Script
   Handles chat UI, API calls, theme, markdown
   ============================================== */

// ---------- DOM Elements ----------
const chatMessages = document.getElementById("chatMessages");
const welcomeScreen = document.getElementById("welcomeScreen");
const messageInput = document.getElementById("messageInput");
const btnSend = document.getElementById("btnSend");
const btnNewChat = document.getElementById("btnNewChat");
const btnThemeToggle = document.getElementById("btnThemeToggle");
const charCount = document.getElementById("charCount");
const suggestionChips = document.getElementById("suggestionChips");
const statusIndicator = document.getElementById("statusIndicator");

// ---------- State ----------
let isLoading = false;
let sessionId = generateSessionId();

// ---------- Initialize ----------
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  setupEventListeners();
  messageInput.focus();
});

// ---------- Event Listeners ----------
function setupEventListeners() {
  // Send message
  btnSend.addEventListener("click", sendMessage);

  // Enter to send, Shift+Enter for new line
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea & update char count
  messageInput.addEventListener("input", () => {
    autoResizeTextarea();
    updateCharCount();
    updateSendButton();
  });

  // New chat
  btnNewChat.addEventListener("click", resetChat);

  // Theme toggle
  btnThemeToggle.addEventListener("click", toggleTheme);

  // Suggestion chips
  suggestionChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) {
      const message = chip.getAttribute("data-message");
      messageInput.value = message;
      updateSendButton();
      sendMessage();
    }
  });
}

// ---------- Send Message ----------
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || isLoading) return;

  // Hide welcome screen
  if (welcomeScreen && !welcomeScreen.classList.contains("hidden")) {
    welcomeScreen.classList.add("hidden");
  }

  // Add user message to UI
  appendMessage("user", message);

  // Clear input
  messageInput.value = "";
  autoResizeTextarea();
  updateCharCount();
  updateSendButton();

  // Show typing indicator
  const typingEl = showTypingIndicator();
  isLoading = true;
  updateStatusIndicator("thinking");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
    });

    const data = await response.json();

    // Remove typing indicator
    removeTypingIndicator(typingEl);

    if (response.ok) {
      appendMessage("bot", data.response);
    } else {
      appendMessage("error", data.error || "Terjadi kesalahan. Silakan coba lagi.");
    }
  } catch (error) {
    removeTypingIndicator(typingEl);
    console.error("Fetch error:", error);
    appendMessage(
      "error",
      "Tidak dapat terhubung ke server. Pastikan server berjalan di http://localhost:3000"
    );
  } finally {
    isLoading = false;
    updateStatusIndicator("online");
    messageInput.focus();
  }
}

// ---------- Append Message to Chat ----------
function appendMessage(type, content) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", type);

  const avatarDiv = document.createElement("div");
  avatarDiv.classList.add("message-avatar");

  if (type === "user") {
    avatarDiv.textContent = "👤";
  } else if (type === "bot") {
    avatarDiv.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1v4a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-4H7a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/>
      <circle cx="9" cy="10" r="1.2" fill="currentColor"/>
      <circle cx="15" cy="10" r="1.2" fill="currentColor"/>
      <path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
    </svg>`;
  } else {
    avatarDiv.textContent = "⚠️";
  }

  const bubbleDiv = document.createElement("div");
  bubbleDiv.classList.add("message-bubble");

  if (type === "bot") {
    bubbleDiv.innerHTML = renderMarkdown(content);
  } else {
    bubbleDiv.textContent = content;
  }

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);

  scrollToBottom();
}

// ---------- Typing Indicator ----------
function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("typing-indicator");
  typingDiv.id = "typingIndicator";

  typingDiv.innerHTML = `
    <div class="message-avatar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1v4a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-4H7a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/>
        <circle cx="9" cy="10" r="1.2" fill="currentColor"/>
        <circle cx="15" cy="10" r="1.2" fill="currentColor"/>
        <path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
      </svg>
    </div>
    <div class="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  chatMessages.appendChild(typingDiv);
  scrollToBottom();
  return typingDiv;
}

function removeTypingIndicator(el) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

// ---------- Markdown Renderer (Simple) ----------
function renderMarkdown(text) {
  if (!text) return "";

  let html = text;

  // Escape HTML first (except what we'll replace)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr>");

  // Unordered list items
  html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Ordered list items
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Line breaks → paragraphs
  html = html
    .split(/\n\n+/)
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      // Don't wrap if already wrapped in block element
      if (
        block.startsWith("<h") ||
        block.startsWith("<pre") ||
        block.startsWith("<ul") ||
        block.startsWith("<ol") ||
        block.startsWith("<blockquote") ||
        block.startsWith("<hr")
      ) {
        return block;
      }
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");

  return html;
}

// ---------- UI Helpers ----------
function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
}

function updateCharCount() {
  const len = messageInput.value.length;
  charCount.textContent = `${len} / 4000`;
}

function updateSendButton() {
  btnSend.disabled = !messageInput.value.trim() || isLoading;
}

function updateStatusIndicator(status) {
  const dot = statusIndicator.querySelector(".status-dot");
  if (status === "thinking") {
    dot.style.background = "#f59e0b";
    dot.style.boxShadow = "0 0 6px rgba(245, 158, 11, 0.5)";
    statusIndicator.childNodes[statusIndicator.childNodes.length - 1].textContent = " Berpikir...";
  } else {
    dot.style.background = "#22c55e";
    dot.style.boxShadow = "0 0 6px rgba(34, 197, 94, 0.5)";
    statusIndicator.childNodes[statusIndicator.childNodes.length - 1].textContent = " Online";
  }
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ---------- Reset Chat ----------
async function resetChat() {
  try {
    await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  } catch (e) {
    // Ignore — we reset locally anyway
  }

  // Generate new session
  sessionId = generateSessionId();

  // Clear messages
  chatMessages.innerHTML = "";

  // Show welcome screen again
  const welcome = document.createElement("div");
  welcome.classList.add("welcome-screen");
  welcome.id = "welcomeScreen";
  welcome.innerHTML = `
    <div class="welcome-icon">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1v4a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-4H7a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/>
        <circle cx="9" cy="10" r="1.2" fill="currentColor"/>
        <circle cx="15" cy="10" r="1.2" fill="currentColor"/>
        <path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
      </svg>
    </div>
    <h2>Halo! Saya Gemini AI 👋</h2>
    <p>Tanyakan apa saja kepada saya. Saya siap membantu!</p>
    <div class="suggestion-chips" id="suggestionChips">
      <button class="chip" data-message="Jelaskan apa itu Artificial Intelligence">
        <span class="chip-icon">🤖</span>
        Apa itu AI?
      </button>
      <button class="chip" data-message="Berikan tips belajar pemrograman untuk pemula">
        <span class="chip-icon">💻</span>
        Tips belajar coding
      </button>
      <button class="chip" data-message="Buatkan contoh kode JavaScript sederhana">
        <span class="chip-icon">⚡</span>
        Contoh kode JS
      </button>
      <button class="chip" data-message="Ceritakan fakta menarik tentang teknologi">
        <span class="chip-icon">🚀</span>
        Fakta teknologi
      </button>
    </div>
  `;

  chatMessages.appendChild(welcome);

  // Re-bind suggestion chips
  const newChips = document.getElementById("suggestionChips");
  newChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) {
      messageInput.value = chip.getAttribute("data-message");
      updateSendButton();
      sendMessage();
    }
  });

  messageInput.focus();
}

// ---------- Theme ----------
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("chatbot-theme", next);
}

function loadTheme() {
  const saved = localStorage.getItem("chatbot-theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }
}

// ---------- Utilities ----------
function generateSessionId() {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}
