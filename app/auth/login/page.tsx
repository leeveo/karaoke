'use client';

import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/90 to-gray-900"></div>
      </div>
      
      <div className="container mx-auto max-w-md z-10">
        <motion.div 
          className="bg-white bg-opacity-10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6"
            >
              <Image 
                src="/logo.png" 
                alt="Karaoke Admin" 
                width={120} 
                height={120} 
                className="mx-auto"
              />
            </motion.div>
            
            <motion.h1 
              className="text-2xl font-bold text-center text-white mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Admin Karaoke
            </motion.h1>
            
            <motion.p 
              className="text-gray-300 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Connectez-vous pour accéder au tableau de bord
            </motion.p>
          </div>
          
          <LoginForm />
        </motion.div>
        
        <motion.p 
          className="text-gray-400 text-sm text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          © {new Date().getFullYear()} Karaoke App. Tous droits réservés.
        </motion.p>
      </div>
    </div>
  );
}
