import { Event, EventInput } from '@/types/event';
import { supabase } from './client';
import { DEFAULT_STYLE_PACK_ID } from '@/lib/stylePacks';

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
    return (data as Event[]).map((event) => ({
      ...event,
      customization: event.customization
        ? {
            ...event.customization,
            style_pack: event.customization.style_pack || DEFAULT_STYLE_PACK_ID,
          }
        : undefined,
    }));
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

  if (event.customization) {
    event.customization.style_pack = event.customization.style_pack || DEFAULT_STYLE_PACK_ID;
  }

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
      console.log("Processing logo for event:", id, "Logo filename:", event.customization.logo);
      const logoUrlResult = supabase.storage
        .from('karaokestorage')
        .getPublicUrl(`logos/${event.customization.logo}`);
      
      if (logoUrlResult.data?.publicUrl) {
        // Ajouter un timestamp pour forcer le rechargement en cas de mise à jour
        const cacheBuster = `?t=${Date.now()}`;
        event.customization.logoUrl = logoUrlResult.data.publicUrl + cacheBuster;
        console.log("Logo URL generated:", event.customization.logoUrl);
      } else {
        console.warn("Failed to generate logo URL for:", event.customization.logo);
      }
    } else {
      console.log("No logo configured for event:", id);
    }
  }
  
  return event;
}

// Créer un nouvel événement
export async function createEvent(eventData: EventInput): Promise<string | null> {
  try {
    console.log("Creating event with data:", JSON.stringify(eventData, null, 2));
    
    if (!eventData.user_id) {
      console.error("user_id is required to create an event");
      throw new Error('user_id is required');
    }
    
    // Create the event
    const { data: eventResult, error: eventError } = await supabase
      .from('events')
      .insert({
        name: eventData.name,
        date: eventData.date,
        user_id: eventData.user_id
      })
      .select('id')
      .single();

    if (eventError) {
      console.error("Error creating event:", eventError);
      throw eventError;
    }
    if (!eventResult?.id) {
      console.error("No event ID returned");
      throw new Error('No event ID returned');
    }

    const eventId = eventResult.id;
    console.log("Event created with ID:", eventId);

    // Create the customization with all fields
    const customizationData = {
      event_id: eventId,
      primary_color: eventData.customization.primary_color,
      secondary_color: eventData.customization.secondary_color,
      background_image: eventData.customization.background_image || null,
      logo: eventData.customization.logo || null,
      style_pack: eventData.customization.style_pack || DEFAULT_STYLE_PACK_ID,
    };
    
    console.log("Creating customization with data:", JSON.stringify(customizationData, null, 2));
    
    const { error: customizationError } = await supabase
      .from('event_customizations')
      .insert(customizationData);

    if (customizationError) {
      console.error("Error creating customization:", customizationError);
      throw customizationError;
    }

    console.log("Event customization created successfully");
    return eventId;
  } catch (error) {
    console.error('Error creating event:', error);
    return null;
  }
}

// Mettre à jour un événement
export async function updateEvent(id: string, eventData: EventInput): Promise<boolean> {
  try {
    console.log("updateEvent: Starting with ID:", id);
    console.log("updateEvent: Data to update:", JSON.stringify(eventData, null, 2));
    
    // First verify the event exists
    const { error: checkError } = await supabase
      .from('events')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error("updateEvent: Event not found:", checkError);
      throw new Error("Événement non trouvé");
    }

    console.log("updateEvent: Event exists, proceeding with update");
    
    // Update the event record
    const { data: eventUpdateResult, error: eventError } = await supabase
      .from('events')
      .update({
        name: eventData.name,
        date: eventData.date
      })
      .eq('id', id)
      .select();

    console.log("updateEvent: Event update result:", eventUpdateResult);
    
    if (eventError) {
      console.error("updateEvent: Error updating event:", eventError);
      throw eventError;
    }

    if (!eventUpdateResult || eventUpdateResult.length === 0) {
      console.error("updateEvent: Event update returned no results");
      throw new Error("Impossible de mettre à jour l'événement");
    }

    // Check if customization exists for this event
    const { data: existingCustomization, error: checkCustomError } = await supabase
      .from('event_customizations')
      .select('*')
      .eq('event_id', id)
      .single();

    console.log("updateEvent: Existing customization:", existingCustomization);
    
    if (checkCustomError && checkCustomError.code !== 'PGRST116') {
      console.error("updateEvent: Error checking customization:", checkCustomError);
      // Continue anyway, we'll try to insert
    }

    const customizationData = {
      event_id: id,
      primary_color: eventData.customization.primary_color,
      secondary_color: eventData.customization.secondary_color,
      background_image: eventData.customization.background_image || null,
      logo: eventData.customization.logo || null,
      style_pack: eventData.customization.style_pack || DEFAULT_STYLE_PACK_ID,
    };
    
    console.log("updateEvent: Customization data to save:", JSON.stringify(customizationData, null, 2));

    // Use upsert for reliability
    const { data: customResult, error: customError } = await supabase
      .from('event_customizations')
      .upsert(customizationData, { onConflict: 'event_id' })
      .select();

    console.log("updateEvent: Customization upsert result:", customResult);
    
    if (customError) {
      console.error("updateEvent: Error upserting customization:", customError);
      throw customError;
    }

    console.log("updateEvent: Event and customization updated successfully");
    return true;
  } catch (error) {
    console.error('updateEvent: Error:', error);
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
  // Utiliser l'URL de base de l'application pour créer l'URL complète
  const baseUrl = window.location.origin;
  return `${baseUrl}/event/${eventId}`;
}
