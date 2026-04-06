#!/usr/bin/env python3
"""
Scrape scratch-off data from dr-lotto.com
Outputs JSON to public/scratchers-data.json
"""
import json
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

STATES = ["az", "ar", "ca", "ct", "fl", "ga", "ma", "mi", "nj", "ny", "oh", "pa"]
BASE = "https://www.dr-lotto.com"
OUT = Path(__file__).resolve().parent.parent / "public" / "scratchers-data.json"


def fetch(url: str, retries: int = 3) -> str:
    """Fetch URL with retries and polite delay."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; LottoSim/1.0)",
                "Accept": "text/html,application/xhtml+xml",
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
            else:
                print(f"  FAIL {url}: {e}", file=sys.stderr)
                return ""


class StateTableParser(HTMLParser):
    """Parse the state listing table to extract game rows."""
    def __init__(self):
        super().__init__()
        self.games = []
        self._in_row = False
        self._in_cell = False
        self._in_link = False
        self._current = {}
        self._cell_text = ""
        self._link_href = ""

    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        if tag == "tr":
            self._in_row = True
            self._current = {}
        elif tag == "td" and self._in_row:
            self._in_cell = True
            self._cell_text = ""
        elif tag == "a" and self._in_cell:
            self._in_link = True
            href = attrs_d.get("href", "")
            if "/game/" in href:
                self._link_href = href if href.startswith("http") else BASE + href

    def handle_endtag(self, tag):
        if tag == "tr" and self._in_row:
            self._in_row = False
            if self._current.get("name"):
                self.games.append(self._current)
        elif tag == "td" and self._in_cell:
            self._in_cell = False
            text = self._cell_text.strip()
            if not self._current.get("name") and text:
                self._current["name"] = text
            elif "🏆" in text or "score" not in self._current:
                # Score cell
                m = re.search(r"(\d+)", text)
                if m:
                    self._current["score"] = int(m.group(1))
            elif "$" in text:
                m = re.search(r"\$(\d+)", text)
                if m:
                    self._current["price"] = int(m.group(1))
        elif tag == "a" and self._in_link:
            self._in_link = False

    def handle_data(self, data):
        if self._in_cell:
            self._cell_text += data
            if self._in_link and data.strip() and not self._current.get("name"):
                self._current["name"] = data.strip()
                if self._link_href:
                    self._current["url"] = self._link_href
                    # Extract game ID from URL
                    m = re.search(r"/game/(\d+)", self._link_href)
                    if m:
                        self._current["gameId"] = m.group(1)


class GameDetailParser(HTMLParser):
    """Parse a game detail page for prize data."""
    def __init__(self):
        super().__init__()
        self.data = {}
        self._in_dt = False
        self._in_dd = False
        self._in_h2 = False
        self._in_cell = False
        self._text = ""
        self._prize_tiers = []
        self._current_tier = {}
        self._current_row_label = ""
        self._in_row = False
        self._dd_count = 0
        self._last_term = ""

    def handle_starttag(self, tag, attrs):
        if tag == "dt":
            self._in_dt = True
            self._text = ""
        elif tag == "dd":
            self._in_dd = True
            self._text = ""
        elif tag == "h2":
            self._in_h2 = True
            self._text = ""
        elif tag == "td":
            self._in_cell = True
            self._text = ""
        elif tag == "tr":
            self._in_row = True

    def handle_endtag(self, tag):
        if tag == "dt" and self._in_dt:
            self._in_dt = False
            self._last_term = self._text.strip()
        elif tag == "dd" and self._in_dd:
            self._in_dd = False
            val = self._text.strip()
            if self._last_term and val:
                key = self._last_term.lower().replace(" ", "_")
                # Try to parse numbers
                clean = val.replace("$", "").replace(",", "").replace("%", "")
                try:
                    if "." in clean:
                        self.data[key] = float(clean)
                    else:
                        self.data[key] = int(clean)
                except ValueError:
                    self.data[key] = val
                self._last_term = ""
        elif tag == "h2" and self._in_h2:
            self._in_h2 = False
            text = self._text.strip()
            # Prize tier headers look like "$2,000,000.00"
            m = re.match(r"\$[\d,]+\.?\d*", text)
            if m:
                if self._current_tier:
                    self._prize_tiers.append(self._current_tier)
                self._current_tier = {"prize": text, "remaining": 0, "claimed": 0}
        elif tag == "td" and self._in_cell:
            self._in_cell = False
            text = self._text.strip().replace(",", "")
            if self._current_tier:
                if "remaining" in self._current_tier and self._current_tier["remaining"] == 0:
                    try:
                        self._current_tier["remaining"] = int(text)
                    except ValueError:
                        pass
                elif "claimed" in self._current_tier and self._current_tier["claimed"] == 0:
                    try:
                        self._current_tier["claimed"] = int(text)
                    except ValueError:
                        pass

    def handle_data(self, data):
        if self._in_dt or self._in_dd or self._in_h2 or self._in_cell:
            self._text += data


def parse_state_page(html: str) -> list[dict]:
    """Extract game list from state page HTML."""
    parser = StateTableParser()
    parser.feed(html)
    # Also try regex fallback for robustness
    if not parser.games:
        # Fallback: regex parse from the page
        rows = re.findall(
            r'<tr[^>]*>.*?<a[^>]*href="([^"]*?/game/\d+)"[^>]*>([^<]+)</a>.*?🏆\s*(\d+).*?\$(\d+)',
            html, re.DOTALL
        )
        for href, name, score, price in rows:
            url = href if href.startswith("http") else BASE + href
            game_id = re.search(r"/game/(\d+)", href)
            parser.games.append({
                "name": name.strip(),
                "score": int(score),
                "price": int(price),
                "url": url,
                "gameId": game_id.group(1) if game_id else "",
            })
    return parser.games


def parse_game_page(html: str) -> dict:
    """Extract detail data from a game page."""
    parser = GameDetailParser()
    parser.feed(html)
    if parser._current_tier:
        parser._prize_tiers.append(parser._current_tier)
    return {**parser.data, "prizeTiers": parser._prize_tiers}


def scrape_state(state: str) -> list[dict]:
    """Scrape all games for a state."""
    url = f"{BASE}/state/{state}"
    print(f"Scraping {state.upper()}...", file=sys.stderr)
    html = fetch(url)
    if not html:
        return []

    games = parse_state_page(html)
    print(f"  Found {len(games)} games", file=sys.stderr)

    # Fetch details for top 10 games by score (to avoid hammering the site)
    top_games = sorted(games, key=lambda g: g.get("score", 0), reverse=True)[:10]
    for game in top_games:
        game_url = game.get("url", "")
        if game_url:
            time.sleep(0.5)  # polite delay
            detail_html = fetch(game_url)
            if detail_html:
                detail = parse_game_page(detail_html)
                game["details"] = detail
                print(f"    ✓ {game['name']} (score {game['score']})", file=sys.stderr)

    return games


def main():
    all_data = {"scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"), "states": {}}

    for state in STATES:
        games = scrape_state(state)
        if games:
            all_data["states"][state] = {
                "name": state.upper(),
                "gameCount": len(games),
                "games": games,
            }
        time.sleep(1)  # delay between states

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(all_data, indent=2))
    total = sum(s["gameCount"] for s in all_data["states"].values())
    print(f"\nDone! {total} games across {len(all_data['states'])} states → {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
