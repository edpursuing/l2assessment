import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()
  
  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80">
            <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center text-2xl">
              📧
            </div>
            <div>
              <div className="font-bold text-lg">Relay AI</div>
              <div className="text-xs text-blue-200">Customer Triage</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded ${
                isActive('/') 
                  ? 'bg-blue-700 font-semibold' 
                  : 'hover:bg-blue-500'
              }`}
            >
              Home
            </Link>
            <Link
              to="/analyze"
              className={`px-4 py-2 rounded ${
                isActive('/analyze') 
                  ? 'bg-blue-700 font-semibold' 
                  : 'hover:bg-blue-500'
              }`}
            >
              Analyze
            </Link>
            <Link
              to="/history"
              className={`px-4 py-2 rounded ${
                isActive('/history') 
                  ? 'bg-blue-700 font-semibold' 
                  : 'hover:bg-blue-500'
              }`}
            >
              History
            </Link>
            <Link
              to="/dashboard"
              className={`px-4 py-2 rounded ${
                isActive('/dashboard')
                  ? 'bg-blue-700 font-semibold'
                  : 'hover:bg-blue-500'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/groups"
              className={`px-4 py-2 rounded ${
                isActive('/groups')
                  ? 'bg-blue-700 font-semibold'
                  : 'hover:bg-blue-500'
              }`}
            >
              Groups
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
