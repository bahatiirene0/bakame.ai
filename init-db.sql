-- Initialize databases for Bakame AI
-- This runs when PostgreSQL container starts for the first time

-- Create n8n database
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE bakame TO bakame;
GRANT ALL PRIVILEGES ON DATABASE n8n TO bakame;
