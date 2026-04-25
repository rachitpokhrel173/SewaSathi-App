import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('customer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)


async function handleRegister(e) {
  e.preventDefault()
  setError('')
  setLoading(true)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role
      }
    }
  })

  if (error) {
    setError(error.message)
    setLoading(false)
    return
  }

  const userRole = data.user?.user_metadata?.role
  if (userRole === 'customer') navigate('/customer')
  else if (userRole === 'provider') navigate('/provider')
  else if (userRole === 'admin') navigate('/admin')
  else navigate('/login')

  setLoading(false)
}

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>SewaSathi</h2>
        <p style={styles.subtitle}>Create your account</p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleRegister} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <select
            style={styles.select}
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value="customer">I need a service (Customer)</option>
            <option value="provider">I provide services (Service Provider)</option>
              <option value="admin">Admin</option>
          </select>

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.link}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' },
  card: { background: '#1a1a1a', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid #2a2a2a' },
  title: { color: '#ffffff', fontSize: '24px', fontWeight: '700', marginBottom: '4px', textAlign: 'center' },
  subtitle: { color: '#888', fontSize: '14px', marginBottom: '24px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '14px', outline: 'none' },
  select: { padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '14px', outline: 'none' },
  button: { padding: '12px', borderRadius: '8px', background: '#6c47ff', color: '#fff', fontWeight: '600', fontSize: '15px', border: 'none', cursor: 'pointer', marginTop: '4px' },
  error: { color: '#ff4d4d', fontSize: '13px', marginBottom: '8px', textAlign: 'center' },
  link: { color: '#888', fontSize: '13px', textAlign: 'center', marginTop: '20px' }
}