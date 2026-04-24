const BOOKS_BASE = 'https://www.googleapis.com/books/v1'

function formatBook(item) {
  if (!item) return null
  const info = item.volumeInfo || {}
  return {
    id: item.id,
    title: info.title || 'Titolo sconosciuto',
    authors: info.authors?.join(', ') || 'Autore sconosciuto',
    cover: info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    year: info.publishedDate?.slice(0, 4) || '',
    pages: info.pageCount || null,
    description: info.description || '',
    categories: info.categories || [],
    language: info.language || '',
    publisher: info.publisher || '',
    averageRating: info.averageRating || null,
  }
}

export const googleBooks = {
  async search(query) {
    const res = await fetch(
      `${BOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=12&langRestrict=it`
    )
    const data = await res.json()
    return (data.items || []).map(formatBook).filter(Boolean)
  },

  async getBook(id) {
    const res = await fetch(`${BOOKS_BASE}/volumes/${id}`)
    const data = await res.json()
    return formatBook(data)
  },

  async getTrending() {
    const res = await fetch(
      `${BOOKS_BASE}/volumes?q=subject:fiction&orderBy=relevance&maxResults=20&langRestrict=it`
    )
    const data = await res.json()
    return (data.items || []).map(formatBook).filter(Boolean)
  },

  async getNewReleases() {
    const year = new Date().getFullYear()
    const res = await fetch(
      `${BOOKS_BASE}/volumes?q=subject:fiction+inpublisher:${year}&orderBy=newest&maxResults=20&langRestrict=it`
    )
    const data = await res.json()
    return (data.items || []).map(formatBook).filter(Boolean)
  },

  async searchByAuthor(author) {
    const res = await fetch(
      `${BOOKS_BASE}/volumes?q=inauthor:${encodeURIComponent(author)}&maxResults=6`
    )
    const data = await res.json()
    return (data.items || []).map(formatBook).filter(Boolean)
  },

  coverUrl(cover) {
    return cover || null
  }
}