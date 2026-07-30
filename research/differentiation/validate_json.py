#!/usr/bin/env python3
"""Validate that a research result JSON covers all fields defined in fields.yaml.

Usage: python validate_json.py -f fields.yaml -j result.json
Exits 0 if every field name is present as a key in the JSON, else 1.
No external deps: fields.yaml is parsed with a minimal line scanner.
"""
import argparse
import json
import re
import sys


def field_names(fields_path):
    names = []
    in_fields = False
    for line in open(fields_path, encoding="utf-8"):
        if re.match(r"^fields:\s*$", line):
            in_fields = True
            continue
        if in_fields:
            m = re.match(r"^\s+-\s+name:\s*(\S+)", line)
            if m:
                names.append(m.group(1))
            elif re.match(r"^\S", line):
                break
    return names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-f", required=True, help="fields.yaml path")
    ap.add_argument("-j", required=True, help="result json path")
    args = ap.parse_args()

    names = field_names(args.f)
    if not names:
        print("ERROR: no fields parsed from", args.f)
        return 1
    with open(args.j, encoding="utf-8") as fh:
        data = json.load(fh)
    missing = [n for n in names if n not in data]
    if missing:
        print("MISSING FIELDS:", ", ".join(missing))
        return 1
    print("OK: all %d fields present in %s" % (len(names), args.j))
    return 0


if __name__ == "__main__":
    sys.exit(main())
