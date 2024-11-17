import { useState } from 'react';
import UserList from './UserList';
import UserManagement from './UserManagement';

export default function AdminDashboard() {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const handleClose = () => {
    setSelectedUser(null);
  };

  const handleUpdate = () => {
    setSelectedUser(null);
    // Force UserList to reload
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      </div>

      {selectedUser ? (
        <UserManagement
          user={selectedUser}
          onClose={handleClose}
          onUpdate={handleUpdate}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <UserList onSelectUser={handleUserSelect} />
        </div>
      )}
    </div>
  );
}
