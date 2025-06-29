-- Active RLS si ce n'est pas déjà fait
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Supprime toutes les policies existantes sur events
DROP POLICY IF EXISTS "Allow insert for anyone" ON events;
DROP POLICY IF EXISTS "Allow insert for authenticated user" ON events;
DROP POLICY IF EXISTS "Allow select for owner" ON events;
DROP POLICY IF EXISTS "Allow update for owner" ON events;
DROP POLICY IF EXISTS "Allow delete for owner" ON events;

-- Policy la plus ouverte possible pour autoriser l'insertion depuis le client
CREATE POLICY "Allow insert for anyone" ON events
FOR INSERT
WITH CHECK (true);

-- (Optionnel) Policy pour SELECT si tu veux lire les events
CREATE POLICY "Allow select for anyone" ON events
FOR SELECT
USING (true);
