
import React from 'react';
import { 
  LayoutGrid, 
  FileText, 
  Cpu, 
  Zap,
  Activity
} from 'lucide-react';

export type FeatureID = 'dashboard' | 'notes' | 'chat' | 'tools' | 'settings' | 'system';

export interface Feature {
    id: FeatureID;
    name: string;
    icon: React.ReactNode;
}

export const FEATURES: Feature[] = [
    {
        id: 'dashboard',
        name: 'HOME',
        icon: <LayoutGrid size={22} />
    },
    {
        id: 'notes',
        name: 'ARCHIVE',
        icon: <FileText size={22} />
    },
    {
        id: 'chat',
        name: 'NEURAL_AI',
        icon: <Cpu size={22} />
    },
    {
        id: 'tools',
        name: 'ARSENAL',
        icon: <Zap size={22} />
    },
    {
        id: 'system',
        name: 'SYSTEM',
        icon: <Activity size={22} />
    }
];
