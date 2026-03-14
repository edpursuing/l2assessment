const GROUPS_KEY = 'triageGroups'

const URGENCY_RANK = { High: 3, Medium: 2, Low: 1 }

export function getGroups() {
  return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]')
}

function saveGroups(groups) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
}

export function getOpenGroups() {
  return getGroups().filter(g => g.status !== 'resolved')
}

export function getGroupById(groupId) {
  return getGroups().find(g => g.id === groupId) || null
}

export function createGroup(ticket) {
  const groups = getGroups()
  const group = {
    id: `grp_${Date.now()}`,
    title: `${ticket.category} — ${new Date().toLocaleDateString()}`,
    summary: ticket.message.slice(0, 150),
    status: 'open',
    urgency: ticket.urgency,
    category: ticket.category,
    tickets: [ticket.timestamp],
    affectedCount: 1,
    bulkDraft: '',
    messageHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
    externalRef: null,
    assignedTo: null,
    tags: []
  }
  groups.push(group)
  saveGroups(groups)
  return group
}

export function addTicketToGroup(groupId, ticket) {
  const groups = getGroups()
  const idx = groups.findIndex(g => g.id === groupId)
  if (idx === -1) return null

  const group = groups[idx]
  if (group.tickets.includes(ticket.timestamp)) return group

  group.tickets.push(ticket.timestamp)
  group.affectedCount = group.tickets.length

  // Escalate urgency if ticket is higher
  if ((URGENCY_RANK[ticket.urgency] || 0) > (URGENCY_RANK[group.urgency] || 0)) {
    group.urgency = ticket.urgency
  }

  group.updatedAt = new Date().toISOString()
  groups[idx] = group
  saveGroups(groups)
  return group
}

export function updateGroupField(groupId, fields) {
  const groups = getGroups()
  const idx = groups.findIndex(g => g.id === groupId)
  if (idx === -1) return null
  groups[idx] = { ...groups[idx], ...fields, updatedAt: new Date().toISOString() }
  saveGroups(groups)
  return groups[idx]
}

export function resolveGroup(groupId) {
  return updateGroupField(groupId, {
    status: 'resolved',
    resolvedAt: new Date().toISOString()
  })
}

export function logBulkMessage(groupId, content) {
  const groups = getGroups()
  const idx = groups.findIndex(g => g.id === groupId)
  if (idx === -1) return null

  const entry = {
    id: `msg_${Date.now()}`,
    content,
    draftedAt: new Date().toISOString(),
    sentAt: null, // future: set when delivered via email/Intercom/Zendesk
    recipientCount: groups[idx].affectedCount
    // future: sentBy, deliveryChannel
  }

  groups[idx].messageHistory.push(entry)
  groups[idx].updatedAt = new Date().toISOString()
  saveGroups(groups)
  return groups[idx]
}

// Update ticket in triageHistory with groupId
export function assignTicketGroup(ticketTimestamp, groupId) {
  const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
  const idx = history.findIndex(t => t.timestamp === ticketTimestamp)
  if (idx !== -1) {
    history[idx].groupId = groupId
    history[idx].groupSuggestion = null
    localStorage.setItem('triageHistory', JSON.stringify(history))
  }
}

// Get full ticket objects for a group from triageHistory
export function getGroupTickets(group) {
  const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
  return group.tickets
    .map(ts => history.find(t => t.timestamp === ts))
    .filter(Boolean)
}
