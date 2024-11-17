import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { admin } from '../services/api';
import { Navigate, useNavigate } from 'react-router-dom';
import ProfileSection from './ProfileSection';

// Helper function to format interval label
const formatIntervalDisplay = (label) => {
  if (!label) return '1 hour';
  return label
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim()
    .replace(/^./, str => str.toUpperCase());
};

const VALID_INTERVALS = [
  { value: 5, label: 'FiveMinutes' },
  { value: 15, label: 'FifteenMinutes' },
  { value: 30, label: 'ThirtyMinutes' },
  { value: 60, label: 'OneHour' },
  { value: 180, label: 'ThreeHours' },
  { value: 360, label: 'SixHours' },
  { value: 720, label: 'TwelveHours' },
  { value: 1440, label: 'TwentyFourHours' }
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [creditModal, setCreditModal] = useState({
    show: false,
    userId: null,
    currentCredits: 0,
    amount: 100
  });
  const [newDomain, setNewDomain] = useState({
    domain: '',
    interval: 60
  });
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    loadUsers();
    loadDomains();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await admin.getUsers();
      setUsers(response.data.users || []);
      setError('');
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadDomains = async () => {
    try {
      const response = await admin.getAdminDomains();
      setDomains(response.data.domains || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
      setError('Failed to load domains');
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.domain) return;

    try {
      setError('');
      await admin.addAdminDomain(newDomain);
      setNewDomain({ domain: '', interval: 60 });
      loadDomains();
    } catch (err) {
      console.error('Failed to add domain:', err);
      setError(err.response?.data?.error || 'Failed to add domain');
    }
  };

  const handleCheckDomain = async (domainId) => {
    try {
      setError('');
      await admin.checkAdminDomain(domainId);
      loadDomains();
    } catch (err) {
      console.error('Failed to check domain:', err);
      setError(err.response?.data?.error || 'Failed to check domain');
    }
  };

  const handleRemoveDomain = async (domainId) => {
    try {
      setError('');
      await admin.removeAdminDomain(domainId);
      loadDomains();
    } catch (err) {
      console.error('Failed to remove domain:', err);
      setError(err.response?.data?.error || 'Failed to remove domain');
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      setError('');
      const response = await admin.updateUser(userId, updates);
      
      // Update the user in the list with the returned data
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? response.data.user : user
        )
      );
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleAddCredits = async () => {
    try {
      setError('');
      if (creditModal.amount <= 0) {
        setError('Credit amount must be greater than 0');
        return;
      }
      await handleUpdateUser(creditModal.userId, { 
        credits: creditModal.currentCredits + parseInt(creditModal.amount) 
      });
      setCreditModal({ show: false, userId: null, currentCredits: 0, amount: 100 });
    } catch (err) {
      console.error('Failed to add credits:', err);
      setError(err.response?.data?.error || 'Failed to add credits');
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      setError('');
      await handleUpdateUser(userId, { is_active: !currentStatus });
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      setError(err.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleCheckDomainUser = async (userId, domainId) => {
    try {
      setError('');
      const response = await admin.checkDomain(userId, domainId);
      
      // Update the domains list for the user
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, domains: response.data.domains }
            : user
        )
      );
    } catch (err) {
      console.error('Failed to check domain:', err);
      setError(err.response?.data?.error || 'Failed to check domain');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Domain Monitor - Admin Panel</h1>
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

        {/* Admin's Domain Management */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">My Domains</h2>
          
          {/* Add Domain Form */}
          <form onSubmit={handleAddDomain} className="mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={newDomain.domain}
                onChange={(e) => setNewDomain(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="Enter domain name"
                className="flex-1 p-2 border rounded"
              />
              <select
                value={newDomain.interval}
                onChange={(e) => setNewDomain(prev => ({ ...prev, interval: Number(e.target.value) }))}
                className="p-2 border rounded"
              >
                {VALID_INTERVALS.map(interval => (
                  <option key={interval.value} value={interval.value}>
                    {formatIntervalDisplay(interval.label)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Domain
              </button>
            </div>
          </form>

          {/* Domains Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Interval</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Checked</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {domains.map(domain => (
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
                      {formatIntervalDisplay(domain.interval_label)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {domain.last_checked ? new Date(domain.last_checked).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleCheckDomain(domain.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Check Now
                      </button>
                      <button
                        onClick={() => handleRemoveDomain(domain.id)}
                        className="text-red-600 hover:text-red-900 ml-2"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
          {loading ? (
            <p>Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <>
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap capitalize">{user.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span>{user.credits}</span>
                            <button
                              onClick={() => setCreditModal({
                                show: true,
                                userId: user.id,
                                currentCredits: user.credits,
                                amount: 100
                              })}
                              className="text-green-600 hover:text-green-900 text-sm"
                            >
                              Add Credits
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.api_calls_count} / {user.api_calls_limit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleToggleActive(user.id, user.is_active)}
                            className={`${
                              user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                            className="text-blue-600 hover:text-blue-900 ml-2"
                          >
                            {expandedUser === user.id ? 'Hide Domains' : 'Show Domains'}
                          </button>
                        </td>
                      </tr>
                      {expandedUser === user.id && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h3 className="text-lg font-medium mb-4">Monitored Domains</h3>
                              {user.domains && user.domains.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead>
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check Interval</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Checked</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {user.domains.map(domain => (
                                      <tr key={domain.id}>
                                        <td className="px-4 py-2 whitespace-nowrap">{domain.domain}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            domain.status ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                          }`}>
                                            {domain.status ? 'Blocked' : 'Not Blocked'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          {formatIntervalDisplay(domain.interval_label)}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          {domain.last_checked ? new Date(domain.last_checked).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <button
                                            onClick={() => handleCheckDomainUser(user.id, domain.id)}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            Check Now
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-gray-500">No domains monitored</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Credit Modal */}
      {creditModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Credits</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Amount
              </label>
              <input
                type="number"
                min="1"
                value={creditModal.amount}
                onChange={(e) => setCreditModal(prev => ({
                  ...prev,
                  amount: e.target.value
                }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCreditModal({
                  show: false,
                  userId: null,
                  currentCredits: 0,
                  amount: 100
                })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredits}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Credits
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <ProfileSection 
          onClose={() => setShowProfile(false)} 
          onUpdate={loadUsers}
          userInfo={user}
        />
      )}
    </div>
  );
}
