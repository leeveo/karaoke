-- ========================================
-- RLS Policies pour les tables events et event_customizations
-- ========================================

-- ===== TABLE: events =====

-- Policy: Allow users to SELECT their own events
CREATE POLICY "Users can view their own events"
ON public.events
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow users to INSERT their own events
CREATE POLICY "Users can create events"
ON public.events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to UPDATE their own events
CREATE POLICY "Users can update their own events"
ON public.events
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to DELETE their own events
CREATE POLICY "Users can delete their own events"
ON public.events
FOR DELETE
USING (auth.uid() = user_id);

-- ===== TABLE: event_customizations =====

-- Policy: Allow users to SELECT customizations of their events
CREATE POLICY "Users can view customizations of their events"
ON public.event_customizations
FOR SELECT
USING (
  event_id IN (
    SELECT id FROM public.events WHERE user_id = auth.uid()
  )
);

-- Policy: Allow users to INSERT customizations for their events
CREATE POLICY "Users can create customizations for their events"
ON public.event_customizations
FOR INSERT
WITH CHECK (
  event_id IN (
    SELECT id FROM public.events WHERE user_id = auth.uid()
  )
);

-- Policy: Allow users to UPDATE customizations of their events
CREATE POLICY "Users can update customizations of their events"
ON public.event_customizations
FOR UPDATE
USING (
  event_id IN (
    SELECT id FROM public.events WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  event_id IN (
    SELECT id FROM public.events WHERE user_id = auth.uid()
  )
);

-- Policy: Allow users to DELETE customizations of their events
CREATE POLICY "Users can delete customizations of their events"
ON public.event_customizations
FOR DELETE
USING (
  event_id IN (
    SELECT id FROM public.events WHERE user_id = auth.uid()
  )
);

-- ===== Enable RLS on both tables =====

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_customizations ENABLE ROW LEVEL SECURITY;
