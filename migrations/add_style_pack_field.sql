ALTER TABLE public.event_customizations
ADD COLUMN IF NOT EXISTS style_pack text DEFAULT 'classic';

UPDATE public.event_customizations
SET style_pack = COALESCE(style_pack, 'classic');
