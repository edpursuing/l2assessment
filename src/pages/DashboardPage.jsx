import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getGroups, createGroup, addTicketToGroup, assignTicketGroup } from '../utils/groupsHelper'

function DashboardPage() {
  const [history, setHistory] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedTickets, setSelectedTickets] = useState([]) // array of ticket timestamps
  const [actionGroupId, setActionGroupId] = useState('')

  const reload = () => {
    const savedHistory = JSON.parse(localStorage.getItem('triageHistory') || '[]')
    setHistory(savedHistory)
    setGroups(getGroups())
  }

  useEffect(() => {
    reload()
  }, [])

  const handleSelectTicket = (timestamp) => {
    setSelectedTickets(prev =>
      prev.includes(timestamp)
        ? prev.filter(t => t !== timestamp)
        : [...prev, timestamp]
    )
  }

  const handleClearSelection = () => {
    setSelectedTickets([])
    setActionGroupId('')
  }

  const handleAddToExistingGroup = () => {
    if (!actionGroupId) return
    const tickets = history.filter(h => selectedTickets.includes(h.timestamp))
    tickets.forEach(ticket => {
      addTicketToGroup(actionGroupId, ticket)
      assignTicketGroup(ticket.timestamp, actionGroupId)
    })
    handleClearSelection()
    reload()
  }

  const handleCreateGroupFromSelection = () => {
    const tickets = history.filter(h => selectedTickets.includes(h.timestamp))
    if (tickets.length === 0) return
    // Use highest urgency ticket as the seed
    const seed = tickets.sort((a, b) => {
      const rank = { High: 3, Medium: 2, Low: 1 }
      return (rank[b.urgency] || 0) - (rank[a.urgency] || 0)
    })[0]
    const group = createGroup(seed)
    assignTicketGroup(seed.timestamp, group.id)
    // Add remaining tickets to the new group
    tickets.filter(t => t.timestamp !== seed.timestamp).forEach(ticket => {
      addTicketToGroup(group.id, ticket)
      assignTicketGroup(ticket.timestamp, group.id)
    })
    handleClearSelection()
    reload()
  }

  // --- Ticket stats ---
  const total = history.length
  const today = new Date().toDateString()
  const todayCount = history.filter(h => new Date(h.timestamp).toDateString() === today).length
  const highUrgencyCount = history.filter(h => h.urgency === 'High').length
  const highUrgencyPercent = total > 0 ? Math.round((highUrgencyCount / total) * 100) : 0
  const groupedCount = history.filter(h => h.groupId).length

  const avgPerDay = (() => {
    if (history.length === 0) return 0
    const timestamps = history.map(h => new Date(h.timestamp).getTime())
    const oldest = Math.min(...timestamps)
    const newest = Math.max(...timestamps)
    const days = Math.max(1, Math.round((newest - oldest) / (1000 * 60 * 60 * 24)) + 1)
    return Math.round(history.length / days)
  })()

  // --- Group stats ---
  const openGroups = groups.filter(g => g.status === 'open')
  const inProgressGroups = groups.filter(g => g.status === 'in_progress')
  const resolvedGroups = groups.filter(g => g.status === 'resolved')
  const undraftedGroups = groups.filter(g => g.status !== 'resolved' && !g.bulkDraft?.trim())

  // --- Needs attention ---
  const ungroupedHighUrgency = history
    .filter(h => h.urgency === 'High' && !h.groupId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)

  const groupsNeedingUpdate = groups
    .filter(g => g.status !== 'resolved' && !g.bulkDraft?.trim())
    .sort((a, b) => b.affectedCount - a.affectedCount)
    .slice(0, 3)

  // --- Category distribution ---
  const categories = {}
  history.forEach(h => { categories[h.category] = (categories[h.category] || 0) + 1 })
  const categoryData = Object.entries(categories)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // --- Urgency breakdown ---
  const urgencyData = { High: 0, Medium: 0, Low: 0 }
  history.forEach(h => { urgencyData[h.urgency] = (urgencyData[h.urgency] || 0) + 1 })

  // --- Dynamic insights ---
  const insights = []
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
  const recentTech = history.filter(h =>
    h.category === 'Technical Problem' && new Date(h.timestamp).getTime() > twoHoursAgo
  ).length
  if (recentTech >= 3) {
    insights.push(`${recentTech} Technical Problem tickets in the last 2 hours — possible outage or incident in progress.`)
  }
  if (undraftedGroups.length > 0) {
    insights.push(`${undraftedGroups.length} open ${undraftedGroups.length === 1 ? 'group has' : 'groups have'} no customer update drafted yet.`)
  }
  if (highUrgencyPercent > 30) {
    insights.push(`High urgency tickets represent ${highUrgencyPercent}% of volume — consider additional support coverage.`)
  }
  const recentBilling = history.filter(h =>
    h.category === 'Billing Issue' && new Date(h.timestamp).getTime() > twoHoursAgo
  ).length
  if (recentBilling >= 3) {
    insights.push(`${recentBilling} Billing Issue tickets in the last 2 hours — may indicate a payment processing problem.`)
  }

  // --- Recent activity ---
  const recentTickets = [...history]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)

  const URGENCY_COLOR = {
    High: 'bg-red-100 text-red-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-green-100 text-green-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Support operations at a glance</p>
        </div>

        {/* Ticket stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-sm text-gray-500 mb-1">Total Tickets</div>
            <div className="text-3xl font-bold text-blue-600">{total}</div>
            <div className="text-xs text-gray-400 mt-1">{avgPerDay}/day avg</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-sm text-gray-500 mb-1">Today</div>
            <div className="text-3xl font-bold text-green-600">{todayCount}</div>
            <div className="text-xs text-gray-400 mt-1">tickets analyzed</div>
          </div>
          <Link to="/history" className="bg-white rounded-lg shadow p-5 hover:ring-2 hover:ring-red-300 transition-all block">
            <div className="text-sm text-gray-500 mb-1">High Urgency</div>
            <div className="text-3xl font-bold text-red-600">{highUrgencyPercent}%</div>
            <div className="text-xs text-gray-400 mt-1">{highUrgencyCount} tickets → view in history</div>
          </Link>
          <Link to="/groups" className="bg-white rounded-lg shadow p-5 hover:ring-2 hover:ring-purple-300 transition-all block">
            <div className="text-sm text-gray-500 mb-1">Grouped</div>
            <div className="text-3xl font-bold text-purple-600">{groupedCount}</div>
            <div className="text-xs text-gray-400 mt-1">of {total} tickets → view groups</div>
          </Link>
        </div>

        {/* Group health row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5 border-t-4 border-blue-400">
            <div className="text-sm text-gray-500 mb-1">Open Groups</div>
            <div className="text-3xl font-bold text-blue-600">{openGroups.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-t-4 border-purple-400">
            <div className="text-sm text-gray-500 mb-1">In Progress</div>
            <div className="text-3xl font-bold text-purple-600">{inProgressGroups.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-t-4 border-green-400">
            <div className="text-sm text-gray-500 mb-1">Resolved</div>
            <div className="text-3xl font-bold text-green-600">{resolvedGroups.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-t-4 border-amber-400">
            <div className="text-sm text-gray-500 mb-1">No Update Sent</div>
            <div className="text-3xl font-bold text-amber-600">{undraftedGroups.length}</div>
            <div className="text-xs text-gray-400 mt-1">open groups awaiting draft</div>
          </div>
        </div>

        {/* Needs attention */}
        {(ungroupedHighUrgency.length > 0 || groupsNeedingUpdate.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-6">
            <h2 className="text-base font-bold text-red-900 mb-3">Needs Attention</h2>
            <div className="grid md:grid-cols-2 gap-4">

              {ungroupedHighUrgency.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                      High Urgency — Not Yet Grouped
                    </div>
                    <div className="text-xs text-red-500 italic">Click to select</div>
                  </div>
                  <div className="space-y-2">
                    {ungroupedHighUrgency.map((ticket, i) => {
                      const isSelected = selectedTickets.includes(ticket.timestamp)
                      return (
                        <div
                          key={i}
                          onClick={() => handleSelectTicket(ticket.timestamp)}
                          className={`cursor-pointer rounded p-3 border transition-all select-none flex items-start gap-3 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300'
                              : 'bg-white border-red-200 hover:border-red-400'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-gray-400 mb-0.5">{new Date(ticket.timestamp).toLocaleString()}</div>
                            <div className="text-sm text-gray-800 leading-snug">
                              "{ticket.message.slice(0, 90)}{ticket.message.length > 90 ? '...' : ''}"
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{ticket.category}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <Link to="/history" className="text-xs text-red-700 underline mt-2 inline-block">View all in history</Link>
                </div>
              )}

              {groupsNeedingUpdate.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
                    Open Groups — No Customer Update
                  </div>
                  <div className="space-y-2">
                    {groupsNeedingUpdate.map(group => (
                      <Link key={group.id} to="/groups" className="block bg-white border border-red-200 rounded p-3 hover:border-red-400">
                        <div className="text-sm font-semibold text-gray-800">{group.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {group.affectedCount} affected · {group.urgency} urgency · {group.status}
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link to="/groups" className="text-xs text-red-700 underline mt-2 inline-block">View all groups</Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Category distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Category Distribution</h2>
            {categoryData.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">No data yet</div>
            ) : (
              <div className="space-y-3">
                {categoryData.map(cat => {
                  const pct = total > 0 ? (cat.count / total) * 100 : 0
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{cat.name}</span>
                        <span className="text-gray-500">{cat.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Urgency breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Urgency Breakdown</h2>
            {total === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">No data yet</div>
            ) : (
              <div className="space-y-4">
                {[['High', 'bg-red-500', 'text-red-600'], ['Medium', 'bg-yellow-500', 'text-yellow-600'], ['Low', 'bg-green-500', 'text-green-600']].map(([level, barColor, textColor]) => {
                  const pct = total > 0 ? (urgencyData[level] / total) * 100 : 0
                  return (
                    <div key={level}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{level}</span>
                        <span className={`font-bold ${textColor}`}>{urgencyData[level]} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${barColor} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Dynamic insights */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h2 className="text-base font-bold text-blue-900 mb-3">Insights</h2>
            {insights.length === 0 ? (
              <p className="text-sm text-blue-700">
                {total === 0
                  ? 'Start analyzing tickets to see insights here.'
                  : 'No anomalies detected. Volume and urgency look normal.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {insights.map((insight, i) => (
                  <li key={i} className="text-sm text-blue-800 flex gap-2">
                    <span className="mt-0.5 shrink-0">→</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
              <Link to="/history" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            {recentTickets.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-sm text-gray-400 mb-3">No tickets yet</div>
                <Link to="/analyze" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold">
                  Analyze a Message
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTickets.map((ticket, i) => {
                  const ticketGroup = ticket.groupId ? groups.find(g => g.id === ticket.groupId) : null
                  return (
                    <div key={i} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 mt-0.5 ${URGENCY_COLOR[ticket.urgency]}`}>
                        {ticket.urgency}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-800 truncate">
                          {ticket.message.slice(0, 70)}{ticket.message.length > 70 ? '...' : ''}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>{ticket.category}</span>
                          {ticketGroup && (
                            <Link to="/groups" className="text-amber-600 hover:underline">{ticketGroup.title}</Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating action bar */}
      {selectedTickets.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-gray-200 shrink-0">
              {selectedTickets.length} {selectedTickets.length === 1 ? 'ticket' : 'tickets'} selected
            </span>

            {openGroups.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <select
                    value={actionGroupId}
                    onChange={e => setActionGroupId(e.target.value)}
                    className="text-sm bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  >
                    <option value="">Add to group...</option>
                    {openGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.affectedCount})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddToExistingGroup}
                    disabled={!actionGroupId}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      actionGroupId
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Add
                  </button>
                </div>
                <span className="text-gray-600 text-sm">or</span>
              </>
            )}

            <button
              onClick={handleCreateGroupFromSelection}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-500 hover:bg-gray-800 transition-colors"
            >
              Create New Group
            </button>

            <button
              onClick={handleClearSelection}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
