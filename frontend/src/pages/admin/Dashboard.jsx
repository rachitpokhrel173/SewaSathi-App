import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'

const NAV = ['Overview', 'Users', 'Jobs', 'Providers']

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState({ users: 0, jobs: 0, pending: 0, completed: 0 })
  const [users, setUsers] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: profiles }, { data: jobs }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('jobs').select('*')
    ])
    const p = profiles || []
    const j = jobs || []
    setUsers(p)
    setJobs(j)
    setStats({
      users: p.length,
      jobs: j.length,
      pending: j.filter(x => x.status === 'pending').length,
      completed: j.filter(x => x.status === 'completed').length
    })
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function deleteJob(id) {
    await supabase.from('jobs').delete().eq('id', id)
    setJobs(prev => prev.filter(j => j.id !== id))
    setStats(s => ({ ...s, jobs: s.jobs - 1 }))
  }

  const providers = users.filter(u => u.role === 'provider')
  const customers = users.filter(u => u.role === 'customer')

  return (
    <div style={s.page}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <div style={s.brandDot} />
          <span style={s.brandName}>SewaSathi</span>
        </div>
        <div style={s.sideLabel}>ADMIN PANEL</div>
        <nav style={s.nav}>
          {NAV.map(n => (
            <button
              key={n}
              style={{ ...s.navBtn, ...(tab === n ? s.navActive : {}) }}
              onClick={() => setTab(n)}
            >
              <span style={s.navIcon}>{icons[n]}</span>
              {n}
            </button>
          ))}
        </nav>
        <button style={s.logoutBtn} onClick={handleLogout}>
          <span>↩</span> Logout
        </button>
      </aside>

      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <h1 style={s.pageTitle}>{tab}</h1>
            <p style={s.pageSub}>
              {tab === 'Overview' && 'Platform summary at a glance'}
              {tab === 'Users' && `${users.length} total registered users`}
              {tab === 'Jobs' && `${jobs.length} total job requests`}
              {tab === 'Providers' && `${providers.length} registered service providers`}
            </p>
          </div>
          <div style={s.badge}>Admin</div>
        </div>

        {loading ? (
          <div style={s.loading}>Loading...</div>
        ) : (
          <>
            {tab === 'Overview' && (
              <div>
                <div style={s.statsGrid}>
                  {[
                    { label: 'Total Users', value: stats.users, color: '#6c47ff' },
                    { label: 'Total Jobs', value: stats.jobs, color: '#00c9a7' },
                    { label: 'Pending Jobs', value: stats.pending, color: '#f5a623' },
                    { label: 'Completed', value: stats.completed, color: '#4dff91' },
                  ].map(stat => (
                    <div key={stat.label} style={s.statCard}>
                      <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
                      <div style={s.statLabel}>{stat.label}</div>
                      <div style={{ ...s.statBar, background: stat.color + '22' }}>
                        <div style={{ ...s.statFill, background: stat.color, width: `${Math.min((stat.value / 10) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Recent Jobs</h3>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {['Category', 'Description', 'Status', 'Date'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.slice(0, 5).map(job => (
                        <tr key={job.id} style={s.tr}>
                          <td style={s.td}>{job.category}</td>
                          <td style={s.td}>{job.description?.slice(0, 40)}...</td>
                          <td style={s.td}>
                            <span style={{ ...s.pill, background: statusColor(job.status) + '22', color: statusColor(job.status) }}>
                              {job.status}
                            </span>
                          </td>
                          <td style={s.td}>{new Date(job.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'Users' && (
              <div style={s.section}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Name', 'Phone', 'Role', 'Verified', 'Joined'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={s.tr}>
                        <td style={s.td}>{u.full_name || 'N/A'}</td>
                        <td style={s.td}>{u.phone || 'N/A'}</td>
                        <td style={s.td}>
                          <span style={{ ...s.pill, background: u.role === 'provider' ? '#6c47ff22' : '#00c9a722', color: u.role === 'provider' ? '#6c47ff' : '#00c9a7' }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={s.td}>{u.is_verified ? '✓' : '✗'}</td>
                        <td style={s.td}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'Jobs' && (
              <div style={s.section}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Category', 'Description', 'Status', 'Date', 'Action'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => (
                      <tr key={job.id} style={s.tr}>
                        <td style={s.td}>{job.category}</td>
                        <td style={s.td}>{job.description?.slice(0, 40)}</td>
                        <td style={s.td}>
                          <span style={{ ...s.pill, background: statusColor(job.status) + '22', color: statusColor(job.status) }}>
                            {job.status}
                          </span>
                        </td>
                        <td style={s.td}>{new Date(job.created_at).toLocaleDateString()}</td>
                        <td style={s.td}>
                          <button style={s.deleteBtn} onClick={() => deleteJob(job.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'Providers' && (
              <div style={s.cardsGrid}>
                {providers.length === 0 && <p style={{ color: '#555' }}>No providers registered yet.</p>}
                {providers.map(p => (
                  <div key={p.id} style={s.providerCard}>
                    <div style={s.providerAvatar}>
                      {p.full_name?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <div style={s.providerName}>{p.full_name || 'Unknown'}</div>
                    <div style={s.providerPhone}>{p.phone || 'No phone'}</div>
                    <div style={{ ...s.pill, background: p.is_verified ? '#4dff9122' : '#ff4d4d22', color: p.is_verified ? '#4dff91' : '#ff4d4d', marginTop: '12px', display: 'inline-block' }}>
                      {p.is_verified ? 'Verified' : 'Unverified'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function statusColor(status) {
  if (status === 'pending') return '#f5a623'
  if (status === 'accepted') return '#6c47ff'
  if (status === 'completed') return '#4dff91'
  if (status === 'cancelled') return '#ff4d4d'
  return '#888'
}

const icons = { Overview: '◈', Users: '◉', Jobs: '◎', Providers: '◆' }

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' },
  sidebar: { width: '220px', minHeight: '100vh', background: '#111', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', top: 0, left: 0, bottom: 0 },
  brand: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' },
  brandDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#6c47ff' },
  brandName: { fontSize: '18px', fontWeight: '700', color: '#fff' },
  sideLabel: { fontSize: '10px', letterSpacing: '0.1em', color: '#444', marginBottom: '12px', paddingLeft: '8px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  navBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#666', fontSize: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  navActive: { background: '#6c47ff18', color: '#fff', fontWeight: '600' },
  navIcon: { fontSize: '14px', color: '#6c47ff' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: 'transparent', border: '1px solid #1e1e1e', color: '#555', fontSize: '13px', cursor: 'pointer', marginTop: 'auto' },
  main: { marginLeft: '220px', flex: 1, padding: '32px 40px' },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' },
  pageTitle: { fontSize: '28px', fontWeight: '700', marginBottom: '4px' },
  pageSub: { color: '#555', fontSize: '14px' },
  badge: { background: '#6c47ff18', color: '#6c47ff', border: '1px solid #6c47ff44', borderRadius: '20px', padding: '6px 16px', fontSize: '12px', fontWeight: '600' },
  loading: { color: '#555', textAlign: 'center', padding: '80px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
  statCard: { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' },
  statValue: { fontSize: '36px', fontWeight: '700', marginBottom: '4px' },
  statLabel: { color: '#555', fontSize: '13px', marginBottom: '16px' },
  statBar: { height: '4px', borderRadius: '2px', overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: '2px', transition: 'width 0.5s' },
  section: { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' },
  sectionTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#aaa' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #1e1e1e' },
  tr: { borderBottom: '1px solid #161616' },
  td: { padding: '12px', fontSize: '14px', color: '#ccc' },
  pill: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  deleteBtn: { padding: '5px 12px', borderRadius: '6px', background: '#ff4d4d18', border: '1px solid #ff4d4d44', color: '#ff4d4d', fontSize: '12px', cursor: 'pointer' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  providerCard: { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px', textAlign: 'center' },
  providerAvatar: { width: '52px', height: '52px', borderRadius: '50%', background: '#6c47ff22', border: '2px solid #6c47ff44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#6c47ff', margin: '0 auto 12px' },
  providerName: { fontWeight: '600', fontSize: '15px', marginBottom: '4px' },
  providerPhone: { color: '#555', fontSize: '13px' },
}