import { useState, useEffect } from 'react'
import { generateBulkDraft } from '../utils/llmHelper'
import {
  getGroups,
  updateGroupField,
  resolveGroup,
  logBulkMessage,
  getGroupTickets
} from '../utils/groupsHelper'

const URGENCY_COLOR = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800'
}

const STATUS_COLOR = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  resolved: 'bg-gray-100 text-gray-500'
}

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved'
}

function GroupsPage() {
  const [groups, setGroups] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('active') // 'active' | 'resolved' | 'all'
  const [draftValue, setDraftValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')

  const reload = () => {
    const all = getGroups().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    setGroups(all)
  }

  useEffect(() => {
    reload()
  }, [])

  const filtered = groups.filter(g => {
    if (filter === 'active') return g.status !== 'resolved'
    if (filter === 'resolved') return g.status === 'resolved'
    return true
  })

  const selected = groups.find(g => g.id === selectedId) || null
  const selectedTickets = selected ? getGroupTickets(selected) : []

  const handleSelectGroup = (group) => {
    setSelectedId(group.id)
    setDraftValue(group.bulkDraft || '')
    setEditingTitle(false)
    setTitleValue(group.title)
    setCopied(false)
  }

  const handleStatusChange = (groupId, status) => {
    if (status === 'resolved') {
      resolveGroup(groupId)
    } else {
      updateGroupField(groupId, { status })
    }
    reload()
    if (selectedId === groupId) {
      const updated = getGroups().find(g => g.id === groupId)
      if (updated) setSelectedId(groupId)
    }
  }

  const handleSaveDraft = () => {
    if (!selected) return
    updateGroupField(selected.id, { bulkDraft: draftValue })
    reload()
  }

  const handleCopyAndLog = () => {
    if (!draftValue.trim()) return
    navigator.clipboard.writeText(draftValue)
    logBulkMessage(selected.id, draftValue)
    reload()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerateDraft = async () => {
    if (!selected) return
    setIsGenerating(true)
    const draft = await generateBulkDraft(selected, selectedTickets)
    setDraftValue(draft)
    updateGroupField(selected.id, { bulkDraft: draft })
    reload()
    setIsGenerating(false)
  }

  const handleSaveTitle = () => {
    if (!selected || !titleValue.trim()) return
    updateGroupField(selected.id, { title: titleValue.trim() })
    reload()
    setEditingTitle(false)
  }

  if (groups.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Issue Groups</h1>
          <p className="text-gray-500 mb-8">Groups are created when multiple customers report the same issue.</p>
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">🗂</div>
            <div className="font-semibold text-gray-600 mb-1">No groups yet</div>
            <div className="text-sm">Analyze tickets to start detecting patterns. When the AI identifies similar issues, you'll be able to group them here.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Issue Groups</h1>
          <p className="text-gray-500 text-sm">Clustered tickets with a shared root cause. Draft and copy bulk updates to affected customers.</p>
        </div>

        <div className="flex gap-6">
          {/* Left panel — group list */}
          <div className="w-80 flex-shrink-0">
            {/* Filter tabs */}
            <div className="flex space-x-1 mb-3">
              {[['active', 'Active'], ['resolved', 'Resolved'], ['all', 'All']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`px-3 py-1.5 text-sm rounded font-semibold ${filter === val ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filtered.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-400 text-center">
                  No {filter === 'resolved' ? 'resolved' : 'active'} groups
                </div>
              )}
              {filtered.map(group => (
                <button
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  className={`w-full text-left bg-white rounded-lg border p-4 hover:border-blue-300 transition-colors ${selectedId === group.id ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
                >
                  <div className="font-semibold text-gray-900 text-sm mb-2 leading-tight">{group.title}</div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${URGENCY_COLOR[group.urgency] || 'bg-gray-100 text-gray-600'}`}>
                      {group.urgency}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLOR[group.status]}`}>
                      {STATUS_LABEL[group.status]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {group.affectedCount} {group.affectedCount === 1 ? 'ticket' : 'tickets'} · {group.category}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel — group detail */}
          {selected ? (
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-lg shadow-md p-6 space-y-6">

                {/* Header */}
                <div>
                  {editingTitle ? (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        value={titleValue}
                        onChange={e => setTitleValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                        className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-lg font-bold focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        autoFocus
                      />
                      <button onClick={handleSaveTitle} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded font-semibold hover:bg-blue-700">Save</button>
                      <button onClick={() => setEditingTitle(false)} className="px-3 py-1.5 border border-gray-300 text-sm rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 mb-2">
                      <h2 className="text-xl font-bold text-gray-900 flex-1">{selected.title}</h2>
                      <button onClick={() => { setEditingTitle(true); setTitleValue(selected.title) }} className="text-gray-400 hover:text-gray-600 text-xs mt-1">Rename</button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${URGENCY_COLOR[selected.urgency]}`}>{selected.urgency} Urgency</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLOR[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
                    <span className="text-xs text-gray-400">{selected.affectedCount} affected · {selected.category}</span>
                    <span className="text-xs text-gray-400">Opened {new Date(selected.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Status actions */}
                {selected.status !== 'resolved' && (
                  <div className="flex gap-2">
                    {selected.status === 'open' && (
                      <button onClick={() => handleStatusChange(selected.id, 'in_progress')} className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded hover:bg-purple-700">
                        Mark In Progress
                      </button>
                    )}
                    {selected.status === 'in_progress' && (
                      <span className="px-3 py-2 bg-purple-50 text-purple-700 text-sm font-semibold rounded border border-purple-200">In Progress</span>
                    )}
                    <button onClick={() => handleStatusChange(selected.id, 'resolved')} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-gray-50">
                      Resolve Group
                    </button>
                  </div>
                )}

                {/* Member tickets */}
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-2">Member Tickets ({selectedTickets.length})</div>
                  {selectedTickets.length === 0 ? (
                    <div className="text-sm text-gray-400 italic">No ticket details found in history.</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTickets.map((ticket, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${URGENCY_COLOR[ticket.urgency]}`}>{ticket.urgency}</span>
                            <span className="text-xs text-gray-400">{new Date(ticket.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-snug">{ticket.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bulk draft */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-600">
                      Bulk Customer Update <span className="font-normal text-gray-400">(sent to all {selected.affectedCount} affected)</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerateDraft}
                        disabled={isGenerating}
                        className={`text-xs px-3 py-1.5 rounded font-semibold ${isGenerating ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'}`}
                      >
                        {isGenerating ? 'Generating...' : 'Generate Draft'}
                      </button>
                      <button
                        onClick={handleCopyAndLog}
                        disabled={!draftValue.trim()}
                        className={`text-xs px-3 py-1.5 rounded font-semibold ${!draftValue.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                      >
                        {copied ? '✓ Copied!' : 'Copy & Log'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={draftValue}
                    onChange={e => setDraftValue(e.target.value)}
                    onBlur={handleSaveDraft}
                    placeholder="Generate an AI draft or write a customer update here..."
                    className="w-full border border-gray-200 rounded-lg p-3 h-36 text-sm text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-y"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Draft auto-saves on blur. "Copy & Log" copies to clipboard and records it in message history.
                  </div>
                </div>

                {/* Message history */}
                {selected.messageHistory.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-600 mb-2">Message History</div>
                    <div className="space-y-2">
                      {selected.messageHistory.slice().reverse().map(entry => (
                        <div key={entry.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-400">{new Date(entry.draftedAt).toLocaleString()} · {entry.recipientCount} recipients</span>
                            {/* future: entry.sentAt → show "Sent via [channel]" */}
                          </div>
                          <p className="text-sm text-gray-700">{entry.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-3xl mb-2">←</div>
                <div className="text-sm">Select a group to view details</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GroupsPage
