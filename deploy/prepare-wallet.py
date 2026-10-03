#!/usr/bin/env python3
"""Prepare a private text secret for Render without printing wallet contents."""
import base64
import os
import sys
import zipfile
from io import BytesIO
from pathlib import Path

root = Path(__file__).resolve().parents[1]
wallet = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / "wallet_quizdb"
required = [wallet / "cwallet.sso", wallet / "tnsnames.ora"]
if not all(path.is_file() for path in required):
    raise SystemExit("Wallet directory must contain cwallet.sso and tnsnames.ora")
buffer = BytesIO()
with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in required:
        archive.write(path, path.name)
output_dir = root / ".private-exports"
output_dir.mkdir(mode=0o700, exist_ok=True)
os.chmod(output_dir, 0o700)
output = output_dir / "wallet.zip.b64"
fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "wb") as handle:
    handle.write(base64.b64encode(buffer.getvalue()))
os.chmod(output, 0o600)
print(f"Ready: {output}")
print("Paste this file into a Render Secret File named wallet.zip.b64; never commit it.")
