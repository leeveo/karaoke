'use client';

import React from 'react';
import CategorySelector from '@/components/CategorySelector';
import { motion } from 'framer-motion';

export default function HomePage() {
  // Use React.createElement instead of JSX to avoid parsing errors
  return React.createElement(
    'div',
    { className: "app-background flex flex-col justify-center min-h-screen py-10" },
    React.createElement(
      'div',
      { className: "app-container" },
      [
        // Enlarged subtitle with modern styling
        React.createElement(
          motion.div,
          {
            initial: { opacity: 0, y: -20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.2 },
            className: "text-center mb-10",
            key: "heading-container"
          },
          [
            React.createElement(
              motion.h2,
              {
                initial: { opacity: 0, scale: 0.9 },
                animate: { opacity: 1, scale: 1 },
                transition: { delay: 0.3, duration: 0.6 },
                className: "text-4xl md:text-5xl lg:text-6xl font-bold mb-4",
                style: { color: 'var(--primary-color)' },
                key: "main-heading"
              },
              "Choisis ta catégorie musicale"
            ),
            
            React.createElement(
              motion.div,
              {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.5 },
                className: "text-2xl md:text-3xl font-light",
                style: { color: 'var(--secondary-color)' },
                key: "sub-heading"
              },
              React.createElement(
                'span',
                { className: "relative" },
                [
                  React.createElement('span', { className: "relative z-10", key: "text" }, "et commence à chanter !"),
                  React.createElement('span', {
                    className: "absolute bottom-0 left-0 w-full h-3 -z-10 transform -rotate-1",
                    style: { background: 'linear-gradient(to right, var(--primary-color)/30, var(--secondary-color)/30)' },
                    key: "underline"
                  })
                ]
              )
            )
          ]
        ),

        // Category selector
        React.createElement(
          'div',
          {
            className: "w-full flex justify-center mb-10",
            key: "category-selector"
          },
          React.createElement(CategorySelector, {})
        ),

        // Enhanced footer with better icon and styling
        React.createElement(
          motion.div,
          {
            initial: { opacity: 0 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 1 },
            className: "mt-10 text-center",
            key: "footer"
          },
          React.createElement(
            'div',
            {
              className: "inline-flex items-center gap-3 px-8 py-4 card transform hover:scale-105 transition-all duration-300"
            },
            [
              React.createElement(
                'svg',
                {
                  xmlns: "http://www.w3.org/2000/svg",
                  viewBox: "0 0 24 24",
                  fill: "currentColor",
                  className: "w-6 h-6",
                  style: { color: 'var(--secondary-color)' },
                  key: "svg-icon"
                },
                React.createElement('path', {
                  d: "M8 4a2.5 2.5 0 014.304-1.768A2.5 2.5 0 0116 4v10.5a6.5 6.5 0 01-13 0V8a4.5 4.5 0 019 0v8.5a2.5 2.5 0 01-5 0V8a1 1 0 012 0v8.5a.5.5 0 001 0V8a2.5 2.5 0 00-5 0v6.5a4.5 4.5 0 009 0V4a4.5 4.5 0 00-9 0v1a1 1 0 01-2 0V4z"
                })
              ),
              React.createElement(
                'p',
                {
                  className: "text-lg text-white font-medium",
                  key: "footer-text"
                },
                "Prépare ta voix, c'est l'heure de briller !"
              )
            ]
          )
        )
      ]
    )
  );
}