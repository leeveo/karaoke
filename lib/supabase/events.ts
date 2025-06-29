import { Event, EventInput } from '@/types/event';
import { supabase } from './client';

// Récupérer tous les événements avec leur personnalisation
export async function fetchEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        customization: event_customizations (*)
      `)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as Event[];
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    // En cas d'erreur, retourner un tableau vide
    return [];
  }
}

// Récupérer un événement par ID
export async function fetchEventById(id: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      customization: event_customizations (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  const event = data as Event;

  // Après avoir récupéré l'événement et avant de le retourner, générer les URLs des assets
  if (event.customization) {
    // Traiter l'image de fond si elle existe
    if (event.customization.background_image) {
      const bgUrlResult = supabase.storage
        .from('karaokestorage')
        .getPublicUrl(`backgrounds/${event.customization.background_image}`);
      
      if (bgUrlResult.data?.publicUrl) {
        event.customization.backgroundImageUrl = bgUrlResult.data.publicUrl;
      }
    }
    
    // Traiter le logo si il existe
    if (event.customization.logo) {
      const logoUrlResult = supabase.storage
        .from('karaokestorage')
        .getPublicUrl(`logos/${event.customization.logo}`);
      
      if (logoUrlResult.data?.publicUrl) {
        event.customization.logoUrl = logoUrlResult.data.publicUrl;
        console.log("Logo URL generated:", event.customization.logoUrl);
      }
    }
  }
  
  return event;
}

// Créer un nouvel événement
export async function createEvent(eventData: EventInput & { user_id: string; description?: string; location?: string; is_active?: boolean }) {
  // Log pour vérifier ce qui est reçu
  console.log('[createEvent] eventData reçu:', eventData);

  if (!eventData.user_id) {
    throw new Error('user_id manquant ou null lors de la création de l\'événement');
  }

  const { name, date, user_id, description = null, location = null, is_active = true } = eventData;

  const { data, error } = await supabase
    .from('events')
    .insert([
      {
        name,
        date,
        description,
        location,
        user_id,
        is_active,
      }
    ])
    .single();

  if (error) {
    console.error('Database error creating event:', error.message);
    throw new Error('Erreur lors de la création: ' + error.message);
  }
  return data;
}

// Mettre à jour un événement
export async function updateEvent(id: string, eventData: EventInput): Promise<boolean> {
  try {
    console.log("Updating event with data:", JSON.stringify(eventData, null, 2));
    
    // Update the event record
    const { error: eventError } = await supabase
      .from('events')
      .update({
        name: eventData.name,
        date: eventData.date
      })
      .eq('id', id);

    if (eventError) {
      console.error("Error updating event:", eventError);
      throw eventError;
    }

    // Check if customization exists for this event
    const { data: existingCustomization, error: checkError } = await supabase
      .from('event_customizations')
      .select('*')
      .eq('event_id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking for existing customization:", checkError);
      throw checkError;
    }

    const customizationData = {
      event_id: id,
      primary_color: eventData.customization.primary_color,
      secondary_color: eventData.customization.secondary_color,
      background_image: eventData.customization.background_image || null,
      logo: eventData.customization.logo || null,
    };
    
    console.log("Customization data to save:", JSON.stringify(customizationData, null, 2));

    // Insert or update customization
    if (!existingCustomization) {
      // Insert new customization
      const { error: insertError } = await supabase
        .from('event_customizations')
        .insert(customizationData);

      if (insertError) {
        console.error("Error inserting customization:", insertError);
        throw insertError;
      }
    } else {
      // Update existing customization
      const { error: updateError } = await supabase
        .from('event_customizations')
        .update(customizationData)
        .eq('event_id', id);

      if (updateError) {
        console.error("Error updating customization:", updateError);
        throw updateError;
      }
    }

    console.log("Event and customization updated successfully");
    return true;
  } catch (error) {
    console.error('Error updating event:', error);
    return false;
  }
}

// Supprimer un événement
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Générer l'URL publique d'un événement
export function getEventPublicUrl(eventId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/event/${eventId}`;
  }

  return `/event/${eventId}`;
}