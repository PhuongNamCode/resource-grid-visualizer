// Copyright (C) 2026 NeuroRAN. All rights reserved.

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        panel: '#0f1520',
        panelraised: '#141c2b',
        edge: '#243044',
        ink: '#e6edf7',
        subtle: '#8aa0bd',
        accent: '#3ba7ff',
      },
    },
  },
  plugins: [],
};
