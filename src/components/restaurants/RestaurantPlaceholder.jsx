const CUISINE_EMOJI = [
  [/pizza/i, '🍕'],
  [/sushi|japan|giappo/i, '🍣'],
  [/burger|hamburger/i, '🍔'],
  [/chinese|cinese|asia/i, '🥡'],
  [/cafe|caff[eè]|coffee/i, '☕'],
  [/bakery|panett|bread|pasticc/i, '🥐'],
  [/bar|pub|aperit|cocktail/i, '🍹'],
  [/gelat|ice cream|dessert/i, '🍨'],
  [/steak|grill|carne/i, '🥩'],
  [/seafood|fish|pesc/i, '🐟'],
  [/vegan|veggie|veg/i, '🥗'],
  [/italian|italia|pasta|trattor|osteria|ristorante/i, '🍝'],
  [/breakfast|brunch/i, '🥞'],
  [/wine|vino|enot/i, '🍷'],
]

const PALETTE = [
  ['#fde68a', '#f59e0b'],
  ['#fecaca', '#ef4444'],
  ['#bbf7d0', '#22c55e'],
  ['#bfdbfe', '#3b82f6'],
  ['#ddd6fe', '#8b5cf6'],
  ['#fbcfe8', '#ec4899'],
  ['#a7f3d0', '#10b981'],
  ['#fed7aa', '#f97316'],
]

function pickEmoji(cuisine) {
  const c = String(cuisine || '').trim()
  for (const [re, emoji] of CUISINE_EMOJI) if (re.test(c)) return emoji
  return '🍽️'
}

function pickGradient(cuisine) {
  const s = String(cuisine || 'default')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  const [a, b] = PALETTE[Math.abs(h) % PALETTE.length]
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`
}

export default function RestaurantPlaceholder({ cuisine, size = 'card', className = '', style = {} }) {
  const emoji = pickEmoji(cuisine)
  const background = pickGradient(cuisine)
  const fontSize = size === 'modal' ? 56 : size === 'searchRow' ? 22 : 38
  return (
    <div
      className={className}
      style={{
        background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        textShadow: '0 2px 4px rgba(0,0,0,0.15)',
        ...style,
      }}
    >
      {emoji}
    </div>
  )
}
