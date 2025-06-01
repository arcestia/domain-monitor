# Domain Monitor

A web application for monitoring domain blocking status with user management and credit-based API access.

## Features

- User Authentication System
  - Role-based authentication (admin/user)
  - JWT-based secure login
  - Registration with password validation
  - Protected routes based on user roles

- Domain Monitoring
  - Add/remove domains for monitoring
  - Real-time domain status checking
  - Credit-based domain check system
  - Automatic interval-based domain status updates

- Credit System
  - Per-domain credit deduction
  - Credit tracking for domain checks
  - Configurable check intervals
  - Prevents domain checks when credits are insufficient

## Tech Stack

- Frontend:
  - React
  - React Router
  - Context API for state management
  - Tailwind CSS for styling
  - Axios for API calls

- Backend:
  - Node.js
  - Express
  - MySQL
  - JWT for authentication
  - Bcrypt for password hashing

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/domain-monitor.git
cd domain-monitor
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Create a MySQL database:
```sql
CREATE DATABASE domain_monitor;
```

5. Configure environment variables:
Create a `.env` file in the backend directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=domain_monitor
JWT_SECRET=your-secret-key-here
PORT=5000
```

6. Initialize the database:
```bash
cd backend
mysql -u root -p domain_monitor < database.sql
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Default Admin Account

- Email: admin@example.com
- Password: admin123

## API Documentation

See [API Documentation](docs/API.md) for detailed API endpoints and usage.

## Credit System

- Each user starts with 100 credits
- Each domain check costs 1 credit
- Credits are deducted for:
  1. Initial domain check when adding
  2. Manual domain checks
  3. Automatic background checks

## Domain Status Checking

The application uses the Skiddle API (https://check.skiddle.id/) to check domain blocking status:
- Single domain check endpoint: `https://check.skiddle.id/?domain=example.com&json=true`
- Batch domain check endpoint: `https://check.skiddle.id/?domains=domain1.com,domain2.com&json=true`

## Security Considerations

1. JWT token-based authentication
2. Role-based access control
3. Secure password storage (bcrypt)
4. Credit system prevents unlimited API usage
5. Server-side input validation
6. Protected API endpoints

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---
<!-- License + Copyright -->
<p  align="center">
  <i>© <a href="https://skiddle.id">Skiddle ID</a> 2025</i><br>
  <i>Licensed under <a href="https://gist.github.com/arcestia/dc2bef037daf25773cb972b69d22be09">MIT</a></i>
</p>
