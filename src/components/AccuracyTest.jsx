import { useState } from 'react'
import { calculateUrgency } from '../utils/urgencyScorer'
import { categorizeMessage } from '../utils/llmHelper'

const TEST_CASES = [
  {
    id: 1,
    message: "OUR PRODUCTION SERVERS ARE DOWN AND WE ARE LOSING REVENUE",
    expected: "High",
    failureMode: "ALL CAPS incorrectly reduces urgency score by 50 points"
  },
  {
    id: 2,
    message: "Server down.",
    expected: "High",
    failureMode: "Short messages penalized — length under 50 chars removes 40 points regardless of content"
  },
  {
    id: 3,
    message: "Why has our entire database been wiped?",
    expected: "High",
    failureMode: "Question marks reduce score by 25 — critical questions get classified as Low"
  },
  {
    id: 4,
    message: "Please be advised our payment processing has been completely down for 3 hours and clients cannot complete transactions.",
    expected: "High",
    failureMode: "Polite language ('please') reduces score — courteous messages about critical issues get downgraded"
  },
  {
    id: 5,
    message: "Great news!! My issue resolved itself!!",
    expected: "Low",
    failureMode: "Exclamation marks add 30pts each — positive messages with enthusiasm misclassify as High"
  },
  {
    id: 6,
    message: "This is excellent!! I absolutely love the new dashboard update!! It's wonderful!!",
    expected: "Low",
    failureMode: "Exclamation marks overwhelm the positive word penalties — excited feedback scores as High urgency"
  },
  {
    id: 7,
    message: "Hi, I'd like to kindly request help understanding how to export reports whenever someone has time, no rush at all, thank you!",
    expected: "Low",
    failureMode: "One exclamation boosts score enough to cancel out 'kindly' and 'thank' penalties — routine request becomes Medium"
  },
  {
    id: 8,
    message: "We process payments for our enterprise clients through your API and it has been returning 500 errors for the past two hours.",
    expected: "High",
    failureMode: "No exclamation marks, no keywords — calm professional language describing a critical outage scores as Medium"
  }
]

const URGENCY_COLOR = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800'
}

function AccuracyTest() {
  const [llmResults, setLlmResults] = useState({}) // { [id]: urgency }
  const [isRunning, setIsRunning] = useState(false)
  const [currentlyTesting, setCurrentlyTesting] = useState(null) // id of case being tested
  const [done, setDone] = useState(false)

  const ruleBasedResults = Object.fromEntries(
    TEST_CASES.map(tc => [tc.id, calculateUrgency(tc.message)])
  )

  const ruleBasedScore = TEST_CASES.filter(tc => ruleBasedResults[tc.id] === tc.expected).length
  const llmScore = done
    ? TEST_CASES.filter(tc => llmResults[tc.id] === tc.expected).length
    : null

  const handleRunTests = async () => {
    setIsRunning(true)
    setDone(false)
    setLlmResults({})

    for (const tc of TEST_CASES) {
      setCurrentlyTesting(tc.id)
      try {
        const { urgency } = await categorizeMessage(tc.message)
        setLlmResults(prev => ({ ...prev, [tc.id]: urgency }))
      } catch {
        setLlmResults(prev => ({ ...prev, [tc.id]: 'Error' }))
      }
    }

    setCurrentlyTesting(null)
    setIsRunning(false)
    setDone(true)
  }

  return (
    <div>
      {/* Header + scores */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Urgency Classifier Accuracy Test</h2>
          <p className="text-sm text-gray-500">
            8 test cases targeting known failure modes in the rule-based system. Run to compare against AI classification.
          </p>
        </div>
        <button
          onClick={handleRunTests}
          disabled={isRunning}
          className={`px-5 py-2.5 rounded-lg font-semibold text-sm shrink-0 ${
            isRunning
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning ? 'Running...' : done ? 'Re-run Tests' : 'Run Tests'}
        </button>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Rule-Based Score</div>
          <div className={`text-3xl font-bold ${ruleBasedScore <= 3 ? 'text-red-600' : ruleBasedScore <= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
            {ruleBasedScore} / {TEST_CASES.length}
          </div>
          <div className="text-xs text-gray-400 mt-1">keyword + heuristic scoring</div>
        </div>
        <div className={`border rounded-lg p-4 text-center ${done ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">LLM Score</div>
          <div className={`text-3xl font-bold ${
            llmScore === null ? 'text-gray-300' :
            llmScore <= 3 ? 'text-red-600' :
            llmScore <= 5 ? 'text-yellow-600' : 'text-blue-600'
          }`}>
            {llmScore === null ? '—' : `${llmScore} / ${TEST_CASES.length}`}
          </div>
          <div className="text-xs text-gray-400 mt-1">{done ? 'AI-driven classification' : 'run tests to see result'}</div>
        </div>
      </div>

      {/* Test cases */}
      <div className="space-y-3">
        {TEST_CASES.map(tc => {
          const ruleResult = ruleBasedResults[tc.id]
          const llmResult = llmResults[tc.id]
          const isTesting = currentlyTesting === tc.id
          const ruleCorrect = ruleResult === tc.expected
          const llmCorrect = llmResult === tc.expected

          return (
            <div key={tc.id} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Message */}
              <div className="text-sm text-gray-800 font-medium mb-1">
                "{tc.message}"
              </div>

              {/* Failure mode explanation */}
              <div className="text-xs text-gray-400 mb-3 italic">{tc.failureMode}</div>

              {/* Results row */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Expected */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Expected:</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${URGENCY_COLOR[tc.expected]}`}>
                    {tc.expected}
                  </span>
                </div>

                <span className="text-gray-200">|</span>

                {/* Rule-based */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Rule-based:</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${URGENCY_COLOR[ruleResult]}`}>
                    {ruleResult}
                  </span>
                  <span className={`text-xs font-bold ${ruleCorrect ? 'text-green-600' : 'text-red-500'}`}>
                    {ruleCorrect ? '✓' : '✗'}
                  </span>
                </div>

                <span className="text-gray-200">|</span>

                {/* LLM */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">LLM:</span>
                  {isTesting ? (
                    <span className="text-xs text-blue-500 animate-pulse">testing...</span>
                  ) : llmResult ? (
                    <>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${URGENCY_COLOR[llmResult] || 'bg-gray-100 text-gray-600'}`}>
                        {llmResult}
                      </span>
                      <span className={`text-xs font-bold ${llmCorrect ? 'text-green-600' : 'text-red-500'}`}>
                        {llmCorrect ? '✓' : '✗'}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-300">not run</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AccuracyTest
