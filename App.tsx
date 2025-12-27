
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { type FeatureID } from './constants';
import DashboardView from './features/dashboard/DashboardView';
import { SmartNotesView } from './features/smartNotes/SmartNotesView';
import AIChatView from './features/aiChat/AIChatView';
import AIToolsView from './features/aiTools/AIToolsView';
import SettingsView from './features/settings/SettingsView';
import { SystemHealthView } from './features/systemHealth/SystemHealthView';
import { TutorialOverlay } from './components/TutorialOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NeuralHUD } from './components/NeuralHUD'; // Import HUD
import useLocalStorage from './hooks/useLocalStorage';
import { useChatLogic } from './features/aiChat/hooks/useChatLogic';
import { useNeuralLink } from './contexts/NeuralLinkContext'; // Import Hook
import { type Note } from './types';
import { DebugConsole } from './components/DebugConsole';
import { debugService } from './services/debugService';
import { KEY_MANAGER } from './services/geminiService';
import { UI_REGISTRY, FN_REGISTRY } from './constants/registry';
import { ShieldAlert } from 'lucide-react';

export const THEME_COLORS: Record<string, string> = {
  cyan: '#00F0FF',
  lime: '#CCFF00',
  purple: '#BF00FF',
  orange: '#FF5F00',
  silver: '#FFFFFF',
  blue: '#0066FF',
  green: '#00FF94',
  red: '#FF003C',
  pink: '#FF0099',
  gold: '#FFD700'
};

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<FeatureID>('dashboard');
  const [isTutorialComplete, setIsTutorialComplete] = useLocalStorage<boolean>('app_tutorial_complete', false);
  
  const [theme] = useLocalStorage<string>('app_theme', 'cyan');
  const [colorScheme] = useLocalStorage<'system' | 'light' | 'dark'>('app_color_scheme', 'system');
  const [language] = useLocalStorage<string>('app_language', 'id');
  
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [registryValid, setRegistryValid] = useState<boolean>(false);

  const chatLogic = useChatLogic(notes, setNotes);
  const { isLiveMode, isMinimized } = useNeuralLink();
  
  const isLiveSessionActive = isLiveMode && !isMinimized; 

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : 
      '6 182 212'; 
  };

  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
  };

  useEffect(() => {
      const validateRegistry = () => {
          if (!UI_REGISTRY.SIDEBAR_BTN_DASHBOARD || !UI_REGISTRY.DEBUG_TOGGLE) return false;
          if (!FN_REGISTRY.NAVIGATE_TO_FEATURE || !FN_REGISTRY.TRIGGER_DEBUG) return false;
          return true;
      };
      if (validateRegistry()) {
          setRegistryValid(true);
          debugService.runSelfDiagnosis(KEY_MANAGER);
      }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let activeScheme = colorScheme;
    if (colorScheme === 'system') activeScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (activeScheme === 'dark') { root.classList.add('dark'); root.classList.remove('light'); } 
    else { root.classList.add('light'); root.classList.remove('dark'); }

    let targetColor = THEME_COLORS[theme] || THEME_COLORS.cyan;
    const rgb = hexToRgb(targetColor);
    root.style.setProperty('--accent-color', targetColor);
    root.style.setProperty('--accent-rgb', rgb);
    root.style.setProperty('--accent-glow', `rgba(${rgb.replace(/ /g, ', ')}, 0.45)`); 
  }, [theme, colorScheme]);

  const renderContent = () => {
    switch (activeFeature) {
      case 'dashboard': return <DashboardView key={language} onNavigate={setActiveFeature} />;
      case 'notes': return <SmartNotesView key={language} notes={notes} setNotes={setNotes} />;
      case 'chat': return <AIChatView key={language} chatLogic={chatLogic} />;
      case 'tools': return <AIToolsView key={language} />;
      case 'system': return <SystemHealthView key={language} />;
      case 'settings': return <SettingsView key={language} onNavigate={setActiveFeature} />;
      default: return <DashboardView key={language} onNavigate={setActiveFeature} />;
    }
  };

  if (!registryValid) return null;

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-50 dark:bg-black theme-transition overflow-hidden selection:bg-accent/30 selection:text-accent">
      <Sidebar activeFeature={activeFeature} setActiveFeature={setActiveFeature} chatLogic={chatLogic} />
      
      <main className="flex-1 relative h-full overflow-hidden bg-zinc-50 dark:bg-black min-w-0">
        <div id="main-scroll-container" className="h-full w-full overflow-y-auto custom-scroll pb-safe scroll-smooth">
          <div className="min-h-full pb-32 md:pb-40">
            <ErrorBoundary viewName={activeFeature.toUpperCase()}>
                {renderContent()}
            </ErrorBoundary>
          </div>
        </div>
      </main>

      <NeuralHUD />

      {!isLiveSessionActive && (
        <MobileNav activeFeature={activeFeature} setActiveFeature={setActiveFeature} chatLogic={chatLogic} />
      )}

      <DebugConsole isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
      {!isTutorialComplete && <TutorialOverlay onComplete={() => setIsTutorialComplete(true)} />}
    </div>
  );
};

export default App;
