'use client';

import React, { useState, useEffect } from 'react';
import { EventInput } from '@/types/event';
import { supabase } from '@/lib/supabase/client';
import ColorPicker from '../ui/ColorPicker';
import TemplateSelector from './TemplateSelector';
import { fetchTemplates } from '@/lib/supabase/templates';
import Image from 'next/image';
import { Template } from '@/types/template'; // Ajout de l'import du type Template

interface EventFormProps {
  onSubmit: (data: EventInput) => void;
  initialData?: EventInput;
}

const EventForm: React.FC<EventFormProps> = ({ onSubmit, initialData }) => {
  // Form state
  const [formValues, setFormValues] = useState<EventInput>(
    initialData
      ? {
          ...initialData,
          // Correction : s'assurer que la date est toujours au format "yyyy-MM-dd" pour l'input type="date"
          date:
            initialData.date && initialData.date.length > 10
              ? initialData.date.substring(0, 10)
              : initialData.date,
        }
      : {
          name: '',
          date: new Date().toISOString().split('T')[0],
          customization: {
            primary_color: '#0334b9',
            secondary_color: '#2fb9db',
            background_image: '',
            logo: '',
          },
        }
  );
  
  // UI state
  const [formError, setFormError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]); // Typage explicite du state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Load templates on component mount
  useEffect(() => {
    async function loadTemplates() {
      try {
        const templatesData = await fetchTemplates();
        setTemplates(templatesData);
      } catch {
        // Removed unused 'error'
        console.error("Error loading templates");
      }
    }
    
    loadTemplates();
  }, []);

  // Initialiser les prévisualisations d'images si on est en mode édition
  useEffect(() => {
    if (initialData) {
      // Vérifier si on a une image de fond
      if (initialData.customization?.background_image) {
        if (initialData.customization.background_image.startsWith('http')) {
          setBackgroundPreview(initialData.customization.background_image);
        } else {
          const { data } = supabase.storage
            .from('karaokestorage')
            .getPublicUrl(`backgrounds_users/${initialData.customization.background_image}`);
          if (data?.publicUrl) {
            setBackgroundPreview(data.publicUrl);
          }
        }
      }

      // Vérifier si on a un logo
      if (initialData.customization?.logo) {
        // Correction stricte : si c'est déjà une URL, on l'utilise telle quelle
        if (initialData.customization.logo.startsWith('http')) {
          setLogoPreview(initialData.customization.logo);
        } else {
          // Sinon, on construit l'URL S3 directement
          setLogoPreview(`https://leeveostockage.s3.eu-west-3.amazonaws.com/karaoke_users/${initialData.customization.logo}`);
        }
      }
    }
  }, [initialData]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle color changes
  const handleColorChange = (color: string, type: 'primary_color' | 'secondary_color') => {
    setFormValues(prev => ({
      ...prev,
      customization: {
        ...prev.customization,
        [type]: color
      }
    }));
  };

  // Handle background image upload
  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setFormError("L'image de fond ne doit pas dépasser 2MB");
      return;
    }

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setBackgroundPreview(previewUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Ajoute l'id du projet dans le nom du fichier (si dispo)
      // Correction : éviter 'any', on utilise une assertion d'objet partiel typé
      const projectId =
        (formValues as Partial<{ id?: string; projectId?: string }>).id ||
        (formValues as Partial<{ id?: string; projectId?: string }>).projectId ||
        'nouveau';
      formData.append('projectId', projectId);

      // Utilise la route App Router
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        setFormError("Erreur lors de l'upload de l'image de fond (API non trouvée ou erreur serveur)");
        return;
      }

      const { url } = await res.json();

      setBackgroundPreview(url);
      setFormValues({
        ...formValues,
        customization: {
          ...formValues.customization,
          background_image: url, // Écrase l'image de fond du template si upload
        }
      });
    } catch {
      // Removed unused 'error'
      setFormError("Erreur lors de l'upload de l'image de fond");
    }
  };

  // Handle logo upload
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setFormError("Le logo ne doit pas dépasser 2MB");
      return;
    }

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Ajoute l'id du projet dans le nom du fichier (si dispo)
      // Utilise l'id du projet ou un timestamp si pas encore créé
      const projectId = formValues.id || formValues.projectId || 'nouveau';
      formData.append('projectId', projectId);

      // Utilise la même API d'upload S3
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        setFormError("Erreur lors de l'upload du logo (API non trouvée ou erreur serveur)");
        return;
      }

      const { url } = await res.json();

      setLogoPreview(url);
      setFormValues({
        ...formValues,
        customization: {
          ...formValues.customization,
          logo: url,
        }
      });
    } catch {
      // Removed unused 'error'
      setFormError("Erreur lors de l'upload du logo");
    }
  };

  // Apply a template to the form
  const handleTemplateSelect = (template) => {
    if (!template) return;

    setSelectedTemplate(template);

    // Si le template a une image de fond, on l'utilise comme valeur du champ background_image
    // On suppose que template.background_image est une URL S3 ou un nom de fichier
    const backgroundImageUrl = template.background_image;
    // Si ce n'est pas une URL, on peut éventuellement construire l'URL S3 ici si besoin
    if (backgroundImageUrl && !backgroundImageUrl.startsWith('http')) {
      // Si tu veux forcer l'URL S3, décommente et adapte la ligne suivante :
      // backgroundImageUrl = `https://leeveostockage.s3.eu-west-3.amazonaws.com/karaoke_users/bg_${backgroundImageUrl}`;
    }

    setFormValues({
      ...formValues,
      customization: {
        ...formValues.customization,
        primary_color: template.primary_color,
        secondary_color: template.secondary_color,
        background_image: backgroundImageUrl // Écrase l'image de fond actuelle
      }
    });

    // Affiche la preview de l'image de fond du template
    if (backgroundImageUrl) {
      setBackgroundPreview(backgroundImageUrl);
    }
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValues.name.trim()) {
      setFormError("Le nom de l'événement est requis");
      return;
    }

    // Correction stricte du format date (YYYY-MM-DD)
    let date = formValues.date;
    if (date) {
      // Si la date contient un "T", on ne garde que la partie avant
      if (date.includes('T')) {
        date = date.split('T')[0];
      }
      // Si la date contient des heures ou des secondes, on ne garde que les 10 premiers caractères
      if (date.length > 10) {
        date = date.substring(0, 10);
      }
    }

    const dataToSubmit = {
      ...formValues,
      date, // toujours au format "YYYY-MM-DD"
      customization: {
        primary_color: formValues.customization.primary_color,
        secondary_color: formValues.customization.secondary_color,
        background_image: formValues.customization.background_image || null,
        logo: formValues.customization.logo || null
      }
    };

    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 max-w-8xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Informations événement</h2>
      <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Personnalisez votre expérience karaoké</h3>
        <p className="text-blue-700">Ajoutez des couleurs, des images et des éléments de style pour créer une expérience unique pour votre événement.</p>
      </div>

      {formError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-gray-700 font-medium mb-2">Nom Evénement *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formValues.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: Soirée Karaoké Entreprise"
            required
          />
        </div>
        
        <div>
          <label htmlFor="date" className="block text-gray-700 font-medium mb-2">Date Evénement *</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formValues.date}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      {/* Templates Section */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Choisir un template</h3>
        <p className="text-gray-600 mb-4">Sélectionnez un template préconçu ou personnalisez entièrement votre événement.</p>
        
        <TemplateSelector
          templates={templates}
          onSelect={handleTemplateSelect}
          selectedTemplate={selectedTemplate}
        />
      </div>

      {/* Customization Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Color Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Couleurs</h3>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Couleur primaire</label>
            <ColorPicker 
              color={formValues.customization.primary_color}
              onChange={(color) => handleColorChange(color, 'primary_color')}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Couleur secondaire</label>
            <ColorPicker 
              color={formValues.customization.secondary_color}
              onChange={(color) => handleColorChange(color, 'secondary_color')}
            />
          </div>
        </div>
        
        {/* Background Image Upload */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Image de fond</h3>
          
          {backgroundPreview && (
            <div className="mb-4">
              <div className="relative w-full h-40 bg-gray-200 rounded-lg overflow-hidden">
                {/* Option 1: Using unoptimized Image */}
                <Image 
                  src={backgroundPreview} 
                  alt="Background preview" 
                  className="object-cover" 
                  fill 
                  unoptimized
                />
                {/* Option 2: If still having issues, comment out the Image component above and uncomment this:
                <img 
                  src={backgroundPreview} 
                  alt="Background preview" 
                  className="w-full h-full object-cover" 
                />
                */}
                <button
                  type="button"
                  onClick={() => {
                    setBackgroundPreview(null);
                    setFormValues({...formValues, customization: {...formValues.customization, background_image: ''}});
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 z-10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex justify-center">
            <label className="flex flex-col items-center px-4 py-6 bg-white text-blue-500 rounded-lg shadow-lg tracking-wide border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white">
              <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
              </svg>
              <span className="mt-2 text-sm">Sélectionner une image</span>
              <input 
                type='file'
                accept="image/*"
                className="hidden"
                onChange={handleBackgroundChange}
              />
            </label>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>Format recommandé: 1920x1080px (16:9)</p>
            <p>Taille maximale: 2MB</p>
          </div>
        </div>
      </div>

      {/* Logo Upload Section */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Logo de l&apos;événement</h3>
        
        {/* Preview du logo */}
        {logoPreview && (
          <div className="mb-4">
            <div className="relative w-48 h-48 mx-auto bg-white rounded-lg shadow-md p-2 border border-gray-200">
              <Image 
                src={logoPreview} 
                alt="Logo preview" 
                className="object-contain" 
                fill
                unoptimized
              />
              <button
                type="button"
                onClick={() => {
                  setLogoPreview(null);
                  setFormValues({...formValues, customization: {...formValues.customization, logo: ''}});
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 z-10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Upload du logo */}
        <div className="flex justify-center">
          <label className="flex flex-col items-center px-4 py-6 bg-white text-blue-500 rounded-lg shadow-lg tracking-wide border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white">
            <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
            </svg>
            <span className="mt-2 text-sm">Sélectionner un logo</span>
            <input 
              type='file'
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </label>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>Formats recommandés: PNG ou JPG avec fond transparent</p>
          <p>Taille maximale: 2MB</p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end mt-8">
        <button
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
        >
          Créer un événement
        </button>
      </div>
    </form>
  );
};

export default EventForm;
