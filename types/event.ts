export interface EventCustomization {
  id?: string;
  event_id?: string;
  primary_color: string;
  secondary_color: string;
  background_image?: string | null;
  backgroundImageUrl?: string; // URL complète générée
  logo?: string | null; // Champ pour le logo
  logoUrl?: string; // URL complète générée
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  date: string;
  location: string;
  created_at: string;
  user_id: string;
  is_active: boolean;
  customization?: EventCustomization;
}

export interface EventInput {
  name: string;
  date: string;
  customization: {
    primary_color: string;
    secondary_color: string;
    background_image?: string | null;
    logo?: string | null;
  };
}
