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

// Fix createEvent function to match Event type requirements
export function createEvent(eventInput: EventInput): string {
  const newId = Math.random().toString(36).substring(2, 15);
  
  const newEvent = {
    id: newId,
    name: eventInput.name,
    date: eventInput.date,
    location: '', // Add missing required property
    created_at: new Date().toISOString(),
    user_id: 'user123',
    is_active: true,
    customization: {
      event_id: newId,
      primary_color: eventInput.customization?.primary_color || '#0334b9',
      secondary_color: eventInput.customization?.secondary_color || '#2fb9db',
      background_image: eventInput.customization?.background_image || '',
      logo: '', // Add logo property as it might be required
    },
  };
  
  mockEvents.push(newEvent as Event); // Cast to Event type to ensure compatibility
  return newId;
}

export async function updateEvent(id: string, eventInput: EventInput): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 600));
  const eventIndex = mockEvents.findIndex(e => e.id === id);
  if (eventIndex === -1) {
    throw new Error('Event not found');
  }
  
  // In the updateEvent function
  const updatedEvent = {
    ...mockEvents[eventIndex],
    name: eventInput.name,
    date: eventInput.date,
    is_active: true,
    customization: {
      event_id: id,
      // Access properties through the customization object
      primary_color: eventInput.customization?.primary_color || '#0334b9',
      secondary_color: eventInput.customization?.secondary_color || '#2fb9db',
      background_image: eventInput.customization?.background_image || null,
    },
  };

  mockEvents[eventIndex] = updatedEvent;
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
