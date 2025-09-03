-- PostgreSQL initialization script
-- This script runs when the Docker container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional crypto functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set default encoding
SET client_encoding = 'UTF8';

-- Create custom types if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_role') THEN
        CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system', 'tool');
    END IF;
END $$;

-- Grant all privileges to the dev user
GRANT ALL PRIVILEGES ON DATABASE chatbot_dev TO dev_user;

-- Set search path
ALTER DATABASE chatbot_dev SET search_path TO public;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
END $$;