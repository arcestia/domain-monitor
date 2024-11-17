CREATE DATABASE IF NOT EXISTS domain_monitor;
USE domain_monitor;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    credits INT DEFAULT 100,
    api_token VARCHAR(255) NULL,
    api_calls_limit INT DEFAULT 1000,
    api_calls_count INT DEFAULT 0,
    api_calls_reset_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_email (email),
    UNIQUE INDEX idx_username (username),
    INDEX idx_role (role)
);

CREATE TABLE IF NOT EXISTS monitored_domains (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    status BOOLEAN DEFAULT FALSE,
    check_interval INT DEFAULT 3600,
    credits_per_check INT DEFAULT 1,
    last_checked TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_domain (user_id, domain),
    INDEX idx_last_checked (last_checked)
);

CREATE TABLE IF NOT EXISTS domain_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    domain_id INT NOT NULL,
    status BOOLEAN NOT NULL,
    credits_used INT NOT NULL DEFAULT 1,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES monitored_domains(id) ON DELETE CASCADE,
    INDEX idx_domain_checked (domain_id, checked_at)
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount INT NOT NULL,
    transaction_type ENUM('add', 'subtract') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
);

-- Insert default admin user
INSERT INTO users (
    username,
    email,
    password,
    role,
    credits,
    api_calls_limit,
    api_calls_count,
    is_active
) VALUES (
    'admin',
    'admin@example.com',
    '$2a$10$mQEWxoKJgN.dhiQp/ZKfkO5AY8FzHDkFHesOXYXjbEtGDMPvMu.Hy',
    'admin',
    999999,
    999999,
    0,
    true
) ON DUPLICATE KEY UPDATE
    role = 'admin',
    credits = 999999,
    api_calls_limit = 999999;
