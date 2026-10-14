#!/bin/sh
cd "$(dirname "$0")/../.." || exit 0
python3 .cursor/hooks/audit_prompt.py || exit 0
