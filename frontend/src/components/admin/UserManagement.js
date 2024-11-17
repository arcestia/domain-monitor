import { useState, useEffect, useCallback } from 'react';
import { admin } from '../../services/api';

export default function UserManagement({ user, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    credits: user.credits,
    api_calls_limit: user.api_calls_limit,
    is_active: user.is_active,
  });
  const [apiToken, setApiToken] = useState(user.api_token);

  const loadUserStats = useCallback(async () => {
    try {
      const response = await admin.getUserStats(user.id);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load user stats:', err);
    }
  }, [user.id]);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await admin.updateUser(user.id, formData);
      onUpdate();
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    try {
      const response = await admin.generateApiToken(user.id);
      setApiToken(response.data.apiToken);
    } catch (err) {
      console.error('Failed to generate API token:', err);
    }
  };

  const handleRevokeToken = async () => {
    try {
      await admin.revokeApiToken(user.id);
      setApiToken(null);
    } catch (err) {
      console.error('Failed to revoke API token:', err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage User: {user.username}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">User Statistics</h3>
          {stats ? (
            <div className="space-y-2">
              <p>Monitored Domains: {stats.stats.domain_count}</p>
              <p>Total Checks: {stats.stats.total_checks}</p>
              <p>Total Credits Used: {stats.stats.total_credits_used}</p>
            </div>
          ) : (
            <p>Loading statistics...</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          {stats?.recent_transactions ? (
            <div className="space-y-2">
              {stats.recent_transactions.map((tx) => (
                <div key={tx.id} className="text-sm">
                  <span className={tx.transaction_type === 'add' ? 'text-green-600' : 'text-red-600'}>
                    {tx.transaction_type === 'add' ? '+' : '-'}{tx.amount}
                  </span>
                  <span className="ml-2">{tx.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>Loading transactions...</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Credits</label>
          <input
            type="number"
            value={formData.credits}
            onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">API Call Limit</label>
          <input
            type="number"
            value={formData.api_calls_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, api_calls_limit: parseInt(e.target.value) || 0 }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2">Account Active</span>
          </label>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">API Token</h3>
          {apiToken ? (
            <div className="space-y-2">
              <div className="p-2 bg-gray-100 rounded break-all text-sm">
                {apiToken}
              </div>
              <button
                type="button"
                onClick={handleRevokeToken}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Revoke Token
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateToken}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              Generate New Token
            </button>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
