#!/usr/bin/env python3
"""Generate research/REPORT.md from results/*.json per fields.yaml.

Follows the research-report skill spec: TOC with anchor links + summary
fields (category | license | popularity), then per-item detail sections
covering every certain field, skipping uncertain/empty values, collecting
extra fields under "Other Info".
"""
import json
import re
from pathlib import Path

BASE = Path(__file__).parent
RESULTS = BASE / "results"
OUT = BASE / "REPORT.md"
TOC_FIELDS = ["category", "license", "popularity"]
INTERNAL = {"_source_file", "uncertain"}

# Our fields.yaml is a flat field list (no categories); one logical group.
CATEGORY_MAPPING = {
    "Basic Info": ["basic_info", "Basic Info"],
    "Technical Features": ["technical_features", "technical_characteristics"],
}


def field_order():
    names = []
    in_fields = False
    for line in open(BASE / "fields.yaml", encoding="utf-8"):
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


def lookup(data, field):
    """Top level -> category-mapped keys -> any nested dict."""
    if field in data:
        return data[field]
    for keys in CATEGORY_MAPPING.values():
        for k in keys:
            sub = data.get(k)
            if isinstance(sub, dict) and field in sub:
                return sub[field]
    for v in data.values():
        if isinstance(v, dict) and field in v:
            return v[field]
    return None


def is_uncertain(value, field, uncertain_list):
    if value is None:
        return True
    if field in uncertain_list:
        return True
    if isinstance(value, str) and ("[uncertain]" in value or not value.strip()):
        return True
    return False


def fmt(value, indent=0):
    pad = "  " * indent
    if isinstance(value, dict):
        return "<br>".join(
            "%s**%s**: %s" % (pad, k, fmt(v, 0)) for k, v in value.items()
        )
    if isinstance(value, list):
        if all(isinstance(x, dict) for x in value) and value:
            return "<br>".join(
                " | ".join("%s: %s" % (k, fmt(v, 0)) for k, v in d.items())
                for d in value
            )
        joined = ", ".join(str(x) for x in value)
        if len(joined) <= 100:
            return joined
        return "<br>".join("- %s" % x for x in value)
    s = str(value)
    if len(s) > 100:
        return s.replace("\n", "<br>")
    return s.replace("\n", "<br>")


def anchor(name):
    a = re.sub(r"[^\w\s-]", "", name.lower())
    return re.sub(r"[\s_]+", "-", a).strip("-")


def main():
    fields = field_order()
    items = []
    for path in sorted(RESULTS.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        data["_source_file"] = path.name
        items.append(data)

    lines = ["# Local-LLM Coding Agents — Landscape Research Report", ""]
    lines.append(
        "Topic: local-llm-coding-agents. %d items researched. "
        "Uncertain values omitted." % len(items)
    )
    lines.append("")
    lines.append("## Table of Contents")
    lines.append("")
    for i, d in enumerate(items, 1):
        unc = d.get("uncertain", []) or []
        name = lookup(d, "name") or d["_source_file"]
        summary = []
        for f in TOC_FIELDS:
            v = lookup(d, f)
            if not is_uncertain(v, f, unc):
                s = str(v)
                summary.append(s if len(s) <= 60 else s[:57] + "...")
        extra = (" - " + " | ".join(summary)) if summary else ""
        lines.append("%d. [%s](#%s)%s" % (i, name, anchor(str(name)), extra))
    lines.append("")

    for d in items:
        unc = d.get("uncertain", []) or []
        name = lookup(d, "name") or d["_source_file"]
        lines.append("## %s" % name)
        lines.append("")
        for f in fields:
            v = lookup(d, f)
            if is_uncertain(v, f, unc):
                continue
            lines.append("**%s**: %s" % (f, fmt(v)))
            lines.append("")
        extras = {
            k: v
            for k, v in d.items()
            if k not in fields and k not in INTERNAL and not isinstance(v, dict)
        }
        if extras:
            lines.append("### Other Info")
            lines.append("")
            for k, v in extras.items():
                lines.append("**%s**: %s" % (k, fmt(v)))
                lines.append("")
        if unc:
            lines.append("### Uncertain fields")
            lines.append("")
            for u in unc:
                lines.append("- %s" % u)
            lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print("Wrote %s (%d items, %d lines)" % (OUT, len(items), len(lines)))


if __name__ == "__main__":
    main()
