(function () {
  const root = document.getElementById("support-ai-chat-root");
  if (!root) return;

  const shop = root.dataset.shop;
  const apiBase = (root.dataset.apiBase || "").replace(/\/$/, "");
  const sessionId =
    localStorage.getItem("support-ai-session") ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()));
  localStorage.setItem("support-ai-session", sessionId);

  const bubble = document.createElement("button");
  bubble.type = "button";
  bubble.className = "support-ai-bubble";
  bubble.setAttribute("aria-label", "Open support chat");
  bubble.textContent = "Chat";

  const panel = document.createElement("div");
  panel.className = "support-ai-panel support-ai-hidden";

  const header = document.createElement("div");
  header.className = "support-ai-header";
  header.textContent = "Support";

  const messagesEl = document.createElement("div");
  messagesEl.className = "support-ai-messages";

  const form = document.createElement("form");
  form.className = "support-ai-form";
  const input = document.createElement("input");
  input.type = "text";
  input.name = "message";
  input.placeholder = "Type a message...";
  input.autocomplete = "off";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Send";
  form.appendChild(input);
  form.appendChild(submit);

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(form);
  root.appendChild(panel);
  root.appendChild(bubble);

  function appendMessage(text, role) {
    const el = document.createElement("div");
    el.className = "support-ai-msg support-ai-msg-" + role;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  bubble.addEventListener("click", function () {
    panel.classList.toggle("support-ai-hidden");
    if (!panel.dataset.greeted) {
      panel.dataset.greeted = "1";
      appendMessage("Hi! Ask about your order, returns, or sizing.", "bot");
    }
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!apiBase) {
      appendMessage("Configure App API base URL in theme block settings.", "bot");
      return;
    }
    const content = input.value.trim();
    if (!content) return;
    appendMessage(content, "user");
    input.value = "";

    try {
      const res = await fetch(apiBase + "/api/storefront/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "message",
          shopDomain: shop,
          sessionId,
          content,
        }),
      });
      const data = await res.json();
      if (data.reply) appendMessage(data.reply, "bot");
      else appendMessage(data.error || "Something went wrong.", "bot");
    } catch {
      appendMessage("Could not reach support. Try again later.", "bot");
    }
  });
})();
