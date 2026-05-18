-- Migrate existing users: rename assistant "Perchita" → "MANGO AI"
UPDATE profiles SET asistente_nombre = 'MANGO AI' WHERE asistente_nombre = 'Perchita';

-- Default for new rows going forward
ALTER TABLE profiles ALTER COLUMN asistente_nombre SET DEFAULT 'MANGO AI';
