'use client';

import { useState, useEffect } from 'react';
import { fetchTemplates, getTemplateImageUrl } from '@/lib/supabase/templates';
import { Template } from '@/types/template';
import TemplatePreviewModal from './TemplatePreviewModal';

// Update the interface to match how the component is actually used
interface TemplateSelectorProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  selectedTemplate: Template | null;
}

export default function TemplateSelector({ 
  templates,
  onSelect,
  selectedTemplate
}: TemplateSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État pour le modal de prévisualisation
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Fonction pour ouvrir le modal de prévisualisation
  const handlePreview = (template: Template, e: React.MouseEvent) => {
    // Empêcher la propagation et l'action par défaut
    e.preventDefault();
    e.stopPropagation();
    
    // Mettre à jour l'état pour ouvrir le modal
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  // Fonction pour fermer le modal
  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewTemplate(null);
  };

  // Fonction pour sélectionner un template depuis le modal
  const handleSelectFromPreview = () => {
    if (previewTemplate) {
      // Use onSelect instead of onTemplateSelect
      onSelect(previewTemplate);
      setShowPreviewModal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="mb-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Choisir un template</h3>
        <button
          type="button"
          onClick={() => {}} // Empty handler for now, since onCustomMode is not provided
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Personnaliser manuellement
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {templates.map((template) => {
          // Use selectedTemplate.id to check selection
          const isSelected = selectedTemplate?.id === template.id;
          const imageUrl = getTemplateImageUrl(template.background_image);
          
          return (
            <div 
              key={template.id}
              className={`
                relative rounded-lg overflow-hidden border-2 transition-all
                ${isSelected ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-300'}
              `}
              style={{ height: '150px' }}
              onClick={(e) => {
                e.stopPropagation(); // Empêcher la propagation
                onSelect(template);
              }}
            >
              <div className="relative w-full h-full">
                {/* Image de fond */}
                <div className="absolute inset-0 bg-gray-200">
                  <img
                    src={imageUrl}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Overlay pour la lisibilité */}
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                
                {/* Nom du template */}
                <div className="absolute bottom-0 left-0 right-0 p-2 text-white font-semibold">
                  {template.name}
                </div>
                
                {/* Indicateur de sélection */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                
                {/* Aperçu des couleurs */}
                <div className="absolute top-2 left-2 flex space-x-1">
                  <div 
                    className="w-4 h-4 rounded-full border border-white"
                    style={{ backgroundColor: template.primary_color }}
                  ></div>
                  <div 
                    className="w-4 h-4 rounded-full border border-white"
                    style={{ backgroundColor: template.secondary_color }}
                  ></div>
                </div>
                
                {/* Boutons d'action */}
                <div className="absolute right-2 bottom-10 flex flex-col space-y-2">
                  {/* Bouton prévisualisation (œil) */}
                  <button
                    data-preview-button="true" // Marqueur pour identifier ce bouton
                    onClick={(e) => handlePreview(template, e)}
                    className="bg-white bg-opacity-90 text-gray-800 hover:text-blue-600 rounded-full p-2 shadow transition-all hover:bg-opacity-100 hover:scale-105"
                    title="Prévisualiser le template"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  
                  {/* Indicateur de sélection (non cliquable) */}
                  <div
                    className={`
                      rounded-full p-2 shadow
                      ${isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white bg-opacity-90 text-gray-800'}
                    `}
                    title={isSelected ? "Template sélectionné" : "Template non sélectionné"}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modal de prévisualisation */}
      {showPreviewModal && previewTemplate && (
        <div onClick={(e) => e.stopPropagation()}>
          <TemplatePreviewModal
            template={previewTemplate}
            onClose={handleClosePreview}
            onSelect={handleSelectFromPreview}
            isSelected={selectedTemplate?.id === previewTemplate.id}
          />
        </div>
      )}
    </div>
  );
}
