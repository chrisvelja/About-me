"""
Fetches Spotify's recently-played tracks and merges them into music-data.json,
building up a multi-day history over time (Spotify's own API only returns
a shallow rolling window, so accumulating snapshots is what gives the site
more than 'today / yesterday').

Run by .github/workflows/update-music.yml on a schedule. Needs:
  SPOTIFY_CLIENT_ID       (not secret, but read from env for one place to change it)
  SPOTIFY_REFRESH_TOKEN   (secret, from spotify-setup.html)
"""
import json
import os
import pathlib
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

CLIENT_ID = os.environ["SPOTIFY_CLIENT_ID"]
REFRESH_TOKEN = os.environ["SPOTIFY_REFRESH_TOKEN"]
DATA_FILE = pathlib.Path("music-data.json")
MAX_ENTRIES = 48
MAX_AGE_DAYS = 21


def post_form(url, data):
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/x-www-form-urlencoded"
    })
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def get_json(url, token):
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def main():
    token_data = post_form("https://accounts.spotify.com/api/token", {
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TOKEN,
        "client_id": CLIENT_ID,
    })
    access_token = token_data["access_token"]

    recent = get_json(
        "https://api.spotify.com/v1/me/player/recently-played?limit=50",
        access_token,
    )

    existing = []
    if DATA_FILE.exists():
        try:
            existing = json.loads(DATA_FILE.read_text())
        except json.JSONDecodeError:
            existing = []

    by_key = {(e["albumId"], e["playedAt"][:10]): e for e in existing}

    for item in recent.get("items", []):
        track = item["track"]
        album = track["album"]
        played_at = item["played_at"]
        key = (album["id"], played_at[:10])
        by_key[key] = {
            "albumId": album["id"],
            "title": album["name"],
            "artist": ", ".join(a["name"] for a in track["artists"]),
            "cover": (album["images"][0]["url"] if album.get("images") else ""),
            "spotifyUrl": album.get("external_urls", {}).get("spotify", ""),
            "playedAt": played_at,
        }

    merged = list(by_key.values())
    merged.sort(key=lambda e: e["playedAt"], reverse=True)

    cutoff = (datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    merged = [e for e in merged if e["playedAt"] >= cutoff][:MAX_ENTRIES]

    DATA_FILE.write_text(json.dumps(merged, indent=2) + "\n")
    print("wrote", len(merged), "entries")


if __name__ == "__main__":
    main()
