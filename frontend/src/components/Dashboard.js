import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { domains, auth } from '../services/api';
import ProfileSection from './ProfileSection';
import { Navigate, useNavigate } from 'react-router-dom';

// Helper function to format interval label
const formatIntervalLabel = (label) => {
  if (!label) return '';
  return label
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^./, str => str.toUpperCase());
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [domainList, setDomainList] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [selectedInterval, setSelectedInterval] = useState('1hour');
  const [validIntervals, setValidIntervals] = useState([]);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState({});
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const response = await domains.getAll();
      setDomainList(response.data.domains || []);
      setUserInfo(response.data.user_info || {});
      if (response.data.valid_intervals?.length > 0) {
        setValidIntervals(response.data.valid_intervals);
        // Set default interval if not already set
        if (!selectedInterval) {
          setSelectedInterval(response.data.valid_intervals[0].label);
        }
      }
      setError('');
    } catch (err) {
      console.error('Failed to load domains:', err);
      setError('Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We only want this to run once on mount

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain) return;

    try {
      const response = await domains.add({ 
        domain: newDomain,
        checkInterval: selectedInterval
      });
      setDomainList(response.data.domains);
      setUserInfo(response.data.user_info);
      setNewDomain('');
      setError('');
    } catch (err) {
      console.error('Failed to add domain:', err);
      setError(err.response?.data?.error || 'Failed to add domain');
    }
  };

  const handleRemoveDomain = async (id) => {
    try {
      const response = await domains.remove(id);
      setDomainList(response.data.domains);
      setUserInfo(response.data.user_info);
      setError('');
    } catch (err) {
      console.error('Failed to remove domain:', err);
      setError('Failed to remove domain');
    }
  };

  const handleCheckDomain = async (id) => {
    try {
      const response = await domains.checkDomain(id);
      setDomainList(response.data.domains);
      setUserInfo(response.data.user_info);
      setError('');
    } catch (err) {
      console.error('Failed to check domain:', err);
      setError('Failed to check domain');
    }
  };

  const handleGenerateToken = async () => {
    try {
      const response = await auth.generateApiToken();
      setUserInfo(prev => ({
        ...prev,
        ...response.data.user_info
      }));
    } catch (err) {
      console.error('Failed to generate API token:', err);
      setError('Failed to generate API token');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Domain Monitor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowProfile(true)}
                className="text-gray-700 hover:text-gray-900"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* User Info Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Account Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-600">Credits</p>
              <p className="text-xl font-semibold">{userInfo.credits || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">API Calls</p>
              <p className="text-xl font-semibold">{userInfo.api_calls_count || 0} / {userInfo.api_calls_limit || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Role</p>
              <p className="text-xl font-semibold capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        {/* API Token Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">API Token</h2>
            <button
              onClick={handleGenerateToken}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Generate New Token
            </button>
          </div>
          {userInfo.api_token ? (
            <div className="p-4 bg-gray-100 rounded break-all font-mono text-sm">
              {userInfo.api_token}
            </div>
          ) : (
            <p className="text-gray-500">No API token generated yet</p>
          )}
        </div>

        {/* Add Domain Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add Domain</h2>
          <form onSubmit={handleAddDomain} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Interval
                </label>
                <select
                  value={selectedInterval}
                  onChange={(e) => setSelectedInterval(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  {validIntervals.map(interval => (
                    <option key={interval.value} value={interval.label}>
                      {formatIntervalLabel(interval.label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Add Domain
              </button>
            </div>
          </form>
        </div>

        {/* Domains List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Monitored Domains</h2>
          {loading ? (
            <p>Loading domains...</p>
          ) : domainList.length === 0 ? (
            <p className="text-gray-500">No domains monitored yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Interval</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Checked</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {domainList.map((domain) => (
                    <tr key={domain.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{domain.domain}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          domain.status ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {domain.status ? 'Blocked' : 'Not Blocked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatIntervalLabel(domain.interval_label)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {domain.last_checked ? new Date(domain.last_checked).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleCheckDomain(domain.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Check Now
                        </button>
                        <button
                          onClick={() => handleRemoveDomain(domain.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showProfile && (
        <ProfileSection 
          onClose={() => setShowProfile(false)} 
          onUpdate={loadDomains}
          userInfo={userInfo}
        />
      )}
    </div>
  );
}
