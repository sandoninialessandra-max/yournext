import { useState, useEffect } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { db } from '../../lib/db.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'
import { signOut } from '../../lib/supabase.js'

export default function ProfilePage() {
  const { user } = useAuth()
  const toast = useToast()
  const [friends, setFriends] = useState([])
  const [emailSearch, setEmailSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (user) db.getFriends(user.id).then(setFriends)
  }, [user])

  const handleSearch = async (q) => {
    setEmailSearch(q)
    if (q.length < 3) { setSearchResults([]); return }
    setSearching(true)
    const results = await db.searchUserByEmail(q)
    setSearchResults(results.filter(r => r.id !== user.id))
    setSearching(false)
  }

  const handleAddFriend = async (person) => {
    await db.addFriend(user.id, person.id)
    toast(`${person.full_name} aggiunto agli amici!`, 'success')
    db.getFriends(user.id).then(setFriends)
    setEmailSearch(''); setSearchResults([])
  }

  const avatar = user?.user_metadata?.avatar_url
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0]

  return (
    <div className="scroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profilo</h1>
        </div>
      </div>
      <div className="section">
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, padding: 20, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          {avatar
            ? <img src={avatar} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} />
            : <div style={{ width: 64, height: 64, background: 'var(--bg3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>}
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={signOut}>Esci</button>
        </div>

        {/* Friends */}
        <div className="section-title"><Users size={18} /> Amici <span>{friends.length}</span></div>

        {/* Add friend */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div className="search-bar">
            <UserPlus size={16} className="search-bar-icon" />
            <input className="input" placeholder="Cerca un amico per email..." value={emailSearch} onChange={e => handleSearch(e.target.value)} />
          </div>
          {emailSearch.length >= 3 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', zIndex: 10, marginTop: 4 }}>
              {searching && <div style={{ padding: 12, textAlign: 'center' }}><div className="loader" /></div>}
              {!searching && searchResults.length === 0 && <div style={{ padding: 12, fontSize: 13, color: 'var(--text3)' }}>Nessun utente trovato</div>}
              {searchResults.map(r => {
                const alreadyFriend = friends.some(f => f.friend_id === r.id)
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    {r.avatar_url ? <img src={r.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} /> : <div style={{ width: 32, height: 32, background: 'var(--bg4)', borderRadius: '50%' }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{r.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.email}</div>
                    </div>
                    {alreadyFriend
                      ? <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ Amico</span>
                      : <button className="btn btn-primary btn-sm" onClick={() => handleAddFriend(r)}><UserPlus size={12} /> Aggiungi</button>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {friends.length === 0
          ? <div className="empty-state" style={{ padding: '40px 20px' }}>
              <h3 style={{ marginBottom: 8 }}>Nessun amico ancora</h3>
              <p>Cerca per email gli amici che usano Cinematica!</p>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {friends.map(f => (
                <div key={f.friend_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  {f.profiles?.avatar_url
                    ? <img src={f.profiles.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    : <div style={{ width: 36, height: 36, background: 'var(--bg3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{f.profiles?.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.profiles?.email}</div>
                  </div>
                </div>
              ))}
            </div>}
      </div>
    </div>
  )
}
