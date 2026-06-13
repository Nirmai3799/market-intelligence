import os


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    NEWSAPI_KEY: str = os.getenv("NEWSAPI_KEY", "")
    FINNHUB_API_KEY: str = os.getenv("FINNHUB_API_KEY", "")
    FMP_API_KEY: str = os.getenv("FMP_API_KEY", "")           # Financial Modeling Prep
    TWELVE_DATA_API_KEY: str = os.getenv("TWELVE_DATA_API_KEY", "")  # International real-time prices
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))

    # Email alerts — use Gmail + an App Password (not your real password)
    # Gmail: Account → Security → 2-Step Verification → App Passwords → generate one
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "")
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "")
    EMAIL_TO: str = os.getenv("EMAIL_TO", "")
    EMAIL_SMTP_HOST: str = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
    EMAIL_SMTP_PORT: int = int(os.getenv("EMAIL_SMTP_PORT", "587"))


settings = Settings()
