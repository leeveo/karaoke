import { v4 as uuidv4 } from 'uuid';
import { Event, EventInput } from '@/types/event';

// Données fictives pour les événements
const mockEvents: Event[] = [
  {
    id: '1',
    name: 'Soirée Karaoké au Club Melody',
    description: 'Venez chanter vos tubes préférés dans une ambiance festive!',
    date: '2023-12-20T19:00:00',
    location: 'Club Melody, 15 rue des Artistes',
    created_at: '2023-11-10T10:30:00',
    user_id: 'user123',
    is_active: true,
    customization: {
      event_id: '1',
      primary_color: '#FF5733',
      secondary_color: '#3498DB',
      background_image: 'https://picsum.photos/1920/1080?random=1',
    },
  },
  {
    id: '2',
    name: 'Karaoké de Noël',
    description: 'Spécial chansons de Noël et ambiance festive!',
    date: '2023-12-24T18:00:00',
    location: 'Salle des fêtes municipale',
    created_at: '2023-11-15T14:20:00',
    user_id: 'user123',
    is_active: true,
    customization: {
      event_id: '2',
      primary_color: '#E74C3C',
      secondary_color: '#2ECC71',
      background_image: 'https://picsum.photos/1920/1080?random=2',
    },
  },
];

// Mock functions pour simuler l'API Supabase
export async function fetchEvents(): Promise<Event[]> {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockEvents];
}

export async function fetchEventById(id: string): Promise<Event> {
  await new Promise(resolve => setTimeout(resolve, 300));
  const event = mockEvents.find(e => e.id === id);
  if (!event) {
    throw new Error('Event not found');
  }
  return { ...event };
}

export async function createEvent(eventInput: EventInput): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 800));
  const newId = uuidv4();
  const newEvent: Event = {
    id: newId,
    name: eventInput.name,
    description: eventInput.description,
    date: eventInput.date,
    location: eventInput.location,
    created_at: new Date().toISOString(),
    user_id: 'user123',
    is_active: eventInput.is_active,
    customization: {
      event_id: newId,
      primary_color: eventInput.primary_color,
      secondary_color: eventInput.secondary_color,
      background_image: eventInput.background_image,
    },
  };
  mockEvents.push(newEvent);
  return newId;
}

export async function updateEvent(id: string, eventInput: EventInput): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 600));
  const eventIndex = mockEvents.findIndex(e => e.id === id);
  if (eventIndex === -1) {
    throw new Error('Event not found');
  }
  
  mockEvents[eventIndex] = {
    ...mockEvents[eventIndex],
    name: eventInput.name,
    description: eventInput.description,
    date: eventInput.date,
    location: eventInput.location,
    is_active: eventInput.is_active,
    customization: {
      event_id: id,
      primary_color: eventInput.primary_color,
      secondary_color: eventInput.secondary_color,
      background_image: eventInput.background_image,
    },
  };
}

export async function deleteEvent(id: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 400));
  const eventIndex = mockEvents.findIndex(e => e.id === id);
  if (eventIndex === -1) {
    throw new Error('Event not found');
  }
  mockEvents.splice(eventIndex, 1);
}

export async function uploadEventImage(file: File): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Use the file parameter to create a more consistent mock URL
  const fileId = file.name.replace(/\s+/g, '-').toLowerCase();
  return `https://picsum.photos/1920/1080?random=${fileId}`;
}
