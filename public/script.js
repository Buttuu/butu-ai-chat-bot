let selectedImageBase64 = null;

// Avatars
const BOT_AVATAR = "bot.png";
const USER_AVATAR = "user.png";

// Limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Typing settings
const TYPING_SPEED = 35; // ms per character
const MIN_DELAY = 400;
const MAX_DELAY = 800;

/* ===============================
   MEMORY (SESSION BASED)
================================ */
const memory = {
  userName: null,
  lastUserMessage: null
};

/* ===============================
   CONSTANT REPLIES
================================ */
const replies = {
  hi: "Hello! 😊",
  hello: "Hi there! 👋",
  bye: "Goodbye! 👋",
  thanks: "You're welcome 😊",
  "thank you": "Glad to help! 🙌",
  "who are you": "I'm Butu, your AI assistant 🤖",
  "what is your name": "My name is Butu",
  "who is your owner": "Created by Soumyajit Maji",
  "your owner": "Created by Soumyajit Maji"
};

document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("send-btn");
  const input = document.getElementById("chatbot-input");
  const fileInput = document.getElementById("file-input");
  const preview = document.getElementById("file-preview-inline");

  /* ===============================
     IMAGE SELECT
  =============================== */
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("❌ Please select an image.");
      fileInput.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert("❌ Image must be under 10 MB.");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      selectedImageBase64 = reader.result.split(",")[1];
      preview.innerHTML = `
        <img src="${reader.result}">
        <div class="remove-file">×</div>
      `;
      preview.querySelector(".remove-file").onclick = clearImage;
    };
    reader.readAsDataURL(file);
  });

  sendBtn.onclick = sendMessage;

  input.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  function clearImage() {
    selectedImageBase64 = null;
    fileInput.value = "";
    preview.innerHTML = "";
  }

  /* ===============================
     SEND MESSAGE
  =============================== */
  function sendMessage() {
    const text = input.value.trim();
    if (!text && !selectedImageBase64) return;

    const imageToSend = selectedImageBase64;
    const normalizedText = text.toLowerCase();

    memory.lastUserMessage = text;

    if (text) appendMessage("user", escapeHTML(text), false);

    if (imageToSend) {
      appendMessage(
        "user",
        `<img class="content-img" src="data:image/jpeg;base64,${imageToSend}">`
      );
    }

    input.value = "";
    clearImage();

    /* ===============================
       MEMORY RESPONSES
    =============================== */
    if (normalizedText.startsWith("my name is")) {
      memory.userName = text.split("my name is")[1]?.trim();
      botReply(`Nice to meet you, ${memory.userName}! 😊`);
      return;
    }

    if (normalizedText.includes("what is my name")) {
      botReply(
        memory.userName
          ? `Your name is ${memory.userName} 😊`
          : "I don't know your name yet."
      );
      return;
    }

    if (normalizedText.includes("what did i say last")) {
      botReply(
        memory.lastUserMessage
          ? `You said: "${memory.lastUserMessage}"`
          : "I don't remember yet."
      );
      return;
    }

    /* ===============================
       CONSTANT REPLIES
    =============================== */
    if (!imageToSend) {
      for (const key in replies) {
        if (normalizedText.includes(key)) {
          botReply(replies[key]);
          return;
        }
      }
    }

    getBotResponse(text, imageToSend);
  }
});

/* ===============================
   BOT REPLY WITH CURSOR
================================ */
function botReply(text) {
  showTyping();

  const delay =
    Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;

  setTimeout(() => {
    hideTyping();
    typeMessageWithCursor(text);
  }, delay);
}

function typeMessageWithCursor(text) {
  const container = document.getElementById("chatbot-messages");

  const msg = document.createElement("div");
  msg.className = "message bot";

  msg.innerHTML = `
    <img class="avatar" src="${BOT_AVATAR}">
    <div class="bubble">
      <span class="typing-text"></span><span class="cursor">|</span>
    </div>
  `;

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;

  const textSpan = msg.querySelector(".typing-text");
  const cursor = msg.querySelector(".cursor");

  let i = 0;
  const interval = setInterval(() => {
    textSpan.textContent += text[i];
    i++;
    container.scrollTop = container.scrollHeight;

    if (i >= text.length) {
      clearInterval(interval);
      cursor.remove(); // stop cursor after typing
    }
  }, TYPING_SPEED);
}

/* ===============================
   UI HELPERS
================================ */
function appendMessage(sender, content, isHTML = true) {
  const container = document.getElementById("chatbot-messages");

  const msg = document.createElement("div");
  msg.className = `message ${sender}`;

  msg.innerHTML = `
    <img class="avatar" src="${sender === "user" ? USER_AVATAR : BOT_AVATAR}">
    <div class="bubble">${isHTML ? content : escapeHTML(content)}</div>
  `;

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById("chatbot-messages");
  if (document.getElementById("typing-indicator")) return;

  const typing = document.createElement("div");
  typing.className = "message bot";
  typing.id = "typing-indicator";

  typing.innerHTML = `
    <img class="avatar" src="${BOT_AVATAR}">
    <div class="bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;

  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  document.getElementById("typing-indicator")?.remove();
}

/* ===============================
   BACKEND CALL
================================ */
async function getBotResponse(message, imageBase64) {
  showTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, imageBase64 })
    });

    const data = await res.json();
    hideTyping();
    typeMessageWithCursor(data.reply || "No response.");
  } catch {
    hideTyping();
    typeMessageWithCursor("❌ Server error. Please try again.");
  }
}

/* ===============================
   SECURITY
================================ */
function escapeHTML(str) {
  return str
    ?.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
