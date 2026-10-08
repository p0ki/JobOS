#!/usr/bin/env python3
"""Build the reviewed extension with stable ordering, timestamps and permissions."""
import argparse
import io
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "extension" / "LinkedInJobOS"
ARCHIVE = ROOT / "public" / "LinkedInJobOS.zip"
FILES = ("content.js", "manifest.json", "popup.css", "popup.html", "popup.js")


def build():
    entries = tuple(sorted(p.name for p in SOURCE.iterdir()))
    if entries != FILES:
        raise SystemExit("Unexpected extension source files; review before packaging")
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
        for name in FILES:
            source = SOURCE / name
            if source.is_symlink() or not source.is_file():
                raise SystemExit("Extension entries must be regular files")
            info = zipfile.ZipInfo(f"LinkedInJobOS/{name}", (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, source.read_bytes())
    return output.getvalue()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify the archive without rewriting")
    args = parser.parse_args()
    expected = build()
    if args.check:
        if not ARCHIVE.exists() or ARCHIVE.read_bytes() != expected:
            raise SystemExit("Extension archive differs from reviewed source; rebuild it")
        print("Extension archive matches reviewed source exactly")
    else:
        ARCHIVE.write_bytes(expected)
        print("Built deterministic extension archive")
