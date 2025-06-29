-- Supprime la policy existante avant de la recréer si besoin
DROP POLICY IF EXISTS "Allow insert for authenticated user" ON events;

-- Puis recrée la policy si tu veux la modifier
-- CREATE POLICY ... (ta nouvelle policy ici)
