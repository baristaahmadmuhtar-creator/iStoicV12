
import { LogEntry, LogLevel } from '../types';
import { v4 as uuidv4 } from 'uuid';

const MAX_LOGS = 200;

interface PerformanceMetric {
    endpoint: string;
    latency: number;
    timestamp: number;
}

class DebugService {
    private logs: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];
    private metrics: PerformanceMetric[] = [];

    constructor() {
        this.log('INFO', 'KERNEL', 'BOOT', 'System Reliability Monitor v13.5 Active.');
    }

    log(level: LogLevel, layer: string, code: string, message: string, payload: any = {}) {
        const entry: LogEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            layer,
            level,
            code,
            message,
            payload: JSON.parse(JSON.stringify(payload || {})) // Safety detach
        };

        // Console mirroring for dev environment only
        // Fix: Casting import.meta to any to avoid TS error about missing env property
        const isDev = (import.meta as any).env?.DEV;
        if (isDev || level === 'ERROR') {
            const style = level === 'ERROR' ? 'color: #ef4444; font-weight: bold' : 'color: #00f0ff';
            console.log(`%c[${layer}]`, style, message, payload);
        }

        this.logs = [entry, ...this.logs].slice(0, MAX_LOGS);
        this.notify();
    }

    // New: Track AI Latency Real-time
    trackNetwork(endpoint: string, startTime: number) {
        const latency = Date.now() - startTime;
        this.metrics.push({ endpoint, latency, timestamp: Date.now() });
        this.metrics = this.metrics.slice(-50); // Keep last 50 requests stats
        this.log('TRACE', 'NETWORK', 'LATENCY', `${endpoint} took ${latency}ms`, { latency });
    }

    getSystemHealth() {
        // REAL Data calculation
        const avgLatency = this.metrics.length > 0 
            ? Math.round(this.metrics.reduce((a, b) => a + b.latency, 0) / this.metrics.length) 
            : 0;
        
        const memory = (performance as any).memory 
            ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) 
            : null;

        return {
            avgLatency,
            memoryMb: memory,
            errorCount: this.logs.filter(l => l.level === 'ERROR').length,
            activeListeners: this.listeners.length
        };
    }

    getLogs() {
        return this.logs;
    }

    subscribe(callback: (logs: LogEntry[]) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.logs));
    }

    clear() {
        this.logs = [];
        this.metrics = [];
        this.log('INFO', 'OPS', 'CLEAN', 'System logs purged manually.');
        this.notify();
    }
}

export const debugService = new DebugService();
