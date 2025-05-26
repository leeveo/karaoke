-- Script pour créer la table templates

-- Création de la table templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  background_image TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte pour s'assurer que les couleurs sont au format hexadécimal
  CONSTRAINT valid_primary_color CHECK (primary_color ~* '^#([A-Fa-f0-9]{6})$'),
  CONSTRAINT valid_secondary_color CHECK (secondary_color ~* '^#([A-Fa-f0-9]{6})$')
);

-- Ajouter des commentaires pour la documentation
COMMENT ON TABLE templates IS 'Table stockant les templates prédéfinis pour la personnalisation des événements';
COMMENT ON COLUMN templates.id IS 'Identifiant unique du template';
COMMENT ON COLUMN templates.name IS 'Nom du template';
COMMENT ON COLUMN templates.description IS 'Description du template';
COMMENT ON COLUMN templates.background_image IS 'Nom du fichier image de fond stocké dans le bucket karaokestorage/backgrounds';
COMMENT ON COLUMN templates.primary_color IS 'Couleur primaire au format hexadécimal (ex: #FF5500)';
COMMENT ON COLUMN templates.secondary_color IS 'Couleur secondaire au format hexadécimal (ex: #00AAFF)';
COMMENT ON COLUMN templates.thumbnail IS 'Nom du fichier miniature pour l''aperçu (facultatif)';
COMMENT ON COLUMN templates.created_at IS 'Date de création du template';

-- Insertion des templates par défaut
INSERT INTO templates (name, description, background_image, primary_color, secondary_color)
VALUES 
  ('Nuit étoilée', 'Ambiance nocturne élégante', 'starry-night.jpg', '#1a237e', '#4fc3f7'),
  ('Fête tropicale', 'Couleurs vives et exotiques', 'tropical-party.jpg', '#00695c', '#ffab40'),
  ('Néon rétro', 'Style années 80 avec néons', 'retro-neon.jpg', '#6a1b9a', '#00e5ff'),
  ('Élégance dorée', 'Thème luxueux et sophistiqué', 'gold-elegance.jpg', '#4e342e', '#ffd54f');

-- Ajouter des permissions RLS (Row Level Security)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Créer des politiques pour contrôler l'accès
CREATE POLICY "Les templates sont visibles par tous les utilisateurs"
  ON templates FOR SELECT
  USING (true);
  
CREATE POLICY "Seuls les administrateurs peuvent modifier les templates"
  ON templates FOR ALL
  USING (auth.role() = 'authenticated' AND auth.email() IN ('votre-email-admin@exemple.com'));
