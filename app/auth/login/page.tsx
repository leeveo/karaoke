'use client';

import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full overflow-hidden relative flex items-center justify-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/template040.png" 
          alt="Background" 
          fill
          className="object-cover object-center"
          priority
        />
        {/* Premium Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30"></div>
        {/* Animated Glow Effect */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* Main Login Card */}
          <motion.div 
            className="backdrop-blur-3xl bg-white/15 rounded-3xl shadow-2xl border border-white/30 overflow-hidden hover:border-white/40 transition-all duration-300"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Decorative Top Bar */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

            {/* Card Content */}
            <div className="p-8 sm:p-10 bg-white/5 backdrop-blur-xl">
              {/* Logo Section */}
              <motion.div 
                className="flex flex-col items-center mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 100 }}
                  className="relative mb-6"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-50"></div>
                  <div className="relative bg-white/10 p-4 rounded-full border border-white/20">
                    <Image 
                      src="/logo.png" 
                      alt="Karaoke Admin" 
                      width={80} 
                      height={80} 
                      className="drop-shadow-lg"
                    />
                  </div>
                </motion.div>
                
                <motion.h1 
                  className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  Karaoke Admin
                </motion.h1>
                
                <motion.p 
                  className="text-white/70 text-center text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  Accédez à votre espace d&apos;administration
                </motion.p>
              </motion.div>

              {/* Divider */}
              <motion.div 
                className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              ></motion.div>

              {/* Login Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="bg-white/20 backdrop-blur-2xl rounded-2xl p-6 sm:p-8 border border-white/30 shadow-xl"
              >
                <LoginForm />
              </motion.div>
            </div>
          </motion.div>

          {/* Bottom Info */}
          <motion.div 
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <p className="text-white/50 text-xs sm:text-sm">
              © {new Date().getFullYear()} Karaoke App. Tous droits réservés.
            </p>
            <p className="text-white/40 text-xs mt-2 px-4">
              🔒 Connexion sécurisée - Vos données sont protégées
            </p>
          </motion.div>

          {/* Decorative Elements */}
          <motion.div 
            className="absolute top-4 left-4 text-blue-400/20 text-6xl"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            ♪
          </motion.div>
          <motion.div 
            className="absolute bottom-4 right-4 text-purple-400/20 text-6xl"
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          >
            ♫
          </motion.div>
        </div>
      </div>
    </div>
  );
}
