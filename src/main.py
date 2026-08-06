import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, session
from groq import Groq

# Load .env from the project root, no matter where you run the app from.
# (No hardcoded path here — this works on any machine.)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Kept as "api_key" as a fallback so your existing .env still works.
env_key = os.getenv("GROQ_API_KEY")
fallback_key = os.getenv("api_key")
key = (env_key or fallback_key or "").strip()  # strip sneaky trailing spaces/newlines

if not key:
    raise SystemExit(
        "\nNo API key found.\n"
        "  - Create a .env file in the project root (see .env.example)\n"
        "  - It must contain: GROQ_API_KEY=gsk_...\n"
        "  - Get a key at https://console.groq.com/keys\n"
    )

key_source = "GROQ_API_KEY" if env_key else "api_key"
print(f"[startup] Using API key from {key_source}: {key[:4]}...{key[-4:]} (length {len(key)})")

client = Groq(api_key=key)

# Needed for Flask's signed session cookies (used for per-user history).
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key-change-me-in-production")

MODEL = "llama-3.3-70b-versatile"
# Keep at most this many user/assistant turns of history per session
# so the context window never fills up and token cost stays bounded.
MAX_HISTORY_TURNS = 10

system_prompt = """
You are an expert Prompt Engineering Assistant. Your job is to transform rough user prompts into high-quality optimized prompts while preserving the user's intent.
Workflow

1. Analyze the user's prompt.
2. Infer the likely objective.
3. Identify any ambiguities, missing context, assumptions, constraints, desired outputs, audience, tone, or success criteria.
4. Ask only the minimum number of clarifying questions needed to eliminate ambiguity.
5. After receiving answers, determine whether sufficient information exists.
6. If information is still missing, continue asking clarifying questions.
7. Once confident, summarize your understanding of the user's objective and ask for confirmation.
8. If the user requests changes, continue refining the understanding until confirmed.
9. After confirmation, generate a highly optimized prompt using prompt engineering best practices.
Prompt Optimization Guidelines

* Preserve the user's original intent.
* Remove ambiguity.
* Fill in structure, not assumptions.
* Make assumptions only when necessary and explicitly confirm them first.
* Improve clarity and specificity.
* Add useful context.
* Specify desired output format when appropriate.
* Include relevant constraints.
* Organize the prompt logically.
* Avoid unnecessary verbosity.
Decision Rules

* If the initial prompt already contains sufficient information, skip unnecessary clarification and move directly to objective confirmation.
* Never generate the final optimized prompt until the user explicitly confirms your understanding.
Output Rules
Every response must be valid raw JSON.
Never output markdown.
Never use code fences.
Never include explanatory text outside the JSON.
When clarification is needed:
{
"is_final": false,
"message": "Your conversational response.",
"questions": [
"...",
"..."
]
}
When returning the optimized prompt:
{
"is_final": true,
"objective": "A concise summary of the confirmed objective.",
"prompt": "The fully optimized prompt."
}

"""


def parse_model_json(content):
    """Robustly extract a JSON object from the model's reply.

    LLMs sometimes wrap output in markdown code fences or add stray
    text around the JSON, which would crash a plain json.loads().
    """
    if not content:
        raise ValueError("Model returned an empty response")

    content = content.strip()

    # 1. If the reply is wrapped in a ```json ... ``` fence, take the inside.
    fence = re.search(r"```(?:json)?\s*(.*?)```", content, re.DOTALL)
    if fence:
        content = fence.group(1).strip()

    # 2. Otherwise, fall back to the first { ... } block in the reply.
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        content = content[start:end + 1]

    return json.loads(content)


@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({"error": "Message cannot be empty."}), 400

    # Per-session history instead of one global list shared by every user.
    history = session.get('history', [])
    history.append({"role": "user", "content": message})
    session['history'] = history

    try:
        response = client.chat.completions.create(
            messages=[{"role": "system", "content": system_prompt}] + history,
            model=MODEL,
            # Ask Groq to guarantee valid JSON output.
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        payload = parse_model_json(content)
    except Exception as e:
        print(f"Error sending message: {e}")
        return jsonify({"error": "Something went wrong on the server. Check the logs."}), 500

    history.append({"role": "assistant", "content": content})
    # Trim old turns so the conversation doesn't grow forever.
    session['history'] = history[-MAX_HISTORY_TURNS * 2:]

    return jsonify(payload)


@app.route('/reset', methods=['POST'])
def reset():
    """Clears the current session's conversation history."""
    session.pop('history', None)
    return jsonify({"ok": True})


@app.route('/')
def root():
    return render_template('index.html')


if __name__ == '__main__':
    # host=0.0.0.0 makes the app reachable from other devices on your
    # network (and the preview environment). debug=True is for dev only.
    app.run(debug=True, host='0.0.0.0', port=5000)


# NOTES
# 1. By default Flask routes only accept GET so you have to explicitly tell it to accept POST.
# 2. In Flask, anything created at the module level gets created once when the server starts and stays alive as long as the server is running.
