"""Generate app-readable policy content from the approved Word documents.

Run from the frontend repository with: python scripts/generate-policies.py
The generated JSON is committed so production builds do not need the source DOCX files.
"""

from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "public" / "policies"
OUTPUT = ROOT / "src" / "content" / "policies.generated.json"
WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": WORD_NAMESPACE}
TAG = f"{{{WORD_NAMESPACE}}}"


POLICIES = [
    {
        "id": "partner-terms",
        "source": "partner-general-terms-v1.docx",
        "downloadPath": "/policies/partner-general-terms-v1.docx",
        "title": "Partner General Terms",
        "subtitle": "General Terms and Conditions of Marketplace Service",
        "audience": "Sellers and marketplace partners",
        "version": "Version 1.0",
        "summary": "The agreement framework for listings, orders, fulfilment, fees, settlement, data sharing, and category-specific seller obligations.",
        "highlights": [
            "The sales agreement is between the buyer and the seller.",
            "Africlay acts as marketplace agent and may receive payment on the seller's behalf.",
            "Sellers must keep listings, stock, packaging, and product information accurate.",
            "Fees, settlement, complaints, and deductions follow the agreement and applicable special terms.",
        ],
        "parser": "general",
    },
    {
        "id": "shipping-and-delivery",
        "source": "shipping-and-delivery-policy.docx",
        "downloadPath": "/policies/shipping-and-delivery-policy.docx",
        "title": "Shipping and Delivery",
        "subtitle": "How orders are prepared, priced, transported, and received",
        "audience": "Buyers and sellers",
        "summary": "Delivery coverage, timelines, shipping fees, tracking, failed deliveries, and remedies for lost or damaged shipments.",
        "highlights": [
            "The applicable delivery fee is shown before an order is confirmed.",
            "Delivery estimates vary by destination and operating conditions.",
            "Buyers must provide accurate delivery details and inspect packages on arrival.",
            "Lost or damaged shipments are investigated with the seller and logistics provider.",
        ],
        "parser": "shipping",
    },
    {
        "id": "seller-commission",
        "source": "seller-commission-policy.docx",
        "downloadPath": "/policies/seller-commission-policy.docx",
        "title": "Seller Commission",
        "subtitle": "10% commission on successful sales",
        "audience": "Sellers",
        "summary": "How the 10% marketplace commission is calculated, when it applies, and how cancellations, refunds, and seller settlements are handled.",
        "highlights": [
            "Africlay retains 10% of the agreed product sale price after a successful sale.",
            "The seller receives 90% before any separately disclosed and agreed charges.",
            "Commission is not finally earned on an order cancelled before completion.",
            "Order records should show commission, adjustments, and the net seller amount.",
        ],
        "parser": "commission",
    },
]


def normalize(value: str) -> str:
    replacements = {
        "\u00a0": " ",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2026": "...",
        "\ufeff": "",
    }
    for old, new in replacements.items():
        value = value.replace(old, new)
    value = re.sub(r"\s+", " ", value).strip()
    return re.sub(r"^(\d+[A-Z]?(?:\.\d+)+)(?=[A-Za-z])", r"\1 ", value)


def element_text(element: ElementTree.Element) -> str:
    return normalize("".join(node.text or "" for node in element.iterfind(".//w:t", NS)))


def read_document(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    body = root.find("w:body", NS)
    if body is None:
        return []

    nodes: list[dict] = []
    for child in body:
        if child.tag == f"{TAG}p":
            text = element_text(child)
            if not text:
                continue
            style_node = child.find("w:pPr/w:pStyle", NS)
            style = style_node.get(f"{TAG}val", "Normal") if style_node is not None else "Normal"
            nodes.append({"kind": "paragraph", "style": style, "text": text})
        elif child.tag == f"{TAG}tbl":
            rows = []
            for row in child.findall("w:tr", NS):
                cells = [element_text(cell) for cell in row.findall("w:tc", NS)]
                if any(cells):
                    rows.append(cells)
            if rows:
                nodes.append({"kind": "table", "rows": rows})
    return nodes


def content_block(node: dict) -> dict:
    if node["kind"] == "table":
        return {"kind": "table", "rows": node["rows"]}
    kind = "bullet" if "List" in node.get("style", "") else "paragraph"
    return {"kind": kind, "text": node["text"]}


def parse_shipping(nodes: list[dict]) -> list[dict]:
    sections: list[dict] = []
    current: dict | None = None
    for node in nodes:
        if node["kind"] == "paragraph" and node["text"] == "AFRICLAY MARKET SHIPPING & DELIVERY POLICY":
            continue
        if node["kind"] == "paragraph" and node.get("style") == "Heading2":
            current = {"title": node["text"], "blocks": []}
            sections.append(current)
            continue
        if current is None:
            current = {"title": "About this policy", "blocks": []}
            sections.append(current)
        current["blocks"].append(content_block(node))
    return sections


def parse_commission(nodes: list[dict]) -> list[dict]:
    ignored = {"SELLER COMMISSION POLICY", "10% Commission on Successful Sales", '"Every Purchase Builds Africa"'}
    sections: list[dict] = []
    current: dict | None = None
    for node in nodes:
        text = node.get("text", "")
        if text in ignored:
            continue
        if node["kind"] == "paragraph" and re.match(r"^\d+\.\s+\S", text) and len(text) <= 90:
            current = {"title": text, "blocks": []}
            sections.append(current)
            continue
        if current is None:
            current = {"title": "About this policy", "blocks": []}
            sections.append(current)
        current["blocks"].append(content_block(node))
    return sections


def is_general_heading(text: str, in_schedule: bool) -> bool:
    if re.match(r"^\d+[A-Z]?\.\s+[A-Z][A-Z0-9 ,&/-]+$", text):
        return True
    return in_schedule and bool(re.match(r"^\d+\.\s+[A-Z][A-Za-z]", text))


def parse_general(nodes: list[dict]) -> list[dict]:
    ignored = {
        "AFRICLAY",
        "General Terms and Conditions of Marketplace Service",
        "Africlay Marketplace - Partner General Terms",
        "Version 1.0",
    }
    sections: list[dict] = [{"title": "About these terms", "blocks": []}]
    current = sections[0]
    in_schedule = False
    index = 0
    while index < len(nodes):
        node = nodes[index]
        text = node.get("text", "")
        if text in ignored:
            index += 1
            continue
        if node["kind"] == "paragraph" and re.match(r"^SCHEDULE \d+$", text):
            in_schedule = True
            title = text
            if index + 1 < len(nodes):
                next_node = nodes[index + 1]
                next_text = next_node.get("text", "")
                if next_node["kind"] == "paragraph" and next_text.isupper():
                    title = f"{text}: {next_text.title()}"
                    index += 1
            current = {"title": title, "blocks": []}
            sections.append(current)
            index += 1
            continue
        if node["kind"] == "paragraph" and is_general_heading(text, in_schedule):
            current = {"title": text.title() if text.isupper() else text, "blocks": []}
            sections.append(current)
            index += 1
            continue
        current["blocks"].append(content_block(node))
        index += 1
    return [section for section in sections if section["blocks"]]


def all_text(sections: list[dict]) -> str:
    values: list[str] = []
    for section in sections:
        values.append(section["title"])
        for block in section["blocks"]:
            if block["kind"] == "table":
                values.extend(cell for row in block["rows"] for cell in row)
            else:
                values.append(block["text"])
    return " ".join(values)


def main() -> None:
    generated = []
    parsers = {"general": parse_general, "shipping": parse_shipping, "commission": parse_commission}
    for policy in POLICIES:
        source_path = SOURCE_ROOT / policy["source"]
        if not source_path.exists():
            raise FileNotFoundError(f"Missing policy source: {source_path}")
        sections = parsers[policy["parser"]](read_document(source_path))
        entry = {key: value for key, value in policy.items() if key != "parser"}
        entry["hasPlaceholders"] = bool(re.search(r"\[[^\]]+\]", all_text(sections)))
        entry["sections"] = sections
        generated.append(entry)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(generated, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(f"Generated {len(generated)} policies at {OUTPUT}")


if __name__ == "__main__":
    main()
