const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');

const CHECK_API_URL = 'https://check.skiddle.id/';

// Helper function to format interval label
const formatIntervalLabel = (interval) => {
    const intervals = {
        5: 'FiveMinutes',
        15: 'FifteenMinutes',
        30: 'ThirtyMinutes',
        60: 'OneHour',
        180: 'ThreeHours',
        360: 'SixHours',
        720: 'TwelveHours',
        1440: 'TwentyFourHours'
    };
    return intervals[interval] || 'OneHour';
};

exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, email, role, credits, api_calls_limit, api_calls_count, is_active, created_at, updated_at FROM users WHERE role != "admin"'
        );

        // Get domains for each user
        const usersWithDomains = await Promise.all(users.map(async (user) => {
            const [domains] = await pool.execute(
                `SELECT 
                    id, domain, status, check_interval, 
                    credits_per_check, last_checked
                FROM monitored_domains 
                WHERE user_id = ?`,
                [user.id]
            );

            // Add interval_label to each domain
            const domainsWithLabels = domains.map(domain => ({
                ...domain,
                interval: domain.check_interval,
                interval_label: formatIntervalLabel(domain.check_interval)
            }));

            return {
                ...user,
                domains: domainsWithLabels
            };
        }));

        res.json({ users: usersWithDomains });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

exports.getUserDomains = async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user exists
        const [user] = await pool.execute(
            'SELECT id, username, credits FROM users WHERE id = ?',
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's domains
        const [domains] = await pool.execute(
            `SELECT 
                id, domain, status, check_interval, 
                credits_per_check, last_checked
            FROM monitored_domains 
            WHERE user_id = ?`,
            [userId]
        );

        // Add interval_label to each domain
        const domainsWithLabels = domains.map(domain => ({
            ...domain,
            interval: domain.check_interval,
            interval_label: formatIntervalLabel(domain.check_interval)
        }));

        res.json({
            user: user[0],
            domains: domainsWithLabels
        });
    } catch (error) {
        console.error('Get user domains error:', error);
        res.status(500).json({ error: 'Failed to fetch user domains' });
    }
};

exports.checkDomain = async (req, res) => {
    try {
        const { userId, domainId } = req.params;

        // Get domain and user info
        const [domains] = await pool.execute(
            `SELECT d.*, u.credits 
            FROM monitored_domains d
            JOIN users u ON d.user_id = u.id
            WHERE d.id = ? AND d.user_id = ?`,
            [domainId, userId]
        );

        if (domains.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        const domain = domains[0];

        // Check domain status using Skiddle API
        const response = await axios.get(CHECK_API_URL, {
            params: {
                domain: domain.domain,
                json: true
            },
            timeout: 10000
        });

        const result = response.data[domain.domain];
        const isBlocked = result?.blocked || false;

        // Update domain status
        await pool.execute(
            'UPDATE monitored_domains SET status = ?, last_checked = NOW() WHERE id = ?',
            [isBlocked, domainId]
        );

        // Deduct credits
        await pool.execute(
            'UPDATE users SET credits = credits - ? WHERE id = ?',
            [domain.credits_per_check, userId]
        );

        // Add to history
        await pool.execute(
            'INSERT INTO domain_history (domain_id, status, credits_used) VALUES (?, ?, ?)',
            [domainId, isBlocked, domain.credits_per_check]
        );

        // Get updated domain list
        const [updatedDomains] = await pool.execute(
            `SELECT 
                d.*, u.credits, u.api_calls_count, u.api_calls_limit
            FROM monitored_domains d
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?`,
            [userId]
        );

        // Add interval_label to updated domains
        const updatedDomainsWithLabels = updatedDomains.map(domain => ({
            ...domain,
            interval: domain.check_interval,
            interval_label: formatIntervalLabel(domain.check_interval)
        }));

        res.json({
            message: 'Domain checked successfully',
            domains: updatedDomainsWithLabels,
            user_info: {
                credits: updatedDomainsWithLabels[0]?.credits,
                api_calls_count: updatedDomainsWithLabels[0]?.api_calls_count,
                api_calls_limit: updatedDomainsWithLabels[0]?.api_calls_limit
            }
        });
    } catch (error) {
        console.error('Check domain error:', error);
        res.status(500).json({ error: 'Failed to check domain' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Get current user data
        const [currentUser] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (currentUser.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Build update query dynamically based on provided fields
        const allowedUpdates = ['credits', 'api_calls_limit', 'is_active'];
        const updateFields = [];
        const updateValues = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedUpdates.includes(key)) {
                updateFields.push(`${key} = ?`);
                updateValues.push(value);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid update fields provided' });
        }

        // Add id to values array
        updateValues.push(id);

        // Execute update query
        await pool.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // If credits were updated, log the transaction
        if (updates.credits !== undefined && updates.credits !== currentUser[0].credits) {
            const creditChange = updates.credits - currentUser[0].credits;
            await pool.execute(
                'INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
                [
                    id,
                    Math.abs(creditChange),
                    creditChange > 0 ? 'add' : 'subtract',
                    'Admin adjustment'
                ]
            );
        }

        // Get updated user data
        const [updatedUser] = await pool.execute(
            'SELECT id, username, email, role, credits, api_calls_limit, api_calls_count, is_active FROM users WHERE id = ?',
            [id]
        );

        res.json({
            message: 'User updated successfully',
            user: updatedUser[0]
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        const { id } = req.params;

        // Get user data
        const [user] = await pool.execute(
            'SELECT id, username, email, role, credits, api_calls_limit, api_calls_count, is_active FROM users WHERE id = ?',
            [id]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get domain statistics
        const [domains] = await pool.execute(
            'SELECT COUNT(*) as domain_count FROM monitored_domains WHERE user_id = ?',
            [id]
        );

        // Get credit transactions
        const [transactions] = await pool.execute(
            'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
            [id]
        );

        res.json({
            user: user[0],
            stats: {
                domain_count: domains[0].domain_count,
                recent_transactions: transactions
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
};

exports.addUserCredits = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid credit amount' });
        }

        // Get current user credits
        const [user] = await pool.execute(
            'SELECT credits FROM users WHERE id = ?',
            [id]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const newCredits = user[0].credits + amount;

        // Update user credits
        await pool.execute(
            'UPDATE users SET credits = ? WHERE id = ?',
            [newCredits, id]
        );

        // Log credit transaction
        await pool.execute(
            'INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
            [id, amount, 'add', 'Admin credit addition']
        );

        res.json({
            message: 'Credits added successfully',
            credits: newCredits
        });
    } catch (error) {
        console.error('Add credits error:', error);
        res.status(500).json({ error: 'Failed to add credits' });
    }
};

exports.generateApiToken = async (req, res) => {
    try {
        const { id } = req.params;
        const apiToken = crypto.randomBytes(32).toString('hex');

        await pool.execute(
            'UPDATE users SET api_token = ?, api_calls_count = 0, api_calls_reset_at = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE id = ?',
            [apiToken, id]
        );

        res.json({ apiToken });
    } catch (error) {
        console.error('Generate API token error:', error);
        res.status(500).json({ error: 'Failed to generate API token' });
    }
};

exports.revokeApiToken = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.execute(
            'UPDATE users SET api_token = NULL WHERE id = ?',
            [id]
        );

        res.json({ message: 'API token revoked successfully' });
    } catch (error) {
        console.error('Revoke API token error:', error);
        res.status(500).json({ error: 'Failed to revoke API token' });
    }
};

exports.getAdminDomains = async (req, res) => {
    try {
        // Get admin's domains
        const [domains] = await pool.execute(
            `SELECT 
                id, domain, status, check_interval, 
                credits_per_check, last_checked
            FROM monitored_domains 
            WHERE user_id = ?`,
            [req.user.id]
        );

        // Add interval_label to each domain
        const domainsWithLabels = domains.map(domain => ({
            ...domain,
            interval: domain.check_interval,
            interval_label: formatIntervalLabel(domain.check_interval)
        }));

        res.json({
            domains: domainsWithLabels,
            user_info: {
                credits: req.user.credits,
                api_calls_count: req.user.api_calls_count,
                api_calls_limit: req.user.api_calls_limit
            }
        });
    } catch (error) {
        console.error('Get admin domains error:', error);
        res.status(500).json({ error: 'Failed to fetch domains' });
    }
};

exports.addAdminDomain = async (req, res) => {
    try {
        const { domain, check_interval = 60 } = req.body;

        // Insert new domain
        const [result] = await pool.execute(
            'INSERT INTO monitored_domains (user_id, domain, check_interval, credits_per_check) VALUES (?, ?, ?, ?)',
            [req.user.id, domain, check_interval, 1]
        );

        // Get the newly added domain
        const [domains] = await pool.execute(
            'SELECT * FROM monitored_domains WHERE id = ?',
            [result.insertId]
        );

        const newDomain = {
            ...domains[0],
            interval: domains[0].check_interval,
            interval_label: formatIntervalLabel(domains[0].check_interval)
        };

        res.json({
            message: 'Domain added successfully',
            domain: newDomain
        });
    } catch (error) {
        console.error('Add domain error:', error);
        res.status(500).json({ error: 'Failed to add domain' });
    }
};

exports.checkAdminDomain = async (req, res) => {
    try {
        const { domainId } = req.params;

        // Get domain info
        const [domains] = await pool.execute(
            'SELECT * FROM monitored_domains WHERE id = ? AND user_id = ?',
            [domainId, req.user.id]
        );

        if (domains.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        const domain = domains[0];

        // Check domain status using Skiddle API
        const response = await axios.get(CHECK_API_URL, {
            params: {
                domain: domain.domain,
                json: true
            },
            timeout: 10000
        });

        const result = response.data[domain.domain];
        const isBlocked = result?.blocked || false;

        // Update domain status
        await pool.execute(
            'UPDATE monitored_domains SET status = ?, last_checked = NOW() WHERE id = ?',
            [isBlocked, domainId]
        );

        // Deduct credits
        await pool.execute(
            'UPDATE users SET credits = credits - ? WHERE id = ?',
            [domain.credits_per_check, req.user.id]
        );

        // Add to history
        await pool.execute(
            'INSERT INTO domain_history (domain_id, status, credits_used) VALUES (?, ?, ?)',
            [domainId, isBlocked, domain.credits_per_check]
        );

        // Get updated domain list
        const [updatedDomains] = await pool.execute(
            `SELECT 
                d.*, u.credits, u.api_calls_count, u.api_calls_limit
            FROM monitored_domains d
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?`,
            [req.user.id]
        );

        // Add interval_label to updated domains
        const updatedDomainsWithLabels = updatedDomains.map(domain => ({
            ...domain,
            interval: domain.check_interval,
            interval_label: formatIntervalLabel(domain.check_interval)
        }));

        res.json({
            message: 'Domain checked successfully',
            domains: updatedDomainsWithLabels,
            user_info: {
                credits: req.user.credits,
                api_calls_count: req.user.api_calls_count,
                api_calls_limit: req.user.api_calls_limit
            }
        });
    } catch (error) {
        console.error('Check domain error:', error);
        res.status(500).json({ error: 'Failed to check domain' });
    }
};

exports.removeAdminDomain = async (req, res) => {
    try {
        const { domainId } = req.params;

        // Verify domain exists and belongs to admin
        const [domain] = await pool.execute(
            'SELECT id FROM monitored_domains WHERE id = ? AND user_id = ?',
            [domainId, req.user.id]
        );

        if (domain.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        // Remove domain
        await pool.execute(
            'DELETE FROM monitored_domains WHERE id = ?',
            [domainId]
        );

        res.json({ message: 'Domain removed successfully' });
    } catch (error) {
        console.error('Remove domain error:', error);
        res.status(500).json({ error: 'Failed to remove domain' });
    }
};
