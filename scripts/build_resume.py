#!/usr/bin/env python3
"""Build the résumé PDFs from the site's own HTML (ADR-001 §4.6 and §4.7).

The PDF content comes straight from <main> in index.html (EN) and
pt/index.html (PT), so the site is the single source of truth. Anything
decorative or interactive is left out: elements with aria-hidden="true",
`hidden`, data-pdf="skip", <figure> and <form>.

The PDFs carry no phone number (it is not on the site) and no hidden
metadata: no author, creator, producer or dates. The only identifier is
the PDF /ID, a fixed hash of the content (no personal data).

Usage (needs reportlab: `pip install reportlab`):
    python3 scripts/build_resume.py
"""

from html import escape
from html.parser import HTMLParser
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    (ROOT / "index.html", ROOT / "assets/resume/resume-en.pdf", "Dakson Chaves Cruz - Resume"),
    (ROOT / "pt/index.html", ROOT / "assets/resume/curriculo-pt.pdf", "Dakson Chaves Cruz - Curriculo"),
]

BLOCKS = {"h1", "h2", "h3", "p", "li", "dt", "dd"}
SKIP_TAGS = {"figure", "form"}
VOID_TAGS = {"area", "br", "hr", "img", "input", "link", "meta", "source", "wbr"}
# HTML implied end tags: a new <li> closes the open <li>, and so on, but never across a list boundary.
IMPLICIT_CLOSE = {"li": {"li"}, "dt": {"dt", "dd"}, "dd": {"dt", "dd"}, "p": {"p"}}
CLOSE_BOUNDARY = {"ul", "ol", "dl", "section", "article", "div"}


def clean_url(href: str) -> str:
    """https://www.linkedin.com/in/x/ -> linkedin.com/in/x"""
    return href.split("://", 1)[-1].removeprefix("www.").rstrip("/")


class MainExtractor(HTMLParser):
    """Collects (tag, inline-markup) blocks from <main>, in document order.

    Robust to HTML that is valid but loose: void and self-closing tags,
    omitted end tags (e.g. </li>, </p>) and blocks nested in blocks (the
    inner block's text stays inside the outer one).
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.active = False
        # One entry per open element inside <main>: (tag, skipped, bold, opens_block)
        self.stack = []
        self.block = None
        self.buf = []
        self.blocks = []

    @property
    def skipping(self):
        return any(entry[1] for entry in self.stack)

    def handle_starttag(self, tag, attrs):
        if tag == "main":
            self.active = True
            return
        if not self.active:
            return
        if tag in VOID_TAGS:  # no content and no end tag; <br> still separates words
            if tag == "br" and self.block and not self.skipping:
                self.buf.append(" ")
            return
        self._close_implied(tag)
        a = dict(attrs)
        href = a.get("href") or ""
        if tag == "a" and href.startswith("http") and not self.skipping and self.block:
            # On paper the link text ("view profile") is useless: print the clean URL instead.
            self.buf.append(f'<link href="{escape(href)}">{escape(clean_url(href))}</link>')
            self.stack.append((tag, True, False, False))  # ignore the anchor's own text
            return
        skipped = (
            self.skipping
            or tag in SKIP_TAGS
            or a.get("aria-hidden") == "true"
            or "hidden" in a
            or a.get("data-pdf") == "skip"
        )
        bold = not skipped and "key" in (a.get("class") or "").split()
        opens_block = not skipped and tag in BLOCKS and self.block is None
        self.stack.append((tag, skipped, bold, opens_block))
        if opens_block:
            self.block, self.buf = tag, []
        elif not skipped and tag in BLOCKS:
            self.buf.append(" ")  # nested block: keep it apart from the surrounding text
        if bold:
            self.buf.append("<b>")

    def _close_implied(self, tag):
        for entry in reversed(self.stack):
            if entry[0] in CLOSE_BOUNDARY:
                return
            if entry[0] in IMPLICIT_CLOSE.get(tag, ()):
                self.handle_endtag(entry[0])
                return

    def handle_startendtag(self, tag, attrs):
        # <br/> and friends: a start tag only; a self-closing non-void tag is empty.
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.active:
            return
        if tag == "main":
            while self.stack:  # close anything left open
                self._close(self.stack.pop())
            self.active = False
            return
        if not any(entry[0] == tag for entry in self.stack):
            return  # stray end tag
        while True:  # also closes elements whose end tag was omitted
            entry = self.stack.pop()
            self._close(entry)
            if entry[0] == tag:
                return

    def _close(self, entry):
        tag, skipped, bold, opens_block = entry
        if skipped:
            return
        if bold:
            self.buf.append("</b>")
        if tag in BLOCKS and not opens_block:
            self.buf.append(" ")
        if opens_block:
            text = " ".join("".join(self.buf).split())
            if text:
                self.blocks.append((self.block, text))
            self.block = None

    def handle_data(self, data):
        if self.active and self.block and not self.skipping:
            self.buf.append(escape(data, quote=False))


INK = HexColor("#111111")
MUTED = HexColor("#444444")
GREEN = HexColor("#0a6b2a")

STYLES = {
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=INK, spaceAfter=2),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=GREEN, spaceBefore=12, spaceAfter=4),
    "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=INK, spaceBefore=8, spaceAfter=1),
    "p": ParagraphStyle("p", fontName="Helvetica", fontSize=9.5, leading=13, textColor=INK, spaceAfter=4),
    "li": ParagraphStyle("li", fontName="Helvetica", fontSize=9.5, leading=13, textColor=INK, leftIndent=10, bulletIndent=0, spaceAfter=2),
    "dt": ParagraphStyle("dt", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=MUTED),
    "dd": ParagraphStyle("dd", fontName="Helvetica", fontSize=9.5, leading=13, textColor=INK, leftIndent=10, spaceAfter=3),
}


def _strip_producer(canvas, _doc) -> None:
    canvas.setProducer("")


def build(source: Path, output: Path, title: str) -> None:
    parser = MainExtractor()
    parser.feed(source.read_text(encoding="utf-8"))

    story = []
    for tag, text in parser.blocks:
        if tag == "li":
            story.append(Paragraph(text, STYLES["li"], bulletText="•"))
        else:
            story.append(Paragraph(text, STYLES[tag]))

    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=title,
        author="",
        subject="",
        creator="",
        keywords="",
        invariant=True,  # no creation/modification dates or random document ID
    )
    doc.build(story, onFirstPage=_strip_producer, onLaterPages=_strip_producer)
    print(f"{output.relative_to(ROOT)}: {len(parser.blocks)} blocks")


if __name__ == "__main__":
    for source, output, title in TARGETS:
        build(source, output, title)
