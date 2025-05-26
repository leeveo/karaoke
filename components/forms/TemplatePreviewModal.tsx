'use client';

import { useEffect, useRef } from 'react';
import { Template } from '@/types/template';
import { getTemplateImageUrl } from '@/lib/supabase/templates';
import { motion, AnimatePresence } from 'framer-motion';

interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export default function TemplatePreviewModal({ 
  template, 
  onClose, 
  onSelect,
  isSelected
}: TemplatePreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const imageUrl = getTemplateImageUrl(template.background_image);
  
  // Gestion des clics en dehors du modal pour fermer - CORRIGÉ
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Vérifier que l'événement ne vient pas du bouton qui a ouvert le modal
      const target = event.target as HTMLElement;
      if (target.closest('[data-preview-button]')) {
        return;
      }
      
      // Vérifier que le clic est en dehors du modal
      if (modalRef.current && !modalRef.current.contains(target)) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    
    // Utiliser un délai court pour éviter que l'événement de clic qui a ouvert le modal
    // ne le ferme immédiatement
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  // Empêcher la propagation des clics dans le modal
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Appliquer une fonction pour ajuster les couleurs (pour la démo)
  const adjustColorLightness = (color: string, percent: number): string => {
    try {
      // Convert hex to RGB
      let r = parseInt(color.substring(1,3), 16);
      let g = parseInt(color.substring(3,5), 16);
      let b = parseInt(color.substring(5,7), 16);

      // Adjust lightness
      r = Math.min(255, Math.max(0, r + (r * percent / 100)));
      g = Math.min(255, Math.max(0, g + (g * percent / 100)));
      b = Math.min(255, Math.max(0, b + (b * percent / 100)));

      // Convert back to hex
      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    } catch (e) {
      return color; // Return original color if any error occurs
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70"
      onClick={(e) => e.stopPropagation()} // Empêcher la propagation des clics
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={handleModalClick} // Empêcher la propagation des clics
      >
        {/* En-tête du modal */}
        <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
          <h3 className="text-xl font-semibold text-gray-800">
            {template.name}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Corps du modal avec aperçu et détails */}
        <div className="p-6 overflow-y-auto flex-grow">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Aperçu du template */}
            <div className="w-full md:w-2/3 relative rounded-lg overflow-hidden shadow-md" style={{ minHeight: '300px' }}>
              <div className="absolute inset-0">
                <img
                  src={imageUrl}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Overlay pour simuler le style de l'événement */}
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              
              {/* Simulation d'un titre d'événement avec les couleurs du template */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div 
                  className="text-3xl font-bold mb-4"
                  style={{ color: template.primary_color }}
                >
                  Exemple d'événement
                </div>
                
                <div className="max-w-md w-full">
                  {/* Exemple de bouton avec les couleurs du template */}
                  <button
                    className="w-full py-3 px-6 rounded-lg text-white font-bold mb-4 transition-transform hover:scale-105"
                    style={{ 
                      background: `linear-gradient(135deg, ${template.primary_color}, ${adjustColorLightness(template.primary_color, 20)})`,
                      boxShadow: `0 4px 10px rgba(0, 0, 0, 0.3)`
                    }}
                  >
                    Exemple de bouton primaire
                  </button>
                  
                  <button
                    className="w-full py-3 px-6 rounded-lg text-white font-bold transition-transform hover:scale-105"
                    style={{ 
                      background: `linear-gradient(135deg, ${template.secondary_color}, ${adjustColorLightness(template.secondary_color, 20)})`,
                      boxShadow: `0 4px 10px rgba(0, 0, 0, 0.3)`
                    }}
                  >
                    Exemple de bouton secondaire
                  </button>
                </div>
              </div>
            </div>
            
            {/* Détails du template */}
            <div className="w-full md:w-1/3 flex flex-col">
              <h4 className="text-lg font-semibold mb-2">Détails du thème</h4>
              
              {/* Description */}
              <div className="mb-4">
                <p className="text-gray-700">
                  {template.description || "Aucune description disponible pour ce template."}
                </p>
              </div>
              
              {/* Couleurs du template */}
              <div className="mb-6">
                <h5 className="font-medium text-gray-600 mb-2">Couleurs</h5>
                <div className="flex items-center mb-2">
                  <div 
                    className="w-8 h-8 rounded-md mr-3 shadow-inner"
                    style={{ backgroundColor: template.primary_color }}
                  ></div>
                  <div>
                    <div className="text-sm font-medium">Couleur primaire</div>
                    <div className="text-xs text-gray-500">{template.primary_color}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-8 h-8 rounded-md mr-3 shadow-inner"
                    style={{ backgroundColor: template.secondary_color }}
                  ></div>
                  <div>
                    <div className="text-sm font-medium">Couleur secondaire</div>
                    <div className="text-xs text-gray-500">{template.secondary_color}</div>
                  </div>
                </div>
              </div>
              
              {/* Gradient examples */}
              <div className="mb-6">
                <h5 className="font-medium text-gray-600 mb-2">Dégradés</h5>
                <div 
                  className="h-8 rounded-md mb-2 shadow-inner"
                  style={{ 
                    background: `linear-gradient(to right, ${template.primary_color}, ${adjustColorLightness(template.primary_color, 20)})` 
                  }}
                ></div>
                <div 
                  className="h-8 rounded-md shadow-inner"
                  style={{ 
                    background: `linear-gradient(to right, ${template.secondary_color}, ${adjustColorLightness(template.secondary_color, 20)})` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pied du modal avec boutons d'action */}
        <div className="bg-gray-100 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Fermer
          </button>
          
          <button
            onClick={onSelect}
            className={`
              px-4 py-2 rounded-md text-white font-medium transition-colors
              ${isSelected 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            {isSelected ? 'Template sélectionné ✓' : 'Utiliser ce template'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
