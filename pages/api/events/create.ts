import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Jamais côté client !
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { user_id, ...eventData } = req.body;
  const { data, error } = await supabase
    .from('events')
    .insert([{ ...eventData, user_id }])
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
}
