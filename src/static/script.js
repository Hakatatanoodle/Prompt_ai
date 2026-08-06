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

// Build numbered answer lines from per-question selections, e.g.
//   1. Partnership
//   2. Marketing Manager
// plus a plain-text version for displaying the user's bubble.
function composeAnswerLines(questions, state) {
    const lines = [];
    const display = [];
    questions.forEach((item, idx) => {
        const answers = [...state[idx].selected];
        if (state[idx].custom) answers.push(state[idx].custom);
        if (answers.length === 0) return; // user skipped this question
        lines.push(`${idx + 1}. ${answers.join(", ")}`);
        display.push(answers.join(", "));
    });
    return { content: lines.join("\n"), display: display.join("\n") };
}

function renderQuestions(questions) {
    // One card holds all of this turn's questions so the user can answer
    // several at once before sending — no more lost answers from chips
    // that fire immediately.
    const card = document.createElement("div");
    card.className = "question-card";

    const head = document.createElement("div");
    head.className = "q-head";
    const title = document.createElement("span");
    title.textContent = "A few quick questions";
    const hint = document.createElement("span");
    hint.textContent = "answer what you can";
    head.appendChild(title);
    head.appendChild(hint);
    card.appendChild(head);

    // Per-question state: selected options (multi-select) + free text.
    const state = questions.map(() => ({ selected: new Set(), custom: "" }));

    const sendBtn = document.createElement("button");
    sendBtn.className = "send-answers";
    sendBtn.type = "button";
    sendBtn.textContent = "Send answers";
    sendBtn.disabled = true;

    function updateSend() {
        sendBtn.disabled = !state.some((s) => s.selected.size > 0 || s.custom !== "");
    }

    questions.forEach((item, idx) => {
        // Backwards-compatible: accept a plain string or
        // {"question": "...", "options": ["...", "..."]}
        const questionText = typeof item === "string" ? item : (item && item.question) || "";
        const options = typeof item === "string" ? [] : (Array.isArray(item.options) ? item.options : []);

        const q = document.createElement("div");
        q.className = "question";

        const label = document.createElement("div");
        label.className = "q-text";
        label.textContent = questionText;
        q.appendChild(label);

        if (options.length > 0) {
            const chips = document.createElement("div");
            chips.className = "msg-questions";
            options.forEach((opt) => {
                const chip = document.createElement("button");
                chip.className = "chip";
                chip.type = "button";
                chip.textContent = opt;
                chip.addEventListener("click", () => {
                    if (state[idx].selected.has(opt)) {
                        state[idx].selected.delete(opt);
                        chip.classList.remove("selected");
                    } else {
                        state[idx].selected.add(opt);
                        chip.classList.add("selected");
                    }
                    updateSend();
                });
                chips.appendChild(chip);
            });
            q.appendChild(chips);
        }

        const input = document.createElement("input");
        input.type = "text";
        input.className = "q-input";
        input.placeholder = options.length > 0 ? "…or type your own answer" : "Type your answer";
        input.addEventListener("input", () => {
            state[idx].custom = input.value.trim();
            updateSend();
        });
        // Enter submits the answers
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                sendBtn.click();
            }
        });
        q.appendChild(input);

        card.appendChild(q);
    });

    sendBtn.addEventListener("click", () => {
        const { content, display } = composeAnswerLines(questions, state);
        if (!content) return;
        sendMessage(content, display);
    });

    card.appendChild(sendBtn);
    messagesEl.appendChild(card);
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

    // Safety net: if the model left placeholder brackets like [Name]
    // in the prompt, surface it so the user doesn't copy junk.
    const placeholders = (data.prompt || "").match(/\[[^\]]+\]/g);
    if (placeholders) {
        const warn = document.createElement("div");
        warn.className = "placeholder-warn";
        warn.textContent =
            "⚠️ This prompt still has unfilled placeholders like " +
            placeholders[0] +
            " — ask the assistant to fill them in before using it.";
        card.appendChild(warn);
    }

    // Clear affordance: a delivered prompt ends the task. Next rough
    // prompt should start fresh — this button makes that explicit.
    const startNew = document.createElement("button");
    startNew.className = "btn ghost new-opt";
    startNew.type = "button";
    startNew.textContent = "↺ Start a new optimization";
    startNew.addEventListener("click", newChat);
    card.appendChild(startNew);

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

async function sendMessage(text, displayText) {
    const content = (text !== undefined ? text : composer.value).trim();
    if (!content || sending) return;

    sending = true;
    sendBtn.disabled = true;
    lastUserMessage = content;

    emptyStateEl.style.display = "none";
    addMessage(displayText || content, "user");
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
