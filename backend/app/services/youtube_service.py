import re
import json
import concurrent.futures
import anthropic
from yt_dlp import YoutubeDL
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

from app.core.config import settings

# ─── Curated list of top finance/investing YouTube channels ───────────────────
FINANCE_CHANNELS = [
    {"name": "Patrick Boyle",   "query": "Patrick Boyle finance macro"},
    {"name": "Andrei Jikh",     "query": "Andrei Jikh investing portfolio"},
    {"name": "Graham Stephan",  "query": "Graham Stephan stock market"},
    {"name": "Meet Kevin",      "query": "Meet Kevin stocks economy"},
    {"name": "The Plain Bagel", "query": "Plain Bagel investing market"},
    {"name": "Joseph Carlson",  "query": "Joseph Carlson stock portfolio"},
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _search_videos(query: str, max_results: int = 4) -> list:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "skip_download": True,
    }
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"ytsearch{max_results}:{query}", download=False)
        return info.get("entries", []) or []
    except Exception:
        return []


def _get_transcript(video_id: str, max_chars: int = 1200) -> str | None:
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)
        text = " ".join(s.text for s in transcript[:200])
        return " ".join(text.split())[:max_chars]
    except (TranscriptsDisabled, NoTranscriptFound):
        return None
    except Exception:
        return None


def _get_video_meta(video_id: str) -> tuple[str, str]:
    """Return (title, channel) for a video ID."""
    opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(
                f"https://youtube.com/watch?v={video_id}", download=False
            )
            return info.get("title", ""), info.get("channel") or info.get("uploader", "")
    except Exception:
        return "", ""


def _clean_json(text: str) -> dict:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


# ─── Feature 1: Per-ticker YouTube search (used on Dashboard) ─────────────────

def get_youtube_insights(ticker: str, max_videos: int = 3) -> list:
    query = f"{ticker} stock analysis"
    candidates = _search_videos(query, max_results=max_videos + 3)

    results = []
    for entry in candidates:
        if len(results) >= max_videos:
            break
        video_id = entry.get("id") or entry.get("url", "").split("v=")[-1]
        title = entry.get("title", "")
        channel = entry.get("channel") or entry.get("uploader", "")
        if not video_id or not title:
            continue
        transcript = _get_transcript(video_id)
        if not transcript:
            continue
        results.append({
            "title": title,
            "channel": channel,
            "url": f"https://youtube.com/watch?v={video_id}",
            "transcript_excerpt": transcript,
        })
    return results


# ─── Feature 2: Summarize any YouTube URL ─────────────────────────────────────

def extract_video_id(url: str) -> str | None:
    match = re.search(r"(?:v=|youtu\.be/|embed/)([a-zA-Z0-9_-]{11})", url)
    return match.group(1) if match else None


def summarize_video(url: str) -> dict:
    video_id = extract_video_id(url)
    if not video_id:
        return {"error": "Could not extract video ID. Paste a standard YouTube URL."}

    title, channel = _get_video_meta(video_id)
    transcript = _get_transcript(video_id, max_chars=4000)
    if not transcript:
        return {"error": "No English transcript found for this video."}

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    prompt = f"""Analyze this financial YouTube video and return ONLY valid JSON.

Title: {title or "Unknown"}
Channel: {channel or "Unknown"}
Transcript:
{transcript}

Return this exact JSON shape — no extra text:
{{
  "title": "{title or "Unknown"}",
  "channel": "{channel or "Unknown"}",
  "url": "https://youtube.com/watch?v={video_id}",
  "summary": "<2-3 sentence summary of the main thesis>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>", "<point 4>", "<point 5>"],
  "tickers_mentioned": ["<ticker symbols only, empty array if none>"],
  "tone": "<Bullish|Bearish|Neutral|Mixed>",
  "confidence": <0-100>,
  "one_liner": "<one punchy sentence verdict>"
}}"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=900,
            messages=[{"role": "user", "content": prompt}],
        )
        return _clean_json(response.content[0].text)
    except Exception as e:
        return {
            "title": title,
            "channel": channel,
            "url": f"https://youtube.com/watch?v={video_id}",
            "error": f"AI analysis failed: {str(e)}",
            "transcript_excerpt": transcript[:500],
        }


# ─── Feature 3: Market Pulse — latest from top finance channels ───────────────

def _fetch_channel_latest(channel_info: dict) -> dict | None:
    candidates = _search_videos(channel_info["query"], max_results=4)
    for entry in candidates:
        video_id = entry.get("id") or entry.get("url", "").split("v=")[-1]
        if not video_id:
            continue
        transcript = _get_transcript(video_id, max_chars=2500)
        if not transcript:
            continue
        return {
            "channel_name": channel_info["name"],
            "title": entry.get("title", ""),
            "video_id": video_id,
            "url": f"https://youtube.com/watch?v={video_id}",
            "transcript": transcript,
        }
    return None


def get_market_pulse() -> dict:
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(_fetch_channel_latest, ch) for ch in FINANCE_CHANNELS]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    results = [r for r in results if r]
    if not results:
        return {
            "error": "Could not fetch any channel videos",
            "overall_sentiment": "Unavailable",
            "sentiment_score": 50,
            "market_summary": "",
            "key_themes": [],
            "videos": [],
        }

    videos_text = "\n\n---\n\n".join(
        f"Channel: {r['channel_name']}\nTitle: {r['title']}\nTranscript:\n{r['transcript']}"
        for r in results
    )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    prompt = f"""You have transcripts from {len(results)} top financial YouTube channels' latest videos.

{videos_text}

Analyze collectively and return ONLY valid JSON — no extra text:
{{
  "overall_sentiment": "<Bullish|Bearish|Neutral|Mixed>",
  "sentiment_score": <0-100 where 0=extreme bearish, 50=neutral, 100=extreme bullish>,
  "market_summary": "<2-3 sentences on what these creators collectively think right now>",
  "key_themes": ["<theme 1>", "<theme 2>", "<theme 3>"],
  "videos": [
    {{
      "channel": "<channel name>",
      "title": "<video title>",
      "url": "<youtube url>",
      "one_liner": "<one sentence on their current market view>",
      "tone": "<Bullish|Bearish|Neutral|Mixed>"
    }}
  ]
}}"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}],
        )
        data = _clean_json(response.content[0].text)
        # Patch URLs from actual fetch results in case Claude hallucinated them
        url_map = {r["channel_name"]: r["url"] for r in results}
        for v in data.get("videos", []):
            if v.get("channel") in url_map:
                v["url"] = url_map[v["channel"]]
        return data
    except Exception as e:
        return {
            "error": str(e),
            "overall_sentiment": "Unavailable",
            "sentiment_score": 50,
            "market_summary": "Analysis failed.",
            "key_themes": [],
            "videos": [
                {
                    "channel": r["channel_name"],
                    "title": r["title"],
                    "url": r["url"],
                    "one_liner": "Transcript fetched but AI analysis failed.",
                    "tone": "Neutral",
                }
                for r in results
            ],
        }
