'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/supabase/auth';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const { user, error } = await signIn(email, password);
      
      if (error) {
        setError(typeof error === 'string' ? error : error.message);
        setIsLoading(false);
        return;
      }
      
      if (user) {
        setSuccess(true);
        // Redirect to admin dashboard after a short delay
        setTimeout(() => {
          router.push('/admin');
        }, 1000);
      } else {
        setError('Une erreur inconnue est survenue');
        setIsLoading(false);
      }
      
    } catch (err: any) {
      setError(err?.message || 'Erreur de connexion');
      setIsLoading(false);
    }
  };

  return (
    <motion.form 
      onSubmit={handleLogin}
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      {error && (
        <motion.div 
          className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 flex items-start"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FiAlertCircle className="text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-100 text-sm">{error}</p>
        </motion.div>
      )}
      
      {success && (
        <motion.div 
          className="p-4 rounded-lg bg-green-500/20 border border-green-500/50"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-green-100 text-sm text-center">
            Connexion réussie ! Redirection...
          </p>
        </motion.div>
      )}
      
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-200">Adresse email</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <FiMail className="text-gray-400" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 text-gray-800 bg-white bg-opacity-90 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="admin@example.com"
            disabled={isLoading || success}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-200">Mot de passe</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <FiLock className="text-gray-400" />
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 text-gray-800 bg-white bg-opacity-90 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="••••••••"
            disabled={isLoading || success}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
            Se souvenir de moi
          </label>
        </div>
        
        <div className="text-sm">
          <a href="#" className="text-blue-400 hover:text-blue-300">
            Mot de passe oublié?
          </a>
        </div>
      </div>
      
      <div>
        <button
          type="submit"
          disabled={isLoading || success}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/50 ${
            isLoading || success
              ? 'bg-blue-500/60 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connexion...
            </span>
          ) : (
            'Se connecter'
          )}
        </button>
      </div>
    </motion.form>
  );
}
