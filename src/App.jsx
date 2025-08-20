import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const PAGE_SIZE = 50

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function generateMockItems(total) {
  const items = []
  for (let i = 1; i <= total; i += 1) {
    items.push({
      id: i,
      title: `Item ${i}`,
      subtitle: `Category ${(i % 10) + 1}`,
      description:
        `This is a short description for item ${i}. It is part of the demo dataset used for search, pagination, and infinite loading.`,
      externalUrl: `https://example.com/items/${i}`,
    })
  }
  return items
}

function Card({ item }) {
  return (
    <article className="card" aria-label={item.title}>
      <div className="card-media" aria-hidden="true" />
      <div className="card-body">
        <h3 className="card-title">{item.title}</h3>
        <p className="card-subtitle">{item.subtitle}</p>
        <p className="card-desc">{item.description}</p>
      </div>
      <div className="card-footer">
        <a
          className="external-button"
          href={item.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit
        </a>
      </div>
    </article>
  )
}

function buildPageWindow(current, total, maxLength = 7) {
  if (total <= maxLength) {
    return Array.from({ length: total }, (_, idx) => idx + 1)
  }
  const pages = new Set([1, total, current, current - 1, current + 1])
  for (let i = current - 2; i <= current + 2; i += 1) {
    if (i > 0 && i <= total) pages.add(i)
  }
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const withGaps = []
  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i]
    if (i > 0 && page - sorted[i - 1] > 1) {
      withGaps.push('…')
    }
    withGaps.push(page)
  }
  return withGaps
}

function App() {
  const [items] = useState(() => generateMockItems(1000))
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 200)
  const [pagesLoaded, setPagesLoaded] = useState(1)
  const sentinelRef = useRef(null)

  useEffect(() => {
    setPagesLoaded(1)
  }, [debouncedQuery])

  const filteredItems = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => {
      return (
        it.title.toLowerCase().includes(q) ||
        it.subtitle.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q)
      )
    })
  }, [items, debouncedQuery])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const effectivePagesLoaded = Math.min(pagesLoaded, totalPages)
  const visibleItems = filteredItems.slice(0, effectivePagesLoaded * PAGE_SIZE)

  useEffect(() => {
    const sentinelEl = sentinelRef.current
    if (!sentinelEl) return
    if (effectivePagesLoaded >= totalPages) return

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setPagesLoaded((prev) => Math.min(prev + 1, totalPages))
        }
      }
    }, { rootMargin: '200px 0px' })

    observer.observe(sentinelEl)
    return () => observer.disconnect()
  }, [effectivePagesLoaded, totalPages])

  const pageWindow = useMemo(
    () => buildPageWindow(effectivePagesLoaded, totalPages),
    [effectivePagesLoaded, totalPages]
  )

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Searchable Card Grid</h1>
        <div className="search-bar" role="search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, category, or description…"
            aria-label="Search items"
          />
        </div>
        <div className="meta-row">
          <span>
            Showing {visibleItems.length} of {filteredItems.length} results
          </span>
          <span> | Page size: {PAGE_SIZE}</span>
        </div>
      </header>

      <main>
        <section className="grid" aria-live="polite">
          {visibleItems.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </section>

        {visibleItems.length === 0 && (
          <div className="empty-state">No results found.</div>
        )}

        <nav className="pagination" aria-label="Pagination">
          <button
            className="page-btn"
            onClick={() => setPagesLoaded((p) => Math.max(1, p - 1))}
            disabled={effectivePagesLoaded <= 1}
          >
            Prev
          </button>
          {pageWindow.map((p, idx) =>
            p === '…' ? (
              <span key={`gap-${idx}`} className="page-gap">…</span>
            ) : (
              <button
                key={p}
                className={`page-num ${p === effectivePagesLoaded ? 'active' : ''}`}
                onClick={() => setPagesLoaded(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            className="page-btn"
            onClick={() => setPagesLoaded((p) => Math.min(totalPages, p + 1))}
            disabled={effectivePagesLoaded >= totalPages}
          >
            Next
          </button>
        </nav>

        {effectivePagesLoaded < totalPages && (
          <div className="load-more-row">
            <button
              className="load-more"
              onClick={() => setPagesLoaded((p) => Math.min(totalPages, p + 1))}
            >
              Load more
            </button>
          </div>
        )}

        <div ref={sentinelRef} className="sentinel" aria-hidden="true" />
      </main>
    </div>
  )
}

export default App
