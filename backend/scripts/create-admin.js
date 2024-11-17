const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function createAdmin() {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'domain_monitor'
    });

    try {
        await pool.execute(
            `INSERT INTO users (username, email, password, role, credits, api_calls_limit, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['admin', 'admin@example.com', hashedPassword, 'admin', 999999, 999999, true]
        );
        console.log('Admin user created successfully');
        console.log('Email: admin@example.com');
        console.log('Password: admin123');
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await pool.end();
    }
}

createAdmin();
