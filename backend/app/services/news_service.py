import urllib.request
import xml.etree.ElementTree as ET
from newsapi import NewsApiClient
from app.core.config import settings


def _is_relevant(title: str, description: str, ticker: str) -> bool:
    """Return True if the article likely relates to this ticker."""
    text = (title + " " + description).lower()
    return ticker.lower() in text


def get_ticker_news(ticker: str, limit: int = 10) -> list:
    """Fetch latest news for a ticker — tries NewsAPI first, falls back to RSS."""
    articles = []

    # Strip exchange suffix so "RELIANCE.NS" searches as "RELIANCE"
    search_term = ticker.split(".")[0] if "." in ticker else ticker

    # Source 1: NewsAPI (requires valid key)
    if settings.NEWSAPI_KEY:
        try:
            client = NewsApiClient(api_key=settings.NEWSAPI_KEY)
            response = client.get_everything(
                q=search_term,
                language="en",
                sort_by="publishedAt",
                page_size=limit,
            )
            for a in response.get("articles", []):
                if a.get("title") and a["title"] != "[Removed]":
                    articles.append({
                        "title": a["title"],
                        "source": a["source"]["name"],
                        "url": a["url"],
                        "published_at": a["publishedAt"],
                        "description": a.get("description", ""),
                        "via": "newsapi",
                    })
        except Exception:
            pass  # Fall through to RSS

    # Source 2: Yahoo Finance RSS (free, no key needed)
    if len(articles) < limit:
        try:
            rss_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
            req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                tree = ET.parse(response)
                root = tree.getroot()
                relevant = []
                fallback = []
                for item in root.iter("item"):
                    title = item.findtext("title", "")
                    link = item.findtext("link", "")
                    pub_date = item.findtext("pubDate", "")
                    description = item.findtext("description", "")
                    if not title:
                        continue
                    entry = {
                        "title": title,
                        "source": "Yahoo Finance",
                        "url": link,
                        "published_at": pub_date,
                        "description": description,
                        "via": "rss",
                    }
                    if _is_relevant(title, description, search_term):
                        relevant.append(entry)
                    else:
                        fallback.append(entry)

                # Prefer relevant articles; pad with fallback only if needed
                rss_articles = relevant or fallback
                articles.extend(rss_articles)
        except Exception:
            pass

    return articles[:limit]
