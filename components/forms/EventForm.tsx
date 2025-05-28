'use client';

import React, { useState, useEffect } from 'react';
import { EventInput } from '@/types/event';
import { supabase } from '@/lib/supabase/client';
import ColorPicker from '../ui/ColorPicker';
import TemplateSelector from './TemplateSelector';
import { fetchTemplates } from '@/lib/supabase/templates';
import Image from 'next/image';

interface EventFormProps {
  onSubmit: (data: EventInput) => void;
  initialData?: EventInput;
}

const EventForm: React.FC<EventFormProps> = ({ onSubmit, initialData }) => {
  // Form state
  const [formValues, setFormValues] = useState<EventInput>(
    initialData || {
      name: '',
      date: new Date().toISOString().split('T')[0],
      customization: {
        primary_color: '#0334b9',
        secondary_color: '#2fb9db',
        background_image: '',
        logo: '',
      }
    }
  );
  
  // UI state
  const [formError, setFormError] = useState<string | null>(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Load templates on component mount
  useEffect(() => {
    async function loadTemplates() {
      try {
        const templatesData = await fetchTemplates();
        setTemplates(templatesData);
      } catch (error) {
        console.error("Error loading templates:", error);
      }
    }
    
    loadTemplates();
  }, []);

  // Initialiser les prévisualisations d'images si on est en mode édition
  useEffect(() => {
    if (initialData) {
      // Vérifier si on a une image de fond
      if (initialData.customization?.background_image) {
        // Générer l'URL pour la prévisualisation
        const { data } = supabase.storage
          .from('karaokestorage')
          .getPublicUrl(`backgrounds/${initialData.customization.background_image}`);
          
        if (data?.publicUrl) {
          setBackgroundPreview(data.publicUrl);
        }
      }
      
      // Vérifier si on a un logo
      if (initialData.customization?.logo) {
        // Générer l'URL pour la prévisualisation
        const { data } = supabase.storage
          .from('karaokestorage')
          .getPublicUrl(`logos/${initialData.customization.logo}`);
          
        if (data?.publicUrl) {
          setLogoPreview(data.publicUrl);
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
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `bg_${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('karaokestorage')
        .upload(`backgrounds/${fileName}`, file);
      
      if (error) {
        throw error;
      }
      
      // Update form values
      setFormValues({
        ...formValues,
        customization: {
          ...formValues.customization,
          background_image: fileName
        }
      });
      
    } catch (error) {
      console.error('Error uploading background:', error);
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
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('karaokestorage')
        .upload(`logos/${fileName}`, file);
      
      if (error) {
        throw error;
      }
      
      console.log("Logo uploaded successfully:", fileName);
      
      // Update form values with the logo filename
      setFormValues({
        ...formValues,
        customization: {
          ...formValues.customization,
          logo: fileName
        }
      });
      
    } catch (error) {
      console.error('Error uploading logo:', error);
      setFormError("Erreur lors de l'upload du logo");
    }
  };

  // Apply a template to the form
  const handleTemplateSelect = (template) => {
    if (!template) return;
    
    setSelectedTemplate(template);
    
    setFormValues({
      ...formValues,
      customization: {
        ...formValues.customization,
        primary_color: template.primary_color,
        secondary_color: template.secondary_color,
        background_image: template.background_image
      }
    });
    
    // Update background preview if template has background image
    if (template.background_image) {
      const { data } = supabase.storage
        .from('karaokestorage')
        .getPublicUrl(`backgrounds/${template.background_image}`);
        
      if (data?.publicUrl) {
        setBackgroundPreview(data.publicUrl);
      }
    }
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formValues.name.trim()) {
      setFormError("Le nom de l'événement est requis");
      return;
    }
    
    // Log the data being submitted
    console.log("Submitting form values:", JSON.stringify(formValues, null, 2));
    
    // Make sure all fields are present in the customization object
    const dataToSubmit = {
      ...formValues,
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
