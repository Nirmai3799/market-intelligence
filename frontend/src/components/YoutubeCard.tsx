interface YoutubeVideo {
  title: string
  channel: string
  url: string
  transcript_excerpt: string
}

export default function YoutubeCard({ videos, ticker }: { videos: YoutubeVideo[]; ticker: string }) {
  if (!videos.length) return null

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        {/* YouTube icon */}
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-red-500 shrink-0">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
        </svg>
        <h3 className="text-white font-semibold text-base">YouTube Analysis — {ticker}</h3>
        <span className="text-gray-600 text-xs ml-auto">Transcript excerpts from recent videos</span>
      </div>

      <div className="space-y-4">
        {videos.map((v, i) => (
          <div key={i} className="border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition">
            <div className="flex items-start justify-between gap-3 mb-2">
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-sm font-medium hover:text-blue-400 transition leading-snug"
              >
                {v.title}
              </a>
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-red-500 hover:text-red-400 transition"
                aria-label="Open on YouTube"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8h-2V6.413l-7.793 7.794-1.414-1.414L17.585 5H13V3h8z"/>
                </svg>
              </a>
            </div>
            <p className="text-gray-600 text-xs mb-2">{v.channel}</p>
            <p className="text-gray-400 text-xs leading-relaxed line-clamp-4 italic">
              "{v.transcript_excerpt}..."
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
