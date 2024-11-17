const pool = require('../config/db');
const axios = require('axios');

const CHECK_API_URL = 'https://check.skiddle.id/';
const BATCH_SIZE = 30; // API recommends max 30 domains per request

// Valid check intervals in seconds
const VALID_INTERVALS = {
    '5min': 300,
    '10min': 600,
    '15min': 900,
    '30min': 1800,
    '1hour': 3600,
    '2hours': 7200,
    '6hours': 21600,
    '12hours': 43200,
    '24hours': 86400
};

exports.getAllDomains = async (req, res) => {
    try {
        const [domains] = await pool.execute(
            `SELECT 
                d.*,
                u.credits,
                u.api_calls_count,
                u.api_calls_limit,
                u.api_token
            FROM monitored_domains d
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?`,
            [req.user.id]
        );

        // If no domains exist yet, get user info directly
        let userInfo;
        if (domains.length === 0) {
            const [users] = await pool.execute(
                'SELECT credits, api_calls_count, api_calls_limit, api_token FROM users WHERE id = ?',
                [req.user.id]
            );
            userInfo = users[0];
        } else {
            userInfo = {
                credits: domains[0].credits,
                api_calls_count: domains[0].api_calls_count,
                api_calls_limit: domains[0].api_calls_limit,
                api_token: domains[0].api_token
            };
        }

        // Convert interval seconds to human-readable format
        const formattedDomains = domains.map(domain => ({
            ...domain,
            interval_label: Object.entries(VALID_INTERVALS).find(([_, value]) => value === domain.check_interval)?.[0] || '1hour'
        }));

        res.json({
            domains: formattedDomains,
            user_info: userInfo,
            valid_intervals: Object.entries(VALID_INTERVALS).map(([label, seconds]) => ({
                label,
                value: seconds
            }))
        });
    } catch (error) {
        console.error('Get domains error:', error);
        res.status(500).json({ error: 'Failed to get domains' });
    }
};

exports.addDomain = async (req, res) => {
    try {
        const { domain, checkInterval = '1hour' } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        // Convert interval to seconds
        const intervalSeconds = VALID_INTERVALS[checkInterval];
        if (!intervalSeconds) {
            return res.status(400).json({ 
                error: 'Invalid check interval',
                valid_intervals: Object.keys(VALID_INTERVALS)
            });
        }

        // Check if domain already exists for this user
        const [existingDomains] = await pool.execute(
            'SELECT * FROM monitored_domains WHERE user_id = ? AND domain = ?',
            [userId, domain]
        );

        if (existingDomains.length > 0) {
            return res.status(400).json({ error: 'Domain already being monitored' });
        }

        // Calculate credits needed per check
        const creditsPerCheck = 1;

        // Insert domain
        await pool.execute(
            `INSERT INTO monitored_domains (
                user_id, 
                domain, 
                check_interval,
                credits_per_check
            ) VALUES (?, ?, ?, ?)`,
            [userId, domain, intervalSeconds, creditsPerCheck]
        );

        // Deduct initial credit
        await pool.execute(
            'UPDATE users SET credits = credits - ? WHERE id = ?',
            [creditsPerCheck, userId]
        );

        // Get updated user info and domains
        const [domains] = await pool.execute(
            `SELECT 
                d.*,
                u.credits,
                u.api_calls_count,
                u.api_calls_limit,
                u.api_token
            FROM monitored_domains d
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?`,
            [userId]
        );

        // Convert interval seconds to human-readable format
        const formattedDomains = domains.map(domain => ({
            ...domain,
            interval_label: Object.entries(VALID_INTERVALS).find(([_, value]) => value === domain.check_interval)?.[0] || '1hour'
        }));

        res.json({
            message: 'Domain added successfully',
            domains: formattedDomains,
            user_info: {
                credits: domains[0]?.credits || 0,
                api_calls_count: domains[0]?.api_calls_count || 0,
                api_calls_limit: domains[0]?.api_calls_limit || 0,
                api_token: domains[0]?.api_token
            }
        });
    } catch (error) {
        console.error('Add domain error:', error);
        res.status(500).json({ error: 'Failed to add domain' });
    }
};

exports.removeDomain = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if domain exists and belongs to user
        const [domains] = await pool.execute(
            'SELECT * FROM monitored_domains WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (domains.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        // Delete domain
        await pool.execute(
            'DELETE FROM monitored_domains WHERE id = ?',
            [id]
        );

        // Get updated user info and domains
        const [updatedDomains] = await pool.execute(
            `SELECT 
                d.*,
                u.credits,
                u.api_calls_count,
                u.api_calls_limit,
                u.api_token
            FROM monitored_domains d
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?`,
            [userId]
        );

        // If no domains left, get user info directly
        let userInfo;
        if (updatedDomains.length === 0) {
            const [users] = await pool.execute(
                'SELECT credits, api_calls_count, api_calls_limit, api_token FROM users WHERE id = ?',
                [userId]
            );
            userInfo = users[0];
        } else {
            userInfo = {
                credits: updatedDomains[0].credits,
                api_calls_count: updatedDomains[0].api_calls_count,
                api_calls_limit: updatedDomains[0].api_calls_limit,
                api_token: updatedDomains[0].api_token
            };
        }

        res.json({
            message: 'Domain removed successfully',
            domains: updatedDomains,
            user_info: userInfo
        });
    } catch (error) {
        console.error('Remove domain error:', error);
        res.status(500).json({ error: 'Failed to remove domain' });
    }
};

exports.checkDomain = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if domain exists and belongs to user
        const [domains] = await pool.execute(
            'SELECT * FROM monitored_domains WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (domains.length === 0) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        const domain = domains[0];

        // Perform domain check
        const isBlocked = await checkDomainStatus(domain.domain);

        // Update domain status
        await pool.execute(
            'UPDATE monitored_domains SET status = ?, last_checked = NOW() WHERE id = ?',
            [isBlocked, id]
        );

        // Deduct credits
        await pool.execute(
            'UPDATE users SET credits = credits - ? WHERE id = ?',
            [domain.credits_per_check, userId]
        );

        // Get updated user info and domains
        const [updatedDomains] = await pool.execute(
            `SELECT 
                d.*,
                u.credits,
                u.api_calls_count,
                u.api_calls_limit,
                u.api_token
            FROM monitored_domains d
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?`,
            [userId]
        );

        res.json({
            message: 'Domain checked successfully',
            domains: updatedDomains,
            user_info: {
                credits: updatedDomains[0]?.credits || 0,
                api_calls_count: updatedDomains[0]?.api_calls_count || 0,
                api_calls_limit: updatedDomains[0]?.api_calls_limit || 0,
                api_token: updatedDomains[0]?.api_token
            }
        });
    } catch (error) {
        console.error('Check domain error:', error);
        res.status(500).json({ error: 'Failed to check domain' });
    }
};

// Background domain checking process
exports.checkDomains = async () => {
    try {
        // Get domains that need checking
        const [domains] = await pool.execute(`
            SELECT d.*, u.credits 
            FROM monitored_domains d
            JOIN users u ON d.user_id = u.id
            WHERE 
                (last_checked IS NULL OR 
                TIMESTAMPDIFF(SECOND, last_checked, NOW()) >= check_interval)
                AND u.credits >= d.credits_per_check
        `);

        // Process domains in batches
        for (let i = 0; i < domains.length; i += BATCH_SIZE) {
            const batch = domains.slice(i, i + BATCH_SIZE);
            
            try {
                // Get domains list for batch request
                const domainsList = batch.map(d => d.domain).join(',');
                
                // Check domains status
                const response = await axios.get(CHECK_API_URL, {
                    params: {
                        domains: domainsList,
                        json: true
                    },
                    timeout: 10000
                });

                // Process each domain in the batch
                for (const domain of batch) {
                    try {
                        const result = response.data[domain.domain];
                        const isBlocked = result?.blocked || false;

                        // Update domain status and last checked time
                        await pool.execute(
                            'UPDATE monitored_domains SET status = ?, last_checked = NOW() WHERE id = ?',
                            [isBlocked, domain.id]
                        );

                        // Deduct credits
                        await pool.execute(
                            'UPDATE users SET credits = credits - ? WHERE id = ?',
                            [domain.credits_per_check, domain.user_id]
                        );

                        // Add to history
                        await pool.execute(
                            'INSERT INTO domain_history (domain_id, status, credits_used) VALUES (?, ?, ?)',
                            [domain.id, isBlocked, domain.credits_per_check]
                        );

                        console.log(`Checked domain ${domain.domain}: ${isBlocked ? 'Blocked' : 'Not blocked'}`);
                    } catch (error) {
                        console.error(`Failed to process domain ${domain.domain}:`, error);
                    }
                }
            } catch (error) {
                console.error(`Failed to check batch of domains:`, error);
            }

            // Add a small delay between batches to prevent rate limiting
            if (i + BATCH_SIZE < domains.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error('Background domain check error:', error);
    }
};

async function checkDomainStatus(domain) {
    try {
        // Call the Skiddle API with JSON output
        const response = await axios.get(CHECK_API_URL, {
            params: {
                domain: domain,
                json: true
            },
            timeout: 10000
        });

        // The API returns { "domain.com": { "blocked": true/false } }
        const result = response.data[domain];
        return result?.blocked || false;
    } catch (error) {
        console.error(`Error checking domain ${domain}:`, error);
        // In case of API error, return false (not blocked) as default
        return false;
    }
}
