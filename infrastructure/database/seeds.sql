-- Seed tenant
INSERT INTO tenants (name, api_key, owner_email)
VALUES (
  'BudgetApp',
  'sk_dev_budgetapp_1234567890abcdef',
  'admin@budgetapp.com'
);

-- Test Users (verified)
INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    first_name,
    last_name, 
    email_verified, 
    terms_accepted, 
    terms_accepted_at
) VALUES (
    (SELECT id FROM tenants WHERE api_key = 'sk_dev_budgetapp_1234567890abcdef'),
    'john@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ND/qhzU6H.CO',
    'John',
    'Doe',
    TRUE,
    TRUE,
    NOW()
);

-- Test Users (unverified)
INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    first_name,
    last_name,
    email_verified,
    terms_accepted,
    terms_accepted_at
) VALUES (
    (SELECT id FROM tenants WHERE api_key = 'sk_dev_budgetapp_1234567890abcdef'),
    'jane@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ND/qhzU6H.CO',
    'Jane',
    'Doe',
    FALSE,
    TRUE,
    NOW()
);

-- Sample audit log
INSERT INTO audit_logs (
    user_id,
    action,
    ip_address,
    metadata
) VALUES (
    (SELECT id FROM users WHERE email = 'john@example.com'),
    'register',
    '127.0.0.1',
    '{"method": "email"}'
);