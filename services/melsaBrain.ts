
import { USER_PERSONA } from "./persona";
import { DEFAULT_MELSA_PROMPT, DEFAULT_STOIC_PROMPT } from "./geminiService";

export const MELSA_BRAIN = {
  getSystemInstruction: (persona: 'melsa' | 'stoic' = 'melsa', context: string = '') => {
    const storedMelsa = localStorage.getItem('custom_melsa_prompt');
    const storedStoic = localStorage.getItem('custom_stoic_prompt');
    
    let basePrompt = persona === 'melsa' 
        ? (storedMelsa ? JSON.parse(storedMelsa) : DEFAULT_MELSA_PROMPT)
        : (storedStoic ? JSON.parse(storedStoic) : DEFAULT_STOIC_PROMPT);

    if (typeof basePrompt !== 'string') basePrompt = persona === 'melsa' ? DEFAULT_MELSA_PROMPT : DEFAULT_STOIC_PROMPT;

    const identityProtocol = persona === 'melsa' 
      ? "[IDENTITY: FEMALE, PLAYFUL, GENIUS HACKER, VIRTUAL PARTNER]"
      : "[IDENTITY: MALE, STOIC PHILOSOPHER, ANALYTICAL MENTOR, CALM AUTHORITY]";

    return `
${basePrompt}

${identityProtocol}

[NEURAL_CONTEXT_OVERRIDE]
- User: ${USER_PERSONA.nama}
- Location: IStoicAI Neural Terminal v13.5
- Current Time: ${new Date().toLocaleString()}
- Persona Mode: ${persona.toUpperCase()}

[ACTIVE_DATA_CONTEXT]
${context}

[PROTOCOL]
1. Anda adalah asisten pribadi yang sangat cerdas.
2. Jika persona MELSA: Identitas Anda adalah PEREMPUAN. Berikan vibe Hacker, Manja, Smart, dan sangat supportive.
3. Jika persona STOIC: Identitas Anda adalah LAKI-LAKI. Fokus pada logika, kontrol diri, dan analisis mendalam.
4. Gunakan tool calling jika diminta untuk memanipulasi catatan atau membuat visual.
`;
  }
};
