import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet-routing-machine'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
})

const providerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
})

function RoutingMap({ from, to }) {
  const map = useMap()
  const routingRef = useRef(null)

  useEffect(() => {
    if (!from || !to) return
    if (routingRef.current) {
      map.removeControl(routingRef.current)
    }
    routingRef.current = L.Routing.control({
      waypoints: [
        L.latLng(from.lat, from.lng),
        L.latLng(to.lat, to.lng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: '#6c47ff', weight: 5, opacity: 0.8 }]
      },
      createMarker: () => null,
    }).addTo(map)

    return () => {
      if (routingRef.current) map.removeControl(routingRef.current)
    }
  }, [from, to])

  return null
}

function RecenterMap({ lat, lng }) {
  const map = useMap()
  useEffect(() => { if (lat && lng) map.setView([lat, lng], 14) }, [lat, lng])
  return null
}

const categoryIcons = {
  plumber: '🔧', electrician: '⚡', carpenter: '🪚',
  painter: '🖌️', cleaner: '🧹', tutor: '📚'
}

const statusColor = (status) => {
  if (status === 'pending') return '#f5a623'
  if (status === 'accepted') return '#6c47ff'
  if (status === 'completed') return '#4dff91'
  if (status === 'cancelled') return '#ff4d4d'
  return '#888'
}

export default function ProviderDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('available')
  const [jobs, setJobs] = useState([])
  const [myJobs, setMyJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(null)
  const [available, setAvailable] = useState(true)
  const [myLocation, setMyLocation] = useState(null)
  const [activeJob, setActiveJob] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)
  const watchRef = useRef(null)

  useEffect(() => {
    fetchJobs()
    fetchMyJobs()
    startLocationTracking()

    const sub = supabase
      .channel('provider-jobs')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'jobs'
      }, (payload) => {
        setJobs(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  function startLocationTracking() {
    if (!navigator.geolocation) return
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setMyLocation({ lat, lng })
        await supabase.from('profiles').update({ latitude: lat, longitude: lng }).eq('id', user.id)
        if (activeJob) {
          await supabase.from('jobs').update({ provider_lat: lat, provider_lng: lng }).eq('id', activeJob)
        }
      },
      (err) => console.log('Location error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }

  async function fetchJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setJobs(data || [])
    setLoading(false)
  }

  async function fetchMyJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })
    setMyJobs(data || [])
    const active = data?.find(j => j.status === 'accepted')
    if (active) setActiveJob(active.id)
  }

  async function acceptJob(job) {
    setAccepting(job.id)
    const { error } = await supabase
      .from('jobs')
      .update({
        provider_id: user.id,
        status: 'accepted',
        provider_lat: myLocation?.lat,
        provider_lng: myLocation?.lng
      })
      .eq('id', job.id)

    if (!error) {
      setActiveJob(job.id)
      setJobs(prev => prev.filter(j => j.id !== job.id))
      await fetchMyJobs()
      setTab('map')
    }
    setAccepting(null)
  }

  async function completeJob(jobId) {
    await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId)
    setActiveJob(null)
    setRouteInfo(null)
    await fetchMyJobs()
    setTab('myjobs')
  }

  async function toggleAvailability() {
    const newVal = !available
    setAvailable(newVal)
    await supabase.from('profiles').update({ is_available: newVal }).eq('id', user.id)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const acceptedJob = myJobs.find(j => j.status === 'accepted')

  return (
    <div style={s.page}>
      <div style={s.navbar}>
        <span style={s.logo}>SewaSathi</span>
        <div style={s.navTabs}>
          {[
            ['available', '🔔 Jobs', jobs.length],
            ['myjobs', '📋 My Jobs', null],
            ['map', '🗺️ Navigate', null]
          ].map(([key, label, count]) => (
            <button
              key={key}
              style={{ ...s.navTab, ...(tab === key ? s.navTabActive : {}) }}
              onClick={() => setTab(key)}
            >
              {label}
              {count > 0 && <span style={s.badge}>{count}</span>}
            </button>
          ))}
        </div>
        <div style={s.navRight}>
          <button
            style={{
              ...s.availBtn,
              background: available ? '#4dff9118' : '#ff4d4d18',
              border: `1px solid ${available ? '#4dff9144' : '#ff4d4d44'}`,
              color: available ? '#4dff91' : '#ff4d4d'
            }}
            onClick={toggleAvailability}
          >
            <span style={{ ...s.dot, background: available ? '#4dff91' : '#ff4d4d' }} />
            {available ? 'Available' : 'Offline'}
          </button>
          <span style={s.welcome}>{user?.user_metadata?.full_name}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={s.container}>

        {tab === 'available' && (
          <>
            <div style={s.header}>
              <h2 style={s.heading}>Available Jobs</h2>
              <p style={s.sub}>Job requests from customers near you</p>
            </div>
            {loading && <p style={s.muted}>Loading jobs...</p>}
            {!loading && jobs.length === 0 && (
              <div style={s.empty}>
                <p style={s.emptyTitle}>No pending jobs right now</p>
                <p style={s.muted}>New requests will appear here in real time</p>
              </div>
            )}
            <div style={s.list}>
              {jobs.map(job => (
                <div key={job.id} style={s.card}>
                  <div style={s.cardTop}>
                    <div style={s.cardLeft}>
                      <span style={s.catIcon}>{categoryIcons[job.category] || '🛠️'}</span>
                      <div>
                        <p style={s.catName}>{job.category?.toUpperCase()}</p>
                        <p style={s.cardDate}>{new Date(job.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <span style={{ ...s.pill, background: '#f5a62322', color: '#f5a623' }}>
                      pending
                    </span>
                  </div>
                  <p style={s.desc}>{job.description}</p>
                  <div style={s.cardFooter}>
                    {job.latitude && job.longitude && (
                      <span style={s.locationTag}>📍 Location available</span>
                    )}
                    <button
                      style={{
                        ...s.acceptBtn,
                        opacity: activeJob ? 0.5 : 1,
                        cursor: activeJob ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => acceptJob(job)}
                      disabled={accepting === job.id || !!activeJob}
                    >
                      {accepting === job.id ? 'Accepting...' : activeJob ? 'Finish current job first' : 'Accept Job'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'myjobs' && (
          <>
            <div style={s.header}>
              <h2 style={s.heading}>My Jobs</h2>
              <p style={s.sub}>History of all your accepted and completed jobs</p>
            </div>
            {myJobs.length === 0 && <p style={s.muted}>No jobs yet.</p>}
            <div style={s.list}>
              {myJobs.map(job => (
                <div key={job.id} style={{ ...s.card, borderLeft: `3px solid ${statusColor(job.status)}` }}>
                  <div style={s.cardTop}>
                    <div style={s.cardLeft}>
                      <span style={s.catIcon}>{categoryIcons[job.category] || '🛠️'}</span>
                      <div>
                        <p style={s.catName}>{job.category?.toUpperCase()}</p>
                        <p style={s.cardDate}>{new Date(job.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <span style={{ ...s.pill, background: statusColor(job.status) + '22', color: statusColor(job.status) }}>
                      {job.status}
                    </span>
                  </div>
                  <p style={s.desc}>{job.description}</p>
                  {job.status === 'accepted' && (
                    <div style={s.cardFooter}>
                      <button style={s.navigateBtn} onClick={() => setTab('map')}>
                        🗺️ Open Navigation
                      </button>
                      <button style={s.completeBtn} onClick={() => completeJob(job.id)}>
                        ✓ Mark Completed
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'map' && (
          <>
            <div style={s.header}>
              <h2 style={s.heading}>Navigation</h2>
              <p style={s.sub}>
                {acceptedJob
                  ? `Navigate to customer — ${acceptedJob.category?.toUpperCase()}`
                  : 'Accept a job to see navigation'}
              </p>
            </div>

            {acceptedJob && (
              <div style={s.routeInfoBox}>
                <div style={s.routeItem}>
                  <span style={s.routeLabel}>From</span>
                  <span style={s.routeValue}>Your location (violet pin)</span>
                </div>
                <div style={s.routeDivider}>→</div>
                <div style={s.routeItem}>
                  <span style={s.routeLabel}>To</span>
                  <span style={s.routeValue}>Customer location (blue pin)</span>
                </div>
              </div>
            )}

            <div style={s.mapWrap}>
              {myLocation ? (
                <MapContainer
                  center={[myLocation.lat, myLocation.lng]}
                  zoom={14}
                  style={{ height: '520px', width: '100%', borderRadius: '12px' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <RecenterMap lat={myLocation.lat} lng={myLocation.lng} />

                  <Marker position={[myLocation.lat, myLocation.lng]} icon={providerIcon}>
                    <Popup>
                      <strong>You are here</strong><br />
                      {user?.user_metadata?.full_name}
                    </Popup>
                  </Marker>

                  {acceptedJob?.latitude && acceptedJob?.longitude && (
                    <>
                      <Marker
                        position={[acceptedJob.latitude, acceptedJob.longitude]}
                        icon={customerIcon}
                      >
                        <Popup>
                          <strong>Customer location</strong><br />
                          {acceptedJob.category?.toUpperCase()} request
                        </Popup>
                      </Marker>

                      <RoutingMap
                        from={{ lat: myLocation.lat, lng: myLocation.lng }}
                        to={{ lat: acceptedJob.latitude, lng: acceptedJob.longitude }}
                      />
                    </>
                  )}
                </MapContainer>
              ) : (
                <div style={s.noMap}>
                  <p style={{ fontSize: '18px', marginBottom: '8px' }}>📍</p>
                  <p>Getting your location...</p>
                  <p style={s.muted}>Allow location access in your browser</p>
                </div>
              )}
            </div>

            {acceptedJob && (
              <div style={s.activeJobBox}>
                <div style={s.activeJobLeft}>
                  <span style={s.catIcon}>{categoryIcons[acceptedJob.category] || '🛠️'}</span>
                  <div>
                    <p style={s.catName}>Active: {acceptedJob.category?.toUpperCase()}</p>
                    <p style={s.desc}>{acceptedJob.description}</p>
                  </div>
                </div>
                <button style={s.completeBtn} onClick={() => completeJob(acceptedJob.id)}>
                  ✓ Complete Job
                </button>
              </div>
            )}

            {!acceptedJob && (
              <div style={s.noJobBox}>
                <p>No active job. Accept a job first to see navigation.</p>
                <button style={s.acceptBtn} onClick={() => setTab('available')}>
                  View Available Jobs
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 32px', borderBottom: '1px solid #1e1e1e', background: '#111', flexWrap: 'wrap', gap: '12px' },
  logo: { fontSize: '20px', fontWeight: '700', color: '#6c47ff' },
  navTabs: { display: 'flex', gap: '4px' },
  navTab: { padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#555', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  navTabActive: { background: '#6c47ff18', color: '#fff', fontWeight: '600' },
  badge: { background: '#f5a623', color: '#000', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  availBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  dot: { width: '7px', height: '7px', borderRadius: '50%' },
  welcome: { color: '#aaa', fontSize: '14px' },
  logoutBtn: { padding: '8px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid #2a2a2a', color: '#666', cursor: 'pointer', fontSize: '13px' },
  container: { maxWidth: '800px', margin: '0 auto', padding: '36px 20px' },
  header: { marginBottom: '28px' },
  heading: { fontSize: '24px', fontWeight: '700', marginBottom: '6px' },
  sub: { color: '#555', fontSize: '14px' },
  muted: { color: '#444', fontSize: '14px', textAlign: 'center', padding: '20px 0' },
  empty: { textAlign: 'center', padding: '60px 0' },
  emptyTitle: { fontSize: '16px', color: '#666', marginBottom: '8px' },
  list: { display: 'flex', flexDirection: 'column', gap: '14px' },
  card: { background: '#161616', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '20px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  catIcon: { fontSize: '26px' },
  catName: { fontWeight: '600', fontSize: '14px', marginBottom: '2px' },
  cardDate: { color: '#444', fontSize: '12px' },
  pill: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  desc: { color: '#777', fontSize: '14px', lineHeight: '1.6', marginBottom: '14px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  locationTag: { color: '#6c47ff', fontSize: '12px' },
  acceptBtn: { padding: '10px 20px', borderRadius: '8px', background: '#6c47ff', color: '#fff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer' },
  completeBtn: { padding: '10px 20px', borderRadius: '8px', background: '#4dff9118', border: '1px solid #4dff9144', color: '#4dff91', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
  navigateBtn: { padding: '10px 20px', borderRadius: '8px', background: '#6c47ff18', border: '1px solid #6c47ff44', color: '#6c47ff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
  routeInfoBox: { display: 'flex', alignItems: 'center', gap: '16px', background: '#161616', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' },
  routeItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  routeLabel: { color: '#444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' },
  routeValue: { color: '#fff', fontSize: '14px', fontWeight: '500' },
  routeDivider: { color: '#6c47ff', fontSize: '20px', fontWeight: '700' },
  mapWrap: { borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e1e1e', marginBottom: '16px' },
  noMap: { height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#161616', borderRadius: '12px', color: '#fff', gap: '8px' },
  activeJobBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161616', border: '1px solid #6c47ff44', borderRadius: '12px', padding: '16px 20px' },
  activeJobLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  noJobBox: { textAlign: 'center', padding: '40px', background: '#161616', borderRadius: '12px', color: '#666' },
}