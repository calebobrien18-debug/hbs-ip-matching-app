import { useEffect, useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsAdmin } from '../lib/hooks'
import NavBar from '../components/NavBar'

const EVENT_LABELS = {
  session_started:        'Logins',
  profile_completed:      'Profile completions',
  match_run:              'Match runs',
  idea_generated:         'Ideas generated',
  idea_saved:             'Ideas saved',
  email_draft_generated:  'Email drafts generated',
  email_draft_saved:      'Email drafts saved',
  email_copied:           'Emails copied',
  faculty_saved:          'Faculty saved',
  match_usefulness_rated: 'Match usefulness rated',
}

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatShortDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const isAdmin  = useIsAdmin()

  const [stats,    setStats]    = useState(null)
  const [events,   setEvents]   = useState([])
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (isAdmin === false) navigate('/dashboard', { replace: true })
  }, [isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    loadAll()
  }, [isAdmin])

  async function loadAll() {
    const [profilesRes, eventsRes, feedbackRes] = await Promise.all([
      supabase.from('hbs_ip').select('user_id, first_name, last_name, email, graduation_year, hbs_section, created_at'),
      supabase.from('product_events').select('user_id, event_name, created_at').order('created_at', { ascending: false }),
      supabase.from('feedback').select('id', { count: 'exact', head: true }),
    ])

    if (profilesRes.error) console.error('[AdminDashboard] profiles:', profilesRes.error)
    if (eventsRes.error)   console.error('[AdminDashboard] events:', eventsRes.error)

    const profiles      = profilesRes.data ?? []
    const allEvents     = eventsRes.data ?? []
    const feedbackCount = feedbackRes.count ?? 0
    const totalUsers    = profiles.length

    // Stat card counts
    const matchRuns     = allEvents.filter(e => e.event_name === 'match_run').length
    const ideasGenerated = allEvents.filter(e => e.event_name === 'idea_generated').length

    setStats({ totalUsers, matchRuns, ideasGenerated, feedbackCount })

    // Event breakdown: count per event type + unique user count
    const eventMap = {}
    const userSets  = {}
    for (const e of allEvents) {
      eventMap[e.event_name] = (eventMap[e.event_name] ?? 0) + 1
      if (!userSets[e.event_name]) userSets[e.event_name] = new Set()
      userSets[e.event_name].add(e.user_id)
    }
    const breakdownRows = Object.keys(EVENT_LABELS).map(name => ({
      name,
      label:      EVENT_LABELS[name],
      total:      eventMap[name] ?? 0,
      uniqueUsers: userSets[name]?.size ?? 0,
      pctUsers:    totalUsers > 0 ? Math.round(((userSets[name]?.size ?? 0) / totalUsers) * 100) : 0,
    }))
    setEvents(breakdownRows)

    // User table: join profiles with last activity from events
    const lastActivityMap = {}
    const eventCountMap   = {}
    for (const e of allEvents) {
      if (!lastActivityMap[e.user_id] || e.created_at > lastActivityMap[e.user_id]) {
        lastActivityMap[e.user_id] = e.created_at
      }
      eventCountMap[e.user_id] = (eventCountMap[e.user_id] ?? 0) + 1
    }

    const userRows = profiles.map(p => ({
      ...p,
      lastActivity: lastActivityMap[p.user_id] ?? null,
      eventCount:   eventCountMap[p.user_id] ?? 0,
    })).sort((a, b) => {
      if (!a.lastActivity && !b.lastActivity) return 0
      if (!a.lastActivity) return 1
      if (!b.lastActivity) return -1
      return b.lastActivity.localeCompare(a.lastActivity)
    })

    setUsers(userRows)
    setLoading(false)
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 space-y-10">

        {/* Admin nav */}
        <AdminNav />

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-crimson animate-spin" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total users"       value={stats.totalUsers} />
              <StatCard label="Match runs"        value={stats.matchRuns} />
              <StatCard label="Ideas generated"   value={stats.ideasGenerated} />
              <StatCard label="Feedback submitted" value={stats.feedbackCount} />
            </section>

            {/* Usage breakdown */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Usage breakdown</h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Event</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">Total</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">Unique users</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">% of users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((row, i) => (
                      <tr key={row.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-5 py-2.5 text-gray-700">{row.label}</td>
                        <td className="px-5 py-2.5 text-right text-gray-900 tabular-nums">{row.total}</td>
                        <td className="px-5 py-2.5 text-right text-gray-900 tabular-nums">{row.uniqueUsers}</td>
                        <td className="px-5 py-2.5 text-right">
                          <span className={row.pctUsers > 0 ? 'text-gray-900 tabular-nums' : 'text-gray-300'}>
                            {row.pctUsers}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* User table */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Users</h2>
                <span className="text-sm text-gray-400">{users.length} {users.length === 1 ? 'user' : 'users'}</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Section</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Joined</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Last active</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.user_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-5 py-2.5 text-gray-900 whitespace-nowrap">
                          {u.first_name} {u.last_name}
                        </td>
                        <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">{u.email}</td>
                        <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">
                          {u.hbs_section ? `Section ${u.hbs_section}` : '—'}
                          {u.graduation_year ? <span className="text-gray-400 ml-1">'{String(u.graduation_year).slice(-2)}</span> : null}
                        </td>
                        <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">{formatShortDate(u.created_at)}</td>
                        <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(u.lastActivity)}</td>
                        <td className="px-5 py-2.5 text-right text-gray-900 tabular-nums">{u.eventCount}</td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No users yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

// ── Shared admin nav strip ─────────────────────────────────────────────────────

export function AdminNav() {
  const linkClass = ({ isActive }) =>
    `text-sm font-medium pb-1 border-b-2 transition-colors ${
      isActive
        ? 'border-crimson text-gray-900'
        : 'border-transparent text-gray-400 hover:text-gray-600'
    }`

  return (
    <nav className="flex items-center gap-6">
      <NavLink to="/admin" end className={linkClass}>Overview</NavLink>
      <NavLink to="/admin/feedback" className={linkClass}>Feedback</NavLink>
    </nav>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums">{value ?? '—'}</p>
    </div>
  )
}
