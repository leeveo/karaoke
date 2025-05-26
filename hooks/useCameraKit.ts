'use client';

import { useContext } from 'react';
import { CameraKitContext } from '../contexts/CameraKitContext';

export const useCameraKit = () => {
  const context = useContext(CameraKitContext);
  
  if (!context) {
    throw new Error('useCameraKit must be used within a CameraKitProvider');
  }
  
  return context;
};
