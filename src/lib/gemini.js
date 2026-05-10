// Groq — film classici e fallback
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Gemini — film recenti, libri e ristoranti (Groq fallback)
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`

async function askGroq(prompt) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.8
    })
  })
  const data = await res.json()
  if (!res.ok) { console.error('Groq error:', JSON.stringify(data)); throw new Error(`Groq ${res.status}`) }
  return data.choices?.[0]?.message?.content || ''
}

async function askGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
    })
  })
  if (!res.ok) {
    const errData = await res.json()
    console.error('Gemini error:', JSON.stringify(errData))
    throw new Error(`Gemini ${res.status}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function parseJSON(text, fallback) {
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch { return fallback }
}

export const ai = {

  // Trama completa: Gemini-first, Groq fallback
  async getFullPlot(movie) {
    const prompt = `Sei un esperto di cinema. Scrivi la trama COMPLETA del film "${movie.title}" (anno: ${movie.release_date?.slice(0,4)}), includendo tutti gli spoiler, i colpi di scena e la conclusione finale. Rispondi in italiano, direttamente con la trama senza preamboli.
REGOLA ASSOLUTA: se non ricordi ogni dettaglio con certezza, rispondi SOLO con "Trama non disponibile." senza aggiungere nulla. Preferisci sempre "Trama non disponibile" a qualsiasi dettaglio inventato o incerto.`

    try {
      const geminiResult = await askGemini(prompt)
      if (!geminiResult.toLowerCase().includes('trama non disponibile')) return geminiResult
    } catch {}

    const groqResult = await askGroq(prompt)
    if (groqResult.toLowerCase().includes('trama non disponibile')) return null
    return groqResult
  },

  // Consigli personalizzati film: Groq → classici, Gemini → recenti + uscite
  async getPersonalizedSuggestions(watchedMovies, upcomingMovies) {
    if (!watchedMovies?.length) return { classics: [], recent: [], upcoming: [] }

    const favorites = watchedMovies.filter(m => m.is_favorite).slice(0, 10)
    const recent = watchedMovies.slice(0, 15)
    const favTitles = favorites.map(m => m.movie_title).join(', ') || 'nessuno ancora'
    const upcomingTitles = upcomingMovies?.slice(0, 20).map(m => `${m.title} (${m.release_date?.slice(0,4)})`).join(', ') || ''

    const classicsPrompt = `Sei un esperto cinefilo.
Film preferiti dell'utente: ${favTitles}
Film visti con voto: ${recent.map(m => `${m.movie_title}${m.rating ? ` (voto ${m.rating}/5)` : ''}`).join(', ')}
Suggerisci 3 film CLASSICI o di archivio (usciti prima del 2020) che potrebbero piacergli molto.
Per ognuno indica anche un punteggio di affinità da 1 a 5 stelle.
Rispondi SOLO in JSON: [{"title": "...", "original_title": "Original English Title", "year": "...", "reason": "...", "stars": 4}]`

    const recentPrompt = `Sei un esperto cinefilo aggiornato sulle ultime uscite.
Film preferiti dell'utente: ${favTitles}
Film visti con voto: ${recent.map(m => `${m.movie_title}${m.rating ? ` (voto ${m.rating}/5)` : ''}`).join(', ')}
${upcomingTitles ? `Film in uscita in Italia: ${upcomingTitles}` : ''}
1. Suggerisci 2 film RECENTI (dal 2020 in poi) che potrebbero piacergli, con punteggio affinità da 1 a 5 stelle.
2. ${upcomingTitles ? 'Indica max 2 film tra quelli in uscita che potrebbero interessargli, con punteggio affinità.' : ''}
Rispondi SOLO in JSON: {"recent": [{"title": "...", "original_title": "Original English Title", "year": "...", "reason": "...", "stars": 4}], "upcoming": [{"title": "...", "reason": "...", "stars": 3}]}`

    const [classicsText, recentText] = await Promise.allSettled([
      askGroq(classicsPrompt),
      askGemini(recentPrompt).catch(() => askGroq(recentPrompt))
    ])

    const classics = classicsText.status === 'fulfilled'
      ? parseJSON(classicsText.value, []) : []
    const recentData = recentText.status === 'fulfilled'
      ? parseJSON(recentText.value, { recent: [], upcoming: [] }) : { recent: [], upcoming: [] }

    return {
      classics,
      recent: recentData.recent || [],
      upcoming: recentData.upcoming || []
    }
  },

  // Film simili: Gemini-first, Groq fallback
  async getSimilarMovies(movie, watchedTitles = []) {
    const watched = watchedTitles.length ? `L'utente ha già visto: ${watchedTitles.slice(0, 20).join(', ')}.` : ''
    const prompt = `Sei un esperto cinefilo. L'utente ha amato "${movie.title}" (${movie.release_date?.slice(0,4)})${movie.rating ? ` e gli ha dato ${movie.rating}/5` : ''}.
${watched}
Suggerisci 6 film simili NON già visti. Per ognuno: titolo, anno, motivazione e stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"title": "...", "original_title": "Original English Title", "year": "...", "reason": "...", "stars": 4}]`

    try {
      const text = await askGemini(prompt)
      const result = parseJSON(text, null)
      if (result) return result
    } catch {}

    const text = await askGroq(prompt)
    return parseJSON(text, [])
  },

  // Libri simili: Gemini-first, Groq fallback
  async getSimilarBooks(book, readTitles = []) {
    const read = readTitles.length ? `L'utente ha già letto: ${readTitles.slice(0, 20).join(', ')}.` : ''
    const prompt = `Sei un esperto letterario. L'utente ha amato "${book.title}" di ${book.authors || 'autore sconosciuto'}.
${read}
Suggerisci 6 libri simili NON già letti. Per ognuno: titolo, autore, anno, motivazione e stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"title": "...", "original_title": "...", "authors": "...", "year": "...", "reason": "...", "stars": 4}]`

    try {
      const text = await askGemini(prompt)
      const result = parseJSON(text, null)
      if (result) return result
    } catch {}

    const text = await askGroq(prompt)
    return parseJSON(text, [])
  },

  // Consigli libri personalizzati: Groq → classici, Gemini → recenti
  async getPersonalizedBookSuggestions(readBooks) {
    if (!readBooks?.length) return { classics: [], recent: [] }

    const favorites = readBooks.filter(b => b.is_favorite).slice(0, 10)
    const recent = readBooks.slice(0, 15)
    const favTitles = favorites.map(b => b.book_title).join(', ') || 'nessuno ancora'
    const recentTitles = recent.map(b => `${b.book_title}${b.rating ? ` (voto ${b.rating}/5)` : ''}`).join(', ')

    const classicsPrompt = `Sei un esperto letterario.
Libri preferiti dell'utente: ${favTitles}
Libri letti con voto: ${recentTitles}
Suggerisci 3 libri CLASSICI (pubblicati prima del 2000) che potrebbero piacergli molto.
Per ognuno: titolo, autore, anno, motivazione e stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"title": "...", "original_title": "...", "authors": "...", "year": "...", "reason": "...", "stars": 4}]`

    const recentPrompt = `Sei un esperto letterario aggiornato.
Libri preferiti dell'utente: ${favTitles}
Libri letti con voto: ${recentTitles}
Suggerisci 3 libri RECENTI (dal 2010 in poi) che potrebbero piacergli.
Per ognuno: titolo, autore, anno, motivazione e stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"title": "...", "original_title": "...", "authors": "...", "year": "...", "reason": "...", "stars": 4}]`

    const [classicsText, recentText] = await Promise.allSettled([
      askGroq(classicsPrompt),
      askGemini(recentPrompt).catch(() => askGroq(recentPrompt))
    ])

    const classics = classicsText.status === 'fulfilled' ? parseJSON(classicsText.value, []) : []
    const recentData = recentText.status === 'fulfilled' ? parseJSON(recentText.value, []) : []

    return { classics, recent: recentData }
  },

  // Ristoranti simili: Gemini-first, Groq fallback
  async getSimilarRestaurants(place, visitedTitles = []) {
    const visited = visitedTitles.length ? `L'utente ha già visitato: ${visitedTitles.slice(0, 20).join(', ')}.` : ''
    const cityHint = place.city ? ` a ${place.city}` : ''
    const cuisineHint = place.cuisine ? ` (${place.cuisine})` : ''
    const prompt = `Sei un esperto di ristorazione italiana. L'utente ha amato "${place.name}"${cuisineHint}${cityHint}.
${visited}
Suggerisci 6 ristoranti simili reali NON già visitati, preferibilmente nella stessa città o in città italiane comparabili. Per ognuno: nome, città, cucina/categoria, motivazione e stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"name": "...", "city": "...", "cuisine": "...", "reason": "...", "stars": 4}]`

    try {
      const text = await askGemini(prompt)
      const result = parseJSON(text, null)
      if (result) return result
    } catch {}

    const text = await askGroq(prompt)
    return parseJSON(text, [])
  },

  // Serie TV simili: Gemini-first, Groq fallback
  async getSimilarShows(show, watchedTitles = []) {
    const watched = watchedTitles.length ? `L'utente ha già visto: ${watchedTitles.slice(0, 20).join(', ')}.` : ''
    const title = show.name || show.show_title
    const year = (show.first_air_date || show.show_year || '').slice(0, 4)
    const prompt = `Sei un esperto di serie TV. L'utente ha amato "${title}"${year ? ` (${year})` : ''}${show.rating ? ` e gli ha dato ${show.rating}/5` : ''}.
${watched}
Suggerisci 6 serie TV simili NON già viste. Per ognuna: titolo, anno di inizio, motivazione e stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"title": "...", "original_title": "...", "year": "...", "reason": "...", "stars": 4}]`

    try {
      const text = await askGemini(prompt)
      const result = parseJSON(text, null)
      if (result) return result
    } catch {}

    const text = await askGroq(prompt)
    return parseJSON(text, [])
  },

  // Consigli serie personalizzati: Groq → classiche, Gemini → recenti
  async getPersonalizedShowSuggestions(watchedShows) {
    if (!watchedShows?.length) return { classics: [], recent: [] }

    const favorites = watchedShows.filter(s => s.is_favorite).slice(0, 10)
    const recent = watchedShows.slice(0, 15)
    const favTitles = favorites.map(s => s.show_title).join(', ') || 'nessuna ancora'
    const recentTitles = recent.map(s => `${s.show_title}${s.rating ? ` (voto ${s.rating}/5)` : ''}`).join(', ')

    const classicsPrompt = `Sei un esperto di serie TV.
Serie preferite dell'utente: ${favTitles}
Serie viste con voto: ${recentTitles}
Suggerisci 3 serie TV CLASSICHE (andate in onda prima del 2015) che potrebbero piacergli.
Per ognuna: titolo originale, anno di inizio, motivazione e stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"title": "...", "original_title": "...", "year": "...", "reason": "...", "stars": 4}]`

    const recentPrompt = `Sei un esperto di serie TV aggiornato.
Serie preferite dell'utente: ${favTitles}
Serie viste con voto: ${recentTitles}
Suggerisci 3 serie TV RECENTI (dal 2015 in poi) che potrebbero piacergli.
Per ognuna: titolo originale, anno di inizio, motivazione e stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"title": "...", "original_title": "...", "year": "...", "reason": "...", "stars": 4}]`

    const [classicsText, recentText] = await Promise.allSettled([
      askGroq(classicsPrompt),
      askGemini(recentPrompt).catch(() => askGroq(recentPrompt))
    ])

    const classics = classicsText.status === 'fulfilled' ? parseJSON(classicsText.value, []) : []
    const recentData = recentText.status === 'fulfilled' ? parseJSON(recentText.value, []) : []
    return { classics, recent: recentData }
  },

  // Consigli ristoranti personalizzati: Gemini-first, Groq fallback
  // context: { city?: string, labels?: string[] } — optional targeting from UI
  async getPersonalizedRestaurantSuggestions(visitedRestaurants, context = {}) {
    if (!visitedRestaurants?.length) return []

    const { city, labels: targetLabels } = context
    const favorites = visitedRestaurants.filter(r => r.is_favorite).slice(0, 10)
    const recent = visitedRestaurants.slice(0, 15)

    const favSummary = favorites.length
      ? favorites.map(r => `${r.restaurant_name} (${r.restaurant_cuisine || 'cucina n/d'}, ${r.restaurant_city || 'città n/d'})`).join(', ')
      : 'nessuno ancora'

    const recentSummary = recent.map(r => {
      const parts = [r.restaurant_name]
      if (r.restaurant_cuisine) parts.push(r.restaurant_cuisine)
      if (r.restaurant_city) parts.push(r.restaurant_city)
      if (r.rating) parts.push(`voto ${r.rating}/5`)
      return parts.join(' — ')
    }).join('; ')

    const cuisines = [...new Set(visitedRestaurants.map(r => r.restaurant_cuisine).filter(Boolean))].slice(0, 10).join(', ') || 'non definita'
    const priceLevels = [...new Set(visitedRestaurants.map(r => r.restaurant_price_level).filter(Boolean))].sort().join(', ') || 'non definita'

    const cityLine = city ? `Città richiesta: ${city}` : `Città frequentate: ${[...new Set(visitedRestaurants.map(r => r.restaurant_city).filter(Boolean))].slice(0, 10).join(', ') || 'non definita'}`
    const labelsLine = targetLabels?.length ? `Occasioni/etichette richieste: ${targetLabels.join(', ')}` : `Etichette/occasioni: ${[...new Set(visitedRestaurants.flatMap(r => r.labels || []))].slice(0, 10).join(', ') || 'nessuna'}`

    const prompt = `Sei un esperto di ristorazione italiana. Analizza i gusti di questo utente:
Ristoranti preferiti: ${favSummary}
Cronologia recente: ${recentSummary}
Cucine frequentate: ${cuisines}
${cityLine}
Fasce prezzo tipiche (1-4): ${priceLevels}
${labelsLine}

Suggerisci 6 ristoranti reali adatti${city ? ` a ${city}` : ''}${targetLabels?.length ? ` per ${targetLabels.join(' e ')}` : ''}, coerenti con i gusti dell'utente. Per ognuno: nome, città, cucina, motivazione personalizzata in italiano, stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"name": "...", "city": "...", "cuisine": "...", "reason": "...", "stars": 4}]`

    try {
      const text = await askGemini(prompt)
      const result = parseJSON(text, null)
      if (result) return result
    } catch {}

    const text = await askGroq(prompt)
    return parseJSON(text, [])
  }
}
