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
          src="/template004.png" 
          alt="Background" 
          fill
          className="object-cover object-center"
          priority
        />
        {/* Animated Glow Effect */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* Main Login Card - White Form */}
          <motion.div 
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(118,168,255,0.12))',
              backdropFilter: 'blur(42px)',
              border: '1px solid rgba(255,255,255,0.22)',
              boxShadow: '0 38px 100px rgba(15, 23, 42, 0.18)'
            }}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Glossy highlight */}
            <div
              className="absolute inset-x-6 -top-24 h-48 rounded-full opacity-40"
              style={{
                background: 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.85) 0%, rgba(144,205,244,0.25) 55%, rgba(59,130,246,0.15) 100%)'
              }}
            ></div>

            {/* Decorative Top Bar */}
            <div className="relative h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

            {/* Card Content - Pure White */}
            <div
              className="relative p-12 sm:p-14"
              style={{
                background: 'linear-gradient(150deg, rgba(255,255,255,0.3) 0%, rgba(190,216,255,0.22) 45%, rgba(120,185,255,0.18) 100%)',
                borderRadius: '1.5rem'
              }}
            >
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
                  className="relative mb-6 flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-50"></div>
                  <motion.div
                    className="relative w-28 h-28"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  >
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center shadow-inner"
                      style={{
                        background: 'conic-gradient(from 0deg, #06060a, #1a1a24, #06060a, #10101b, #06060a)',
                        boxShadow: '0 0 24px rgba(8, 18, 54, 0.45), inset 0 0 30px rgba(0,0,0,0.8)'
                      }}
                    >
                      <div className="absolute w-3/4 h-3/4 rounded-full border-t border-white/5"></div>
                      <div className="absolute w-2/3 h-2/3 rounded-full border-t border-white/5"></div>
                      <div className="absolute w-1/2 h-1/2 rounded-full border-t border-white/5"></div>
                      <div className="absolute w-1/3 h-1/3 rounded-full border-t border-white/5"></div>
                      <motion.div
                        className="absolute w-2/5 h-2/5 rounded-full flex items-center justify-center text-sm font-bold tracking-wide"
                        style={{
                          background: 'var(--primary-gradient)',
                          color: 'white',
                          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.35)'
                        }}
                        animate={{ rotate: -360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                      >
                        KARAOKE
                      </motion.div>
                      <div className="absolute w-[10px] h-[10px] rounded-full bg-gray-900 border border-gray-700"></div>
                    </div>
                  </motion.div>
                </motion.div>
                
                <motion.h1 
                  className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  Karaoke Admin
                </motion.h1>
                
                <motion.p 
                  className="text-gray-600 text-center text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  Accédez à votre espace d&apos;administration
                </motion.p>
              </motion.div>

              {/* Divider */}
              <motion.div 
                className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-8"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              ></motion.div>

              {/* Login Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="rounded-2xl border border-white/25 shadow-2xl px-8 sm:px-10 py-10 sm:py-12"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.24) 0%, rgba(166,205,255,0.18) 55%, rgba(96,164,255,0.14) 100%)',
                  boxShadow: '0 24px 60px rgba(30, 64, 175, 0.16)',
                  backdropFilter: 'blur(34px)'
                }}
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
