-- Create demo user in PostgreSQL
INSERT INTO "User" (id, email, password)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@example.com', NULL)
ON CONFLICT (id) DO NOTHING;