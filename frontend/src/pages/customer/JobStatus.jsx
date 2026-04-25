import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'

const statusColor = (status) => {
  if (status === 'pending') return '#f5a623'
  if (status === 'accepted') return '#6c47ff'
  if (status === 'completed') return '#4dff91'
  if (status === 'cancelled') return '#ff4d4d'
  return '#888'
}

const categoryIcons = {
  plumber: '🔧', electrician: '⚡', carpenter: '🪚',
  painter: '🖌️', cleaner: '🧹', tutor: '📚'
}

export default function JobStatus() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs()

    const subscription = supabase
      .channel('customer-jobs')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'jobs',
        filter: `customer_id=eq.${user.id}`
      }, (payload) => {
        setJobs(prev => prev.map(j => j.id === payload.new.id ? payload.new : j))
      })
      .subscribe()

    return () => supabase.removeChannel(subscription)
  }, [])

  async function fetchJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    setJobs(data || [])
    setLoading(false)
  }

  async function markCompleted(jobId) {
    await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId)
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'completed' } : j))
  }

  async function cancelJob(jobId) {
    await supabase.from('jobs').update({ status: 'cancelled' }).eq('id', jobId)
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'cancelled' } : j))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={s.page}>
      <div style={s.navbar}>
        <span style={s.logo}>SewaSathi</span>
        <div style={s.navLinks}>
          <button style={s.navBtn} onClick={() => navigate('/customer')}>Post a Job</button>
          <button style={{ ...s.navBtn, ...s.navActive }}>My Jobs</button>
        </div>
        <div style={s.navRight}>
          <span style={s.welcome}>{user?.user_metadata?.full_name}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={s.container}>
        <h2 style={s.heading}>My Job Requests</h2>
        <p style={s.sub}>Track the status of all your service requests</p>

        {loading && <p style={s.muted}>Loading your jobs...</p>}

        {!loading && jobs.length === 0 && (
          <div style={s.empty}>
            <p style={s.emptyText}>You have not posted any jobs yet.</p>
            <button style={s.postBtn} onClick={() => navigate('/customer')}>
              Post Your First Job
            </button>
          </div>
        )}

        <div style={s.list}>
          {jobs.map(job => (
            <div key={job.id} style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardLeft}>
                  <span style={s.icon}>{categoryIcons[job.category] || '🛠️'}</span>
                  <div>
                    <p style={s.category}>{job.category?.toUpperCase()}</p>
                    <p style={s.date}>{new Date(job.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span style={{ ...s.pill, background: statusColor(job.status) + '22', color: statusColor(job.status) }}>
                  {job.status}
                </span>
              </div>

              <p style={s.description}>{job.description}</p>

              {job.status === 'accepted' && (
                <div style={s.acceptedBox}>
                  <div style={s.acceptedDot} />
                  <p style={s.acceptedText}>A worker has accepted your job and is on the way.</p>
                </div>
              )}

              {job.status === 'pending' && (
                <div style={s.actions}>
                  <p style={s.waitText}>Waiting for a nearby worker to accept...</p>
                  <button style={s.cancelBtn} onClick={() => cancelJob(job.id)}>
                    Cancel Request
                  </button>
                </div>
              )}

              {job.status === 'accepted' && (
                <div style={s.actions}>
                  <button style={s.completeBtn} onClick={() => markCompleted(job.id)}>
                    Mark as Completed
                  </button>
                </div>
              )}

              {job.status === 'completed' && (
                <div style={s.completedBox}>
                  <p style={s.completedText}>Job completed. Thank you for using SewaSathi.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #2a2a2a', background: '#1a1a1a' },
  logo: { fontSize: '20px', fontWeight: '700', color: '#6c47ff' },
  navLinks: { display: 'flex', gap: '8px' },
  navBtn: { padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid #333', color: '#666', cursor: 'pointer', fontSize: '13px' },
  navActive: { border: '1px solid #6c47ff', color: '#6c47ff' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  welcome: { color: '#aaa', fontSize: '14px' },
  logoutBtn: { padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid #333', color: '#aaa', cursor: 'pointer', fontSize: '13px' },
  container: { maxWidth: '700px', margin: '0 auto', padding: '40px 20px' },
  heading: { fontSize: '26px', fontWeight: '700', marginBottom: '8px' },
  sub: { color: '#888', fontSize: '14px', marginBottom: '32px' },
  muted: { color: '#555', textAlign: 'center', padding: '40px' },
  empty: { textAlign: 'center', padding: '60px 0' },
  emptyText: { color: '#555', marginBottom: '20px' },
  postBtn: { padding: '12px 24px', borderRadius: '8px', background: '#6c47ff', color: '#fff', fontWeight: '600', border: 'none', cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  icon: { fontSize: '28px' },
  category: { fontWeight: '600', fontSize: '15px', marginBottom: '2px' },
  date: { color: '#555', fontSize: '12px' },
  pill: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  description: { color: '#aaa', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' },
  acceptedBox: { display: 'flex', alignItems: 'center', gap: '10px', background: '#6c47ff18', border: '1px solid #6c47ff33', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' },
  acceptedDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#6c47ff', flexShrink: 0 },
  acceptedText: { color: '#aaa', fontSize: '13px' },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
  waitText: { color: '#555', fontSize: '13px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '8px', background: '#ff4d4d18', border: '1px solid #ff4d4d44', color: '#ff4d4d', fontSize: '13px', cursor: 'pointer' },
  completeBtn: { padding: '10px 20px', borderRadius: '8px', background: '#4dff9122', border: '1px solid #4dff9144', color: '#4dff91', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  completedBox: { background: '#4dff9111', border: '1px solid #4dff9133', borderRadius: '8px', padding: '12px 16px' },
  completedText: { color: '#4dff91', fontSize: '13px' }
}