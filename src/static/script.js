const promptInput = document.getElementById("prompt");
const sendBtn = document.getElementById("send");
const conversation = document.getElementById("conversation");
const finalPromptBox = document.getElementById("final_prompt");

// Build DOM nodes instead of innerHTML so user/model text can never
// execute as HTML (XSS-safe).
function appendMessage(text, className) {
    const p = document.createElement("p");
    p.className = className;
    p.textContent = text;
    conversation.appendChild(p);
}

async function sendMessage() {
    const prompt = promptInput.value.trim();
    if (!prompt || sendBtn.disabled) return;

    // Disable the button so spam-clicks can't fire overlapping requests.
    sendBtn.disabled = true;
    appendMessage(prompt, "user_message");
    promptInput.value = "";

    try {
        const res = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });

        const data = await res.json();
        if (!res.ok) {
            appendMessage("⚠️ " + (data.error || "Something went wrong."), "ai_message");
            return;
        }

        if (data.is_final) {
            finalPromptBox.textContent = data.prompt || "";
        } else {
            appendMessage(data.message || "", "ai_message");
            if (Array.isArray(data.questions) && data.questions.length > 0) {
                const ol = document.createElement("ol");
                data.questions.forEach(q => {
                    const li = document.createElement("li");
                    li.textContent = q;
                    ol.appendChild(li);
                });
                conversation.appendChild(ol);
            }
        }
    } catch (err) {
        appendMessage("⚠️ Network error — check that the server is running.", "ai_message");
    } finally {
        sendBtn.disabled = false;
        // Scroll after the new content is actually in the DOM.
        window.scrollTo(0, document.body.scrollHeight);
    }
}

async function resetConversation() {
    try {
        await fetch('/reset', { method: 'POST' });
    } catch (err) {
        // Even if the server call fails, clear the UI locally.
    }
    conversation.innerHTML = "";
    finalPromptBox.textContent = "";
    promptInput.value = "";
    promptInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
document.getElementById("reset").addEventListener("click", resetConversation);

// Enter sends, Shift+Enter makes a newline.
promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
