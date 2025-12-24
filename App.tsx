
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { type FeatureID } from './constants';
import DashboardView from './features/dashboard/DashboardView';
import SmartNotesView from './features/smartNotes/SmartNotesView';
import AIChatView from './features/aiChat/AIChatView';
import AIToolsView from './features/aiTools/AIToolsView';
import SettingsView from './features/settings/SettingsView';
import { DebugConsole } from './components/DebugConsole';
import { TutorialOverlay } from './components/TutorialOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import useLocalStorage from './hooks/useLocalStorage';
import { useChatLogic } from './features/aiChat/hooks/useChatLogic';
import { type Note } from './types';

export const THEME_COLORS: Record<string, string> = {
  cyan: '#00f0ff',
  lime: '#ccff00',
  purple: '#bd00ff',
  orange: '#ff4d00',
  silver: '#ffffff',
  blue: '#3b82f6',
  green: '#00ff9d',
  red: '#ef4444',
  pink: '#ec4899',
  gold: '#facc15'
};

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<FeatureID>('dashboard');
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isTutorialComplete, setIsTutorialComplete] = useLocalStorage<boolean>('app_tutorial_complete', false);
  const [theme] = useLocalStorage<string>('app_theme', 'cyan');
  const [colorScheme] = useLocalStorage<'system' | 'light' | 'dark'>('app_color_scheme', 'system');
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);

  // Neural Chat Global State
  const chatLogic = useChatLogic(notes, setNotes);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : 
      '0 240 255'; 
  };

  const getContrastColor = (hexColor: string) => {
    const fullHex = hexColor.length === 4 ? '#' + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2] + hexColor[3] + hexColor[3] : hexColor;
    const r = parseInt(fullHex.substr(1, 2), 16);
    const g = parseInt(fullHex.substr(3, 2), 16);
    const b = parseInt(fullHex.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
  };

  useEffect(() => {
    const root = document.documentElement;
    
    let activeScheme = colorScheme;
    if (colorScheme === 'system') {
      activeScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (activeScheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    let targetColor = THEME_COLORS[theme] || THEME_COLORS.cyan;
    if (activeScheme === 'light' && theme === 'silver') {
        targetColor = '#000000';
    }

    const onAccentColor = getContrastColor(targetColor);
    const onAccentRgb = hexToRgb(onAccentColor);

    const rgb = hexToRgb(targetColor);
    root.style.setProperty('--accent-color', targetColor);
    root.style.setProperty('--accent-rgb', rgb);
    root.style.setProperty('--on-accent-color', onAccentColor);
    root.style.setProperty('--on-accent-rgb', onAccentRgb);
    root.style.setProperty('--accent-glow', `rgba(${rgb.replace(/ /g, ', ')}, 0.15)`);

    const navAccent = targetColor === '#000000' ? '#ffffff' : targetColor;
    root.style.setProperty('--nav-accent', navAccent);
  }, [theme, colorScheme]);

  const renderContent = () => {
    switch (activeFeature) {
      case 'dashboard': return (
        <ErrorBoundary viewName="DASHBOARD">
            <DashboardView onNavigate={setActiveFeature} />
        </ErrorBoundary>
      );
      case 'notes': return (
        <ErrorBoundary viewName="ARCHIVE_VAULT">
            <SmartNotesView notes={notes} setNotes={setNotes} />
        </ErrorBoundary>
      );
      case 'chat': return (
        <ErrorBoundary viewName="NEURAL_LINK">
            <AIChatView chatLogic={chatLogic} />
        </ErrorBoundary>
      );
      case 'tools': return (
        <ErrorBoundary viewName="NEURAL_ARSENAL">
            <AIToolsView />
        </ErrorBoundary>
      );
      case 'settings': return (
        <ErrorBoundary viewName="CORE_CONFIG">
            <SettingsView />
        </ErrorBoundary>
      );
      default: return (
        <ErrorBoundary viewName="UNKNOWN_MODULE">
            <DashboardView onNavigate={setActiveFeature} />
        </ErrorBoundary>
      );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full text-black dark:text-white font-sans bg-zinc-50 dark:bg-black theme-transition overflow-hidden">
      <Sidebar 
        activeFeature={activeFeature} 
        setActiveFeature={setActiveFeature} 
        onToggleDebug={() => setIsDebugOpen(true)}
        chatLogic={chatLogic}
      />
      
      <main className="flex-1 relative h-full overflow-hidden bg-zinc-50 dark:bg-black">
        {/* CRITICAL UPDATE: ID added for Scroll Intelligence */}
        <div id="main-scroll-container" className="h-full w-full overflow-y-auto custom-scroll pb-safe">
          {renderContent()}
        </div>
      </main>

      <MobileNav 
        activeFeature={activeFeature} 
        setActiveFeature={setActiveFeature} 
        onToggleDebug={() => setIsDebugOpen(true)}
        chatLogic={chatLogic} 
      />

      <DebugConsole isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
      {!isTutorialComplete && <TutorialOverlay onComplete={() => setIsTutorialComplete(true)} />}

      <style>{`
        .sidebar-morph-active {
          transition: all 0.7s cubic-bezier(0.2, 0, 0, 1);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
};

export default App;
