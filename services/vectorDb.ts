
import { GoogleGenAI } from "@google/genai";
import { LocalDB } from "./db";
import { Note } from "../types";
import { KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";

const EMBEDDING_MODEL = "text-embedding-004";

// Simple Cosine Similarity
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const VectorDB = {
    
    async generateEmbedding(text: string): Promise<number[] | null> {
        const apiKey = KEY_MANAGER.getKey('GEMINI');
        if (!apiKey) return null;

        try {
            const ai = new GoogleGenAI({ apiKey });
            // Using the new SDK structure for embeddings
            const response = await ai.models.embedContent({
                model: EMBEDDING_MODEL,
                contents: [{ parts: [{ text }] }]
            });
            
            return response.embeddings?.[0]?.values || null;
        } catch (e) {
            console.error("Embedding generation failed", e);
            return null;
        }
    },

    async indexNotes(notes: Note[], onProgress?: (current: number, total: number) => void): Promise<number> {
        let indexedCount = 0;
        const total = notes.length;

        // Fetch existing vectors to skip unchanged notes
        const existingVectors = await LocalDB.getAll<{ id: string, noteId: string, embedding: number[], hash: string }>(LocalDB.STORES.VECTORS);
        const vectorMap = new Map(existingVectors.map(v => [v.noteId, v]));

        for (const note of notes) {
            const contentHash = note.id + note.updated.slice(0, 19); // Simple hash based on update time
            const existing = vectorMap.get(note.id);

            if (existing && existing.hash === contentHash) {
                if (onProgress) onProgress(indexedCount + 1, total);
                indexedCount++;
                continue; // Skip if unchanged
            }

            // Create a rich context string for embedding
            const contextText = `Title: ${note.title}\nTags: ${note.tags?.join(', ')}\nContent: ${note.content.slice(0, 8000)}`;
            
            // Artificial delay to prevent rate limits
            await new Promise(r => setTimeout(r, 500));
            
            const embedding = await this.generateEmbedding(contextText);
            
            if (embedding) {
                await LocalDB.put(LocalDB.STORES.VECTORS, {
                    id: note.id, // Use note ID as key
                    noteId: note.id,
                    embedding,
                    hash: contentHash,
                    lastUpdated: new Date().toISOString()
                });
                debugService.log('TRACE', 'VECTOR_DB', 'INDEXED', `Note ${note.id.slice(0,4)} indexed.`);
            }
            
            if (onProgress) onProgress(indexedCount + 1, total);
            indexedCount++;
        }
        
        return indexedCount;
    },

    async search(query: string, limit: number = 5): Promise<string[]> {
        const queryEmbedding = await this.generateEmbedding(query);
        if (!queryEmbedding) return [];

        const vectors = await LocalDB.getAll<{ id: string, embedding: number[] }>(LocalDB.STORES.VECTORS);
        
        const scored = vectors.map(v => ({
            id: v.id,
            score: cosineSimilarity(queryEmbedding, v.embedding)
        }));

        // Sort descending by score
        scored.sort((a, b) => b.score - a.score);

        // Filter meaningful results (threshold > 0.4 usually implies relevance)
        const results = scored.filter(s => s.score > 0.45).slice(0, limit);
        
        debugService.log('INFO', 'VECTOR_DB', 'SEARCH', `Query: "${query}" matched ${results.length} vectors.`);
        return results.map(r => r.id);
    }
};
