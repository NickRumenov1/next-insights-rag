#!/usr/bin/env python3
import json
import sys
from datetime import datetime

raw = sys.stdin.read()
if not raw.strip():
    sys.exit(0)

try:
    data = json.loads(raw)
except json.JSONDecodeError:
    sys.exit(0)

now = datetime.now()
record = {
    "date": now.strftime("%d.%m %H:%M"),
    "model_id": data.get("model_id"),
    "prompt": data.get("prompt"),
}

with open("prompts.jsonl", "a", encoding="utf-8") as audit:
    audit.write(json.dumps(record, ensure_ascii=False) + "\n")
