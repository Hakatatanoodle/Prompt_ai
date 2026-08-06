# AI Prompt Optimizer

A small Flask + Groq app that turns rough user prompts into high-quality,
optimized prompts through a conversational clarify-and-confirm workflow.

## Setup

```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt

cp .env.example .env   # then add your GROQ_API_KEY
```

## Run

```bash
venv/bin/python src/main.py
```

Open http://127.0.0.1:5000 (or the preview URL), type a rough prompt,
and the assistant will ask clarifying questions before returning the
final optimized prompt.

## Notes

- Conversation history is stored per-session (Flask signed cookies),
  capped at the last 10 turns so the context window never fills up.
- The model is asked for strict JSON output (`response_format`), and the
  server defensively strips markdown fences / stray text before parsing.
- `SECRET_KEY` is set to a dev default in `main.py` — override it via env
  in production.
