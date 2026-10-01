from flask import Flask, jsonify, render_template, request
from pathlib import Path
import re

app = Flask(__name__)
PLAYLIST = Path(__file__).with_name("playlist.m3u8")

def parse_playlist():
    channels = []
    if not PLAYLIST.exists():
        return channels
    lines = PLAYLIST.read_text(encoding="utf-8", errors="ignore").splitlines()
    current = None
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith("#EXTINF:"):
            meta, _, name = line.partition(",")
            attrs = dict(re.findall(r'(\w[\w-]*)="([^"]*)"', meta))
            current = {
                "name": name.strip() or attrs.get("tvg-name", "Unknown"),
                "logo": attrs.get("tvg-logo", ""),
                "group": attrs.get("group-title", "Other"),
                "id": attrs.get("tvg-id", "")
            }
        elif current and not line.startswith("#"):
            current["url"] = line
            channels.append(current)
            current = None
    return channels

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/channels")
def channels_api():
    channels = parse_playlist()
    group = request.args.get("group", "").strip().lower()
    search = request.args.get("search", "").strip().lower()
    if group:
        channels = [c for c in channels if c["group"].lower() == group]
    if search:
        channels = [c for c in channels if search in c["name"].lower() or search in c["group"].lower()]
    return jsonify(channels)

@app.get("/api/groups")
def groups_api():
    groups = sorted({c["group"] for c in parse_playlist() if c["group"]})
    return jsonify(groups)

@app.get("/api/stats")
def stats_api():
    channels = parse_playlist()
    return jsonify({"channels": len(channels), "groups": len({c["group"] for c in channels})})

@app.post("/api/reload")
def reload_api():
    return jsonify({"ok": True, "channels": len(parse_playlist())})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
