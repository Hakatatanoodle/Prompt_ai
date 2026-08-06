/* ============================================================
   Prompt AI — frontend logic
   All user/model text is inserted with textContent (XSS-safe).
   ============================================================ */

const chatEl = document.getElementById("chat");
const messagesEl = document.getElementById("messages");
const emptyStateEl = document.getElementById("emptyState");
const examplesEl = document.getElementById("examples");
const composer = document.querySelector(".composer textarea");
const sendBtn = document.getElementById("send");
const newChatBtn = document.getElementById("newChat");

let sending = false;
let lastUserMessage = null;

/* ---------- helpers ---------- */

function scrollToBottom() {
    chatEl.scrollTop = chatEl.scrollHeight;
}

function addMessage(text, className) {
    const p = document.createElement("p");
    p.className = "msg " + className;
    p.textContent = text;
    messagesEl.appendChild(p);
    return p;
}

function addTypingIndicator() {
    const p = document.createElement("p");
    p.className = "msg ai";
    const dots = document.createElement("span");
    dots.className = "typing";
    dots.innerHTML = "<span></span><span></span><span></span>";
    dots.setAttribute("aria-label", "Thinking");
    p.appendChild(dots);
    messagesEl.appendChild(p);
    scrollToBottom();
    return p;
}

/* ---------- rendering ---------- */

function renderQuestions(questions) {
    const wrap = document.createElement("div");
    wrap.className = "msg-questions";
    questions.forEach((q) => {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.type = "button";
        chip.textContent = q;
        chip.addEventListener("click", () => sendMessage(q));
        wrap.appendChild(chip);
    });
    messagesEl.appendChild(wrap);
}

function renderFinal(data) {
    const card = document.createElement("div");
    card.className = "final";

    // header: label + copy button
    const head = document.createElement("div");
    head.className = "final-head";

    const label = document.createElement("span");
    label.className = "final-label";
    label.textContent = "✨ Optimized Prompt";

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.type = "button";
    copyBtn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
        "<span>Copy</span>";
    copyBtn.addEventListener("click", () => copyPrompt(data.prompt, copyBtn));

    head.appendChild(label);
    head.appendChild(copyBtn);

    // objective
    let objectiveEl = null;
    if (data.objective) {
        objectiveEl = document.createElement("p");
        objectiveEl.className = "objective";
        const strong = document.createElement("strong");
        strong.textContent = "Goal: ";
        objectiveEl.appendChild(strong);
        objectiveEl.appendChild(document.createTextNode(data.objective));
    }

    // optimized prompt
    const box = document.createElement("pre");
    box.className = "prompt-box";
    box.textContent = data.prompt || "";

    // before/after: original prompt (collapsed)
    let originalToggle = null;
    if (lastUserMessage) {
        const details = document.createElement("details");
        details.className = "original-toggle";
        const summary = document.createElement("summary");
        summary.textContent = "View your original prompt";
        const orig = document.createElement("div");
        orig.className = "original-text";
        orig.textContent = lastUserMessage;
        details.appendChild(summary);
        details.appendChild(orig);
        originalToggle = details;
    }

    card.appendChild(head);
    if (objectiveEl) card.appendChild(objectiveEl);
    card.appendChild(box);
    if (originalToggle) card.appendChild(originalToggle);

    messagesEl.appendChild(card);
}

function renderError(message) {
    const wrap = document.createElement("div");
    wrap.className = "msg error";

    const text = document.createElement("span");
    text.textContent = "⚠️ " + message;

    const retry = document.createElement("button");
    retry.className = "retry-btn";
    retry.type = "button";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => {
        wrap.remove();
        if (lastUserMessage) sendMessage(lastUserMessage);
    });

    wrap.appendChild(text);
    wrap.appendChild(retry);
    messagesEl.appendChild(wrap);
}

/* ---------- copy to clipboard (with fallback) ---------- */

function copyPrompt(text, btn) {
    const done = () => {
        const label = btn.querySelector("span");
        const original = label.textContent;
        btn.classList.add("copied");
        label.textContent = "Copied ✓";
        setTimeout(() => {
            btn.classList.remove("copied");
            label.textContent = original;
        }, 1800);
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
        fallbackCopy(text, done);
    }
}

function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        done();
    } catch (e) {
        /* ignore */
    }
    ta.remove();
}

/* ---------- sending ---------- */

async function sendMessage(text) {
    const content = (text !== undefined ? text : composer.value).trim();
    if (!content || sending) return;

    sending = true;
    sendBtn.disabled = true;
    lastUserMessage = content;

    emptyStateEl.style.display = "none";
    addMessage(content, "user");
    composer.value = "";
    autoGrow();

    const typing = addTypingIndicator();

    try {
        const res = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: content })
        });
        const data = await res.json().catch(() => null);

        typing.remove();

        if (!res.ok) {
            renderError((data && data.error) || "Something went wrong on the server.");
        } else if (data.is_final) {
            renderFinal(data);
        } else {
            if (data.message) addMessage(data.message, "ai");
            if (Array.isArray(data.questions) && data.questions.length > 0) {
                renderQuestions(data.questions);
            }
        }
    } catch (err) {
        typing.remove();
        renderError("Network error — check that the server is running.");
    } finally {
        sending = false;
        sendBtn.disabled = false;
        scrollToBottom();
    }
}

/* ---------- composer ---------- */

function autoGrow() {
    composer.style.height = "auto";
    composer.style.height = Math.min(composer.scrollHeight, 160) + "px";
}

composer.addEventListener("input", autoGrow);
composer.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener("click", () => sendMessage());

/* ---------- example chips (zero-state) ---------- */

examplesEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) sendMessage(chip.textContent);
});

/* ---------- new chat ---------- */

async function newChat() {
    try {
        await fetch('/reset', { method: 'POST' });
    } catch (err) {
        /* server offline — clear locally anyway */
    }
    messagesEl.innerHTML = "";
    emptyStateEl.style.display = "";
    composer.value = "";
    lastUserMessage = null;
    autoGrow();
    composer.focus();
}

newChatBtn.addEventListener("click", newChat);

composer.focus();
