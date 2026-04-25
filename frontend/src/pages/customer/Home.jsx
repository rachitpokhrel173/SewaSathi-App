import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'

const categories = [
  { id: 'plumber', label: 'Plumber', icon: '🔧' },
  { id: 'electrician', label: 'Electrician', icon: '⚡' },
  { id: 'carpenter', label: 'Carpenter', icon: '🪚' },
  { id: 'painter', label: 'Painter', icon: '🖌️' },
  { id: 'cleaner', label: 'Cleaner', icon: '🧹' },
  { id: 'tutor', label: 'Tutor', icon: '📚' },
]

export default function CustomerHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handlePostJob() {
    if (!selected) return setError('Please select a service category.')
    if (!description.trim()) return setError('Please describe what you need.')

    setError('')
    setLoading(true)

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords

      const { error } = await supabase.from('jobs').insert({
        customer_id: user.id,
        category: selected,
        description,
        latitude,
        longitude,
        status: 'pending'
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        setSelected(null)
        setDescription('')
      }
      setLoading(false)
    }, () => {
      setError('Location access is required to post a job.')
      setLoading(false)
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={styles.page}>
      <div style={styles.navbar}>
        <span style={styles.logo}>SewaSathi</span>
        <div style={styles.navRight}>
          <span style={styles.welcome}>
            {user?.user_metadata?.full_name || 'Customer'}
          </span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>
<button style={styles.logoutBtn} onClick={() => navigate('/customer/jobs')}>My Jobs</button>
      <div style={styles.container}>
        <h2 style={styles.heading}>What service do you need?</h2>
        <p style={styles.sub}>Select a category and describe your problem</p>

        <div style={styles.grid}>
          {categories.map(cat => (
            <div
              key={cat.id}
              style={{
                ...styles.card,
                border: selected === cat.id ? '2px solid #6c47ff' : '2px solid #2a2a2a',
                background: selected === cat.id ? '#1e1433' : '#1a1a1a'
              }}
              onClick={() => setSelected(cat.id)}
            >
              <span style={styles.icon}>{cat.icon}</span>
              <span style={styles.label}>{cat.label}</span>
            </div>
          ))}
        </div>

        <textarea
          style={styles.textarea}
          placeholder="Describe your problem... e.g. pipe is leaking in bathroom"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
        />

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>Job posted successfully. Looking for nearby workers...</p>}

        <button
          style={styles.button}
          onClick={handlePostJob}
          disabled={loading}
        >
          {loading ? 'Posting...' : 'Find a Worker Near Me'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #2a2a2a', background: '#1a1a1a' },
  logo: { fontSize: '20px', fontWeight: '700', color: '#6c47ff' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  welcome: { color: '#aaa', fontSize: '14px' },
  logoutBtn: { padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid #333', color: '#aaa', cursor: 'pointer', fontSize: '13px' },
  container: { maxWidth: '700px', margin: '0 auto', padding: '40px 20px' },
  heading: { fontSize: '26px', fontWeight: '700', marginBottom: '8px' },
  sub: { color: '#888', fontSize: '14px', marginBottom: '32px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' },
  icon: { fontSize: '32px', marginBottom: '8px' },
  label: { fontSize: '14px', fontWeight: '500', color: '#fff' },
  textarea: { width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '16px' },
  button: { width: '100%', padding: '14px', borderRadius: '10px', background: '#6c47ff', color: '#fff', fontWeight: '600', fontSize: '16px', border: 'none', cursor: 'pointer' },
  error: { color: '#ff4d4d', fontSize: '13px', marginBottom: '12px' },
  success: { color: '#4dff91', fontSize: '13px', marginBottom: '12px' }
}