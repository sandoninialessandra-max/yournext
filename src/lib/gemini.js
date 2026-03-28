//Groq
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function askGroq(prompt) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', //'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.8
    })
  })
  const data = await res.json()
  if (!res.ok) { console.error('Groq error:', JSON.stringify(data)); throw new Error(`Groq ${res.status}`) }
  return data.choices?.[0]?.message?.content || ''
}

export const ai = {
  async getSimilarMovies(movie, watchedTitles = []) {
    const watched = watchedTitles.length ? `L'utente ha già visto: ${watchedTitles.slice(0, 20).join(', ')}.` : ''
    const prompt = `Sei un esperto cinefilo. L'utente ha amato il film "${movie.title}" (${movie.release_date?.slice(0,4)}).
${watched}
Suggerisci 6 film simili che potrebbero piacergli, che NON siano già nella lista dei film visti.
Per ogni film fornisci:
- Titolo originale e anno
- Una frase di motivazione (perché è simile/piacerà)
Rispondi in italiano, in formato JSON array: [{"title": "...", "year": "...", "reason": "..."}]
Solo JSON, nessun testo aggiuntivo.`
    const text = await askGroq(prompt)
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      return JSON.parse(clean)
    } catch { return [] }
  },

  async getPersonalizedSuggestions(watchedMovies, upcomingMovies) {
    if (!watchedMovies?.length) return []
    const favorites = watchedMovies.filter(m => m.is_favorite).slice(0, 10)
    const recent = watchedMovies.slice(0, 15)
    const favTitles = favorites.map(m => m.movie_title).join(', ') || 'nessuno ancora'
    const recentTitles = recent.map(m => m.movie_title).join(', ')
    const upcomingTitles = upcomingMovies?.slice(0, 20).map(m => `${m.title} (${m.release_date?.slice(0,4)})`).join(', ') || ''
    const prompt = `Sei un esperto cinefilo personale. 
Film preferiti dell'utente (cuore rosso): ${favTitles}
Film recentemente visti: ${recentTitles}
${upcomingTitles ? `Film in uscita prossimamente in Italia: ${upcomingTitles}` : ''}
Basandoti sui gusti dell'utente:
1. Suggerisci 3 film di archivio (classici o meno noti) che gli potrebbero piacere molto
2. ${upcomingTitles ? 'Indica quali tra i film in uscita potrebbero interessargli di più (max 3)' : ''}
Rispondi in italiano, formato JSON: 
{"archive": [{"title": "...", "year": "...", "reason": "..."}], "upcoming": [{"title": "...", "reason": "..."}]}
Solo JSON.`
    const text = await askGroq(prompt)
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      return JSON.parse(clean)
    } catch { return { archive: [], upcoming: [] } }
  },

  async getFullPlot(movie) {
    const prompt = `Scrivi una trama COMPLETA e dettagliata del film "${movie.title}" (${movie.release_date?.slice(0,4)}), includendo tutti gli spoiler, colpi di scena finali e la conclusione. Sii esaustivo (almeno 300 parole). Rispondi in italiano. IMPORTANTE: se non conosci questo film con certezza, rispondi SOLO con la frase "Trama non disponibile per questo film." senza aggiungere nulla altro. Non inventare mai trame o dettagli.`
    return askGroq(prompt)
  }
}
/*Gemini
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`

async function askGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
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

export const ai = {
  async getSimilarMovies(movie, watchedTitles = []) {
    const watched = watchedTitles.length ? `L'utente ha già visto: ${watchedTitles.slice(0, 20).join(', ')}.` : ''
    const prompt = `Sei un esperto cinefilo. L'utente ha amato il film "${movie.title}" (${movie.release_date?.slice(0,4)}).
${watched}
Suggerisci 6 film simili che potrebbero piacergli, che NON siano già nella lista dei film visti.
Per ogni film fornisci:
- Titolo originale e anno
- Una frase di motivazione (perché è simile/piacerà)
Rispondi in italiano, in formato JSON array: [{"title": "...", "year": "...", "reason": "..."}]
Solo JSON, nessun testo aggiuntivo.`
    const text = await askGemini(prompt)
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      return JSON.parse(clean)
    } catch { return [] }
  },

  async getPersonalizedSuggestions(watchedMovies, upcomingMovies) {
    if (!watchedMovies?.length) return []
    const favorites = watchedMovies.filter(m => m.is_favorite).slice(0, 10)
    const recent = watchedMovies.slice(0, 15)
    const favTitles = favorites.map(m => m.movie_title).join(', ') || 'nessuno ancora'
    const recentTitles = recent.map(m => m.movie_title).join(', ')
    const upcomingTitles = upcomingMovies?.slice(0, 20).map(m => `${m.title} (${m.release_date?.slice(0,4)})`).join(', ') || ''

    const prompt = `Sei un esperto cinefilo personale. 
Film preferiti dell'utente (cuore rosso): ${favTitles}
Film recentemente visti: ${recentTitles}
${upcomingTitles ? `Film in uscita prossimamente in Italia: ${upcomingTitles}` : ''}

Basandoti sui gusti dell'utente:
1. Suggerisci 3 film di archivio (classici o meno noti) che gli potrebbero piacere molto
2. ${upcomingTitles ? 'Indica quali tra i film in uscita potrebbero interessargli di più (max 3)' : ''}

Rispondi in italiano, formato JSON: 
{
  "archive": [{"title": "...", "year": "...", "reason": "..."}],
  "upcoming": [{"title": "...", "reason": "..."}]
}
Solo JSON.`
    const text = await askGemini(prompt)
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      return JSON.parse(clean)
    } catch { return { archive: [], upcoming: [] } }
  },

  async getFullPlot(movie) {
    const prompt = `Scrivi una trama COMPLETA e dettagliata del film "${movie.title}" (${movie.release_date?.slice(0,4)}), includendo tutti gli spoiler, colpi di scena finali e la conclusione. Sii esaustivo (almeno 300 parole). Rispondi in italiano.`
    return askGemini(prompt)
  }
}*/
