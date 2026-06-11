import type { NewsArticle } from '../types'

export default function NewsCard({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <p className="text-gray-500 text-xs font-medium tracking-wider uppercase mb-3">Latest News</p>
      <div className="space-y-1">
        {articles.map((article, i) => (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:bg-gray-800 rounded-lg p-3 transition"
          >
            <p className="text-gray-200 text-sm font-medium leading-snug mb-1">{article.title}</p>
            <div className="flex gap-2 text-xs text-gray-600">
              <span>{article.source}</span>
              <span>·</span>
              <span>{new Date(article.published_at).toLocaleDateString()}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
