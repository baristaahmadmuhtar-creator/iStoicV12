
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
import useLocalStorage from './hooks/useLocalStorage';
import { useIDB } from './hooks/useIDB'; // NEW IMPORT
import { useChatLogic } from './features/aiChat/hooks/useChatLogic';
import { type Note } from './types';
import { DebugConsole } from './components/DebugConsole';
import { debugService } from './services/debugService';
import { KEY_MANAGER } from './services/geminiService';
import { UI_REGISTRY, FN_REGISTRY } from './constants/registry';
import { ShieldAlert } from 'lucide-react';
import { LiveSessionProvider } from './contexts/LiveSessionContext';
import { LiveMiniPlayer } from './components/LiveMiniPlayer';
import { useIndexedDBSync } from './hooks/useIndexedDBSync';

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

interface AppContentProps {
    notes: Note[];
    setNotes: (notes: Note[]) => void;
}

const AppContent: React.FC<AppContentProps> = ({ notes, setNotes }) => {
  const [activeFeature, setActiveFeature] = useState<FeatureID>('dashboard');
  const [isTutorialComplete, setIsTutorialComplete] = useLocalStorage<boolean>('app_tutorial_complete', false);
  
  // REACTIVE SETTINGS
  const [theme] = useLocalStorage<string>('app_theme', 'cyan');
  const [colorScheme] = useLocalStorage<'system' | 'light' | 'dark'>('app_color_scheme', 'system');
  const [language] = useLocalStorage<string>('app_language', 'id');
  
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [registryValid, setRegistryValid] = useState<boolean>(false);

  // Neural Chat Global State
  const chatLogic = useChatLogic(notes, setNotes);
  
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
          if (!UI_REGISTRY.SIDEBAR_BTN_DASHBOARD || !UI_REGISTRY.DEBUG_TOGGLE) {
              console.error("FATAL: UI REGISTRY CORRUPTED");
              return false;
          }
          if (!FN_REGISTRY.NAVIGATE_TO_FEATURE || !FN_REGISTRY.TRIGGER_DEBUG) {
              console.error("FATAL: FN REGISTRY CORRUPTED");
              return false;
          }
          debugService.logAction(UI_REGISTRY.DEBUG_TOGGLE, FN_REGISTRY.VALIDATE_REGISTRY, 'PASSED');
          return true;
      };

      if (validateRegistry()) {
          setRegistryValid(true);
          debugService.runSelfDiagnosis(KEY_MANAGER);
      } else {
          setRegistryValid(false);
      }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let activeScheme = colorScheme;
    if (colorScheme === 'system') {
      activeScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (activeScheme === 'dark') { root.classList.add('dark'); root.classList.remove('light'); } 
    else { root.classList.add('light'); root.classList.remove('dark'); }

    let targetColor = THEME_COLORS[theme] || THEME_COLORS.cyan;
    if (theme === 'silver' && activeScheme === 'light') targetColor = '#475569';

    const onAccentColor = getContrastColor(targetColor);
    const onAccentRgb = hexToRgb(onAccentColor);
    const rgb = hexToRgb(targetColor);
    
    root.style.setProperty('--accent-color', targetColor);
    root.style.setProperty('--accent-rgb', rgb);
    root.style.setProperty('--on-accent-color', onAccentColor);
    root.style.setProperty('--on-accent-rgb', onAccentRgb);
    root.style.setProperty('--accent-glow', `rgba(${rgb.replace(/ /g, ', ')}, 0.45)`); 
    
    const navAccent = targetColor === '#000000' ? '#ffffff' : targetColor;
    root.style.setProperty('--nav-accent', navAccent);
  }, [theme, colorScheme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        debugService.logAction(UI_REGISTRY.DEBUG_TOGGLE, FN_REGISTRY.TRIGGER_DEBUG, 'TOGGLE');
        setIsDebugOpen(prev => !prev);
      }
    };
    
    const handleDebugToggle = () => setIsDebugOpen(prev => !prev);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('istoic-toggle-debug', handleDebugToggle);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('istoic-toggle-debug', handleDebugToggle);
    };
  }, []);

  if (!registryValid) {
      return (
          <div className="h-screen w-screen bg-black flex items-center justify-center text-red-600 flex-col gap-4">
              <ShieldAlert size={64} />
              <h1 className="text-4xl font-black uppercase tracking-widest">SYSTEM HALT</h1>
              <p className="text-sm font-mono text-red-400">REGISTRY INTEGRITY CHECK FAILED.</p>
          </div>
      );
  }

  const renderContent = () => {
    switch (activeFeature) {
      case 'dashboard': return <ErrorBoundary viewName="DASHBOARD"><DashboardView key={language} onNavigate={setActiveFeature} notes={notes} /></ErrorBoundary>;
      case 'notes': return <ErrorBoundary viewName="ARCHIVE_VAULT"><SmartNotesView key={language} notes={notes} setNotes={setNotes} /></ErrorBoundary>;
      case 'chat': return <ErrorBoundary viewName="NEURAL_LINK"><AIChatView key={language} chatLogic={chatLogic} /></ErrorBoundary>;
      case 'tools': return <ErrorBoundary viewName="NEURAL_ARSENAL"><AIToolsView key={language} /></ErrorBoundary>;
      case 'system': return <ErrorBoundary viewName="SYSTEM_HEALTH"><SystemHealthView key={language} /></ErrorBoundary>;
      case 'settings': return <ErrorBoundary viewName="CORE_CONFIG"><SettingsView key={language} onNavigate={setActiveFeature} /></ErrorBoundary>;
      default: return <ErrorBoundary viewName="UNKNOWN_MODULE"><DashboardView key={language} onNavigate={setActiveFeature} notes={notes} /></ErrorBoundary>;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full text-black dark:text-white font-sans bg-zinc-50 dark:bg-black theme-transition overflow-hidden selection:bg-accent/30 selection:text-accent">
      <Sidebar 
        key={`sidebar-${language}`}
        activeFeature={activeFeature} 
        setActiveFeature={setActiveFeature} 
        chatLogic={chatLogic}
      />
      
      <main className="flex-1 relative h-full overflow-hidden bg-zinc-50 dark:bg-black min-w-0">
        <div id="main-scroll-container" className="h-full w-full overflow-y-auto custom-scroll scroll-smooth">
          <div className="min-h-full pb-32 md:pb-40 pt-safe">
            {renderContent()}
          </div>
        </div>
      </main>

      <MobileNav 
        activeFeature={activeFeature} 
        setActiveFeature={setActiveFeature} 
        chatLogic={chatLogic} 
      />

      <LiveMiniPlayer />

      <DebugConsole isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />

      {!isTutorialComplete && <TutorialOverlay onComplete={() => setIsTutorialComplete(true)} />}
    </div>
  );
};

const App: React.FC = () => {
    // Lift State for Notes IDB to Top Level so it can be shared with LiveSession
    const [notes, setNotes] = useIDB<Note[]>('notes', []);
    
    // Activate Background Sync (for Vector DB)
    useIndexedDBSync(notes);

    return (
        <LiveSessionProvider notes={notes} setNotes={setNotes}>
            <AppContent notes={notes} setNotes={setNotes} />
        </LiveSessionProvider>
    );
};

export default App;
