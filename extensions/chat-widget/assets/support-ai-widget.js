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

  const dynamicEl = document.createElement("div");
  dynamicEl.className = "support-ai-dynamic";

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
  panel.appendChild(dynamicEl);
  panel.appendChild(form);
  root.appendChild(panel);
  root.appendChild(bubble);

  function clearDynamic() {
    dynamicEl.innerHTML = "";
    dynamicEl.className = "support-ai-dynamic";
  }

  function appendMessage(text, role) {
    const el = document.createElement("div");
    el.className = "support-ai-msg support-ai-msg-" + role;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function apiPost(payload) {
    if (!apiBase) {
      throw new Error("API not configured");
    }
    const res = await fetch(apiBase + "/api/storefront/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  }

  function renderActions(actions) {
    clearDynamic();
    if (!actions) return;

    if (actions.type === "order_lookup_form") {
      dynamicEl.className = "support-ai-dynamic support-ai-form-block";
      const wrap = document.createElement("form");
      wrap.className = "support-ai-inline-form";
      wrap.innerHTML =
        '<label>Order number<input name="orderNumber" required placeholder="#1001" /></label>' +
        '<label>Email<input name="email" type="email" required placeholder="you@email.com" /></label>' +
        '<button type="submit">Track order</button>';
      wrap.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!apiBase) {
          appendMessage(
            "Configure App API base URL in theme block settings.",
            "bot",
          );
          return;
        }
        const fd = new FormData(wrap);
        const orderNumber = String(fd.get("orderNumber") || "").trim();
        const email = String(fd.get("email") || "").trim();
        if (!orderNumber || !email) return;
        appendMessage("Track order " + orderNumber, "user");
        clearDynamic();
        try {
          const data = await apiPost({
            type: "order_lookup",
            shopDomain: shop,
            sessionId,
            orderNumber,
            email,
          });
          if (data.reply) appendMessage(data.reply, "bot");
        } catch {
          appendMessage(
            "We could not check your order right now. Please try again shortly.",
            "bot",
          );
        }
      });
      dynamicEl.appendChild(wrap);
    }

    if (actions.type === "return_reasons" && actions.options) {
      dynamicEl.className = "support-ai-dynamic support-ai-reasons";
      const title = document.createElement("p");
      title.className = "support-ai-reasons-title";
      title.textContent = "Select a reason:";
      dynamicEl.appendChild(title);
      actions.options.forEach(function (opt) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "support-ai-reason-btn";
        btn.textContent = opt.label;
        btn.addEventListener("click", async function () {
          if (!apiBase) {
            appendMessage(
              "Configure App API base URL in theme block settings.",
              "bot",
            );
            return;
          }
          appendMessage(opt.label, "user");
          clearDynamic();
          try {
            const data = await apiPost({
              type: "return_reason",
              shopDomain: shop,
              sessionId,
              reasonCode: opt.code,
            });
            if (data.reply) appendMessage(data.reply, "bot");
          } catch {
            appendMessage(
              "We could not save your return reason. Please try again.",
              "bot",
            );
          }
        });
        dynamicEl.appendChild(btn);
      });
    }
  }

  async function sendMessage(content) {
    appendMessage(content, "user");
    input.value = "";
    clearDynamic();
    try {
      const data = await apiPost({
        type: "message",
        shopDomain: shop,
        sessionId,
        content,
      });
      if (data.reply) appendMessage(data.reply, "bot");
      renderActions(data.actions);
    } catch {
      appendMessage("Could not reach support. Try again later.", "bot");
    }
  }

  bubble.addEventListener("click", function () {
    panel.classList.toggle("support-ai-hidden");
    if (!panel.dataset.greeted) {
      panel.dataset.greeted = "1";
      appendMessage(
        "Hi! Ask about your order (e.g. where is my order), returns, or sizing.",
        "bot",
      );
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
    await sendMessage(content);
  });
})();
