import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { categorizeMessage, findMatchingGroup } from '../utils/llmHelper'
import { calculateUrgency } from '../utils/urgencyScorer'
import { getRecommendedAction } from '../utils/templates'
import { getOpenGroups, createGroup, addTicketToGroup, assignTicketGroup, getGroupById } from '../utils/groupsHelper'
import AccuracyTest from '../components/AccuracyTest'

function AnalyzePage() {
  const [message, setMessage] = useState('')
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('analyze')
  const [editedResponse, setEditedResponse] = useState('')
  const [copied, setCopied] = useState(false)
  const [groupSuggestion, setGroupSuggestion] = useState(null) // { groupId, confidence, reason }
  const [groupAction, setGroupAction] = useState(null) // 'added' | 'created' | 'dismissed'
  const [openGroups, setOpenGroups] = useState([])
  const [manualGroupId, setManualGroupId] = useState('')
  const [copiedResults, setCopiedResults] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    // Check for example message from home page
    const exampleMessage = localStorage.getItem('exampleMessage')
    if (exampleMessage) {
      setMessage(exampleMessage)
      localStorage.removeItem('exampleMessage')
    }
  }, [])

  const handleAnalyze = async () => {
    if (!message.trim()) {
      alert('Please enter a message to analyze')
      return
    }

    setIsLoading(true)
    setResults(null)

    try {
      // Run categorization (LLM call)
      const { category, urgency: aiUrgency, suggestedResponse, reasoning, isFallback } = await categorizeMessage(message)

      // Calculate urgency (use AI if available, else rule-based fallback)
      const urgency = aiUrgency || calculateUrgency(message)

      // Get recommended action (template-based)
      const recommendedAction = getRecommendedAction(category)

      const analysisResult = {
        message,
        category,
        urgency,
        recommendedAction,
        suggestedResponse,
        reasoning,
        timestamp: new Date().toISOString()
      }

      setResults(analysisResult)
      setEditedResponse(analysisResult.suggestedResponse || '')
      setGroupSuggestion(null)
      setGroupAction(null)
      setManualGroupId('')
      setCopiedResults(false)
      setUsingFallback(!!isFallback)

      // Load open groups for manual assignment dropdown
      const openGroups = getOpenGroups()
      setOpenGroups(openGroups)
      if (openGroups.length > 0) {
        findMatchingGroup(analysisResult, openGroups).then(match => {
          if (match) {
            // Save suggestion to the ticket record
            const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
            const idx = history.findIndex(t => t.timestamp === analysisResult.timestamp)
            if (idx !== -1) {
              history[idx].groupSuggestion = match.groupId
              localStorage.setItem('triageHistory', JSON.stringify(history))
            }
            setGroupSuggestion({ ...match, ticket: analysisResult })
          }
        })
      }

      // Save to history
      const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
      history.push(analysisResult)
      localStorage.setItem('triageHistory', JSON.stringify(history))
    } catch (error) {
      console.error('Error analyzing message:', error)
      alert('Error analyzing message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessage('')
    setResults(null)
    setEditedResponse('')
    setCopied(false)
    setGroupSuggestion(null)
    setGroupAction(null)
    setOpenGroups([])
    setManualGroupId('')
    setCopiedResults(false)
    setUsingFallback(false)
  }

  const handleManualAddToGroup = () => {
    if (!manualGroupId || !results) return
    addTicketToGroup(manualGroupId, results)
    assignTicketGroup(results.timestamp, manualGroupId)
    setGroupAction('added')
    setGroupSuggestion(null)
  }

  const handleAddToGroup = () => {
    if (!groupSuggestion) return
    addTicketToGroup(groupSuggestion.groupId, groupSuggestion.ticket)
    assignTicketGroup(groupSuggestion.ticket.timestamp, groupSuggestion.groupId)
    setGroupAction('added')
    setGroupSuggestion(null)
  }

  const handleCreateGroup = () => {
    if (!results) return
    const group = createGroup(results)
    assignTicketGroup(results.timestamp, group.id)
    setGroupAction('created')
    setGroupSuggestion(null)
  }

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(editedResponse)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[['analyze', 'Analyze'], ['test', 'Accuracy Test']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setActiveTab(val)}
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === val
                  ? 'bg-white shadow text-blue-600 border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'test' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <AccuracyTest />
          </div>
        )}


        {activeTab === 'analyze' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyze Customer Message</h1>
          <p className="text-gray-600 mb-6">
            Paste a customer support message below to automatically categorize and prioritize.
          </p>

          {/* Input Section */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste customer message here..."
              className="w-full border border-gray-300 rounded-lg p-3 h-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <div className="text-sm text-gray-500 mt-1">
              {message.length} characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className={`flex-1 py-3 rounded-lg font-semibold ${isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Analyze Message'
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={isLoading}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
        )}

        {/* Results Section */}
        {activeTab === 'analyze' && results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Analysis Results</h2>
              {usingFallback && (
                <span className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-300 px-3 py-1 rounded-full font-semibold">
                  AI unavailable — using fallback
                </span>
              )}
            </div>

            <div className="space-y-4">

              {/* Group suggestion banner */}
              {groupSuggestion && !groupAction && (() => {
                const matchedGroup = getGroupById(groupSuggestion.groupId)
                if (!matchedGroup) return null
                return (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                    <div className="text-sm font-semibold text-amber-800 mb-1">
                      Similar issue detected ({groupSuggestion.confidence} confidence)
                    </div>
                    <div className="text-sm text-amber-700 mb-3">
                      This looks related to <span className="font-semibold">"{matchedGroup.title}"</span> — {matchedGroup.affectedCount} other {matchedGroup.affectedCount === 1 ? 'ticket' : 'tickets'} in this group.
                      <span className="block text-amber-600 mt-0.5 italic">{groupSuggestion.reason}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={handleAddToGroup} className="px-3 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded hover:bg-amber-700">
                        Add to Group
                      </button>
                      <button onClick={handleCreateGroup} className="px-3 py-1.5 border border-amber-400 text-amber-800 text-sm font-semibold rounded hover:bg-amber-100">
                        Create New Group
                      </button>
                      <button onClick={() => setGroupAction('dismissed')} className="px-3 py-1.5 text-amber-600 text-sm hover:underline">
                        Dismiss
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Group action confirmation */}
              {groupAction && groupAction !== 'dismissed' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-green-800 font-semibold">
                    {groupAction === 'added' ? 'Ticket added to group.' : 'New group created.'}
                  </span>
                  <Link to="/groups" className="text-sm text-green-700 underline hover:text-green-900">
                    View Groups
                  </Link>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Category</div>
                <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                  {results.category}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Urgency Level</div>
                <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${results.urgency === 'High' ? 'bg-red-200 text-red-900' :
                  results.urgency === 'Medium' ? 'bg-yellow-200 text-yellow-900' :
                    'bg-green-200 text-green-900'
                  }`}>
                  {results.urgency}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Recommended Action</div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-gray-800">{results.recommendedAction}</p>
                </div>
              </div>

              {results.suggestedResponse && (
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1 flex justify-between items-center">
                    <span>Suggested Response <span className="text-gray-400 font-normal">(edit before sending)</span></span>
                    <button
                      onClick={handleCopyResponse}
                      className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                    >
                      {copied ? '✓ Copied!' : 'Copy Response'}
                    </button>
                  </div>
                  <textarea
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    className="w-full bg-green-50 border border-green-200 rounded-lg p-4 text-gray-800 h-40 focus:ring-2 focus:ring-green-400 focus:border-green-400 resize-y"
                  />
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">AI Reasoning</div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>
                      {results.reasoning}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual group controls — always visible until an action is taken */}
            {!groupAction && (
              <div className="mt-2 pt-4 border-t border-gray-100">
                <div className="text-sm font-semibold text-gray-600 mb-2">Group this ticket</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {openGroups.length > 0 && (
                    <>
                      <select
                        value={manualGroupId}
                        onChange={e => setManualGroupId(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      >
                        <option value="">Select existing group...</option>
                        {openGroups.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.title} ({g.affectedCount} {g.affectedCount === 1 ? 'ticket' : 'tickets'})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleManualAddToGroup}
                        disabled={!manualGroupId}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg ${manualGroupId ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        Add to Group
                      </button>
                      <span className="text-gray-300 text-sm">or</span>
                    </>
                  )}
                  <button
                    onClick={handleCreateGroup}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Start New Group
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  const text = `Category: ${results.category}\nUrgency: ${results.urgency}\nRecommendation: ${results.recommendedAction}\n\nReasoning: ${results.reasoning}`
                  navigator.clipboard.writeText(text)
                  setCopiedResults(true)
                  setTimeout(() => setCopiedResults(false), 2000)
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold"
              >
                {copiedResults ? '✓ Copied!' : 'Copy Results'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyzePage
