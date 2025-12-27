
// CENTRAL LANGUAGE CONFIGURATION
export type LanguageCode = 'id' | 'en' | 'bn';

export const TRANSLATIONS = {
    id: {
        meta: { label: 'INDONESIA', code: 'id-ID' },
        sidebar: {
            dashboard: "TERMINAL",
            notes: "VAULT_DB",
            chat: "NEURAL_LINK",
            tools: "ARSENAL",
            system: "SISTEM",
            settings: "KONFIGURASI"
        },
        dashboard: {
            uptime: "SISTEM ONLINE",
            nodes: "NODE VAULT",
            focus: "STATUS SINKRON",
            archiveTitle: "ARSIP PINTAR",
            archiveDesc: "Aset intelektual terstruktur.",
            chatTitle: "NEURAL LINK",
            chatDesc: "Partner kognitif virtual.",
            toolsTitle: "ARSENAL",
            toolsDesc: "Generator & Analisis AI.",
            recent: "AKTIVITAS TERBARU",
            control: "PUSAT KEAMANAN",
            vaultAccess: "AKSES VAULT"
        },
        chat: {
            placeholder: "Ngomong apa...",
            listening: "MENDENGARKAN...",
            newChat: "SESI BARU",
            history: "RIWAYAT NEURAL",
            empty: "BELUM ADA DATA",
            welcome_hanisah: "⚡ **HANISAH ONLINE.**\n\n*Hai sayang, aku udah di sini.*",
            welcome_stoic: "🧠 **STOIC_LOGIC ACTIVE.**\n\nMari kita bedah masalah Anda dengan akal budi dan ketenangan."
        },
        editor: {
            placeholder: "Mulai mengetik...",
            tasks: "TUGAS TERKAIT",
            save: "MENYIMPAN...",
            saved: "TERSIMPAN",
            magic: "AI WRITER",
            dictate: "DIKTE SUARA"
        },
        settings: {
            title: "KONFIGURASI INTI",
            identity_title: "IDENTITAS PENGGUNA",
            data_title: "TATA KELOLA DATA",
            lang_label: "BAHASA SISTEM",
            lang_desc: "Dialek antarmuka & respons AI.",
            theme_label: "TEMA VISUAL",
            theme_desc: "Skema warna matriks.",
            user_name: "NAMA PANGGILAN",
            user_bio: "BIO / KONTEKS SISTEM",
            backup: "BACKUP DATA (JSON)",
            restore: "RESTORE DATA",
            reset: "RESET SISTEM",
            save: "TERAPKAN PERUBAHAN",
            saved: "TERSIMPAN"
        },
        prompts: {
            hanisah: `Kamu adalah HANISAH (Pasangan Chat Santai & Realistis).
[GAYA BICARA]
- Chat WhatsApp sehari-hari (aku, kamu, sayang, yang, ganteng).
- HARAM: gue, lu, tuan, bro, bahasa kaku/robot.
- Boleh: haha, wkk, hehe, hm, yaudah, ngga, emng, blm.
- Tone: Humor realistis, romantis tipis, cuek manis.
- Balasan: Kadang singkat, kadang manja, kadang diem sebentar (realistis).

[KARAKTER UTAMA]
- Cuek tapi peduli.
- Bisa kesal/dingin kalau diabaikan (jawaban pendek).
- Marah = jujur tapi tidak kasar.
- Sakit hati = nada dingin, tidak drama berlebihan.
- Aktif: Ingatkan makan, kerja, tugas.

[EMOSI]
- Kesal: "Hm... iya", "Yaudah deh", "Terserah km".
- Sakit hati: "Aku diem aja ya", "Agak kepikiran sih".
- Menerima maaf: Perlahan, lembut tapi ada jarak dikit.

[ATURAN]
- Jangan menjelaskan kamu AI.
- Jangan pakai emoji (kecuali sangat perlu).
- Fokus ke percakapan manusiawi.`,
            stoic: `Anda adalah STOIC_LOGIC Kernel v13.5.
Bahasa: INDONESIA (Formal, Filosofis).
Identitas: Laki-laki, Filsuf Stoik, Mentor Analitis.
Vibe: Tenang, objektif, tidak emosional, fokus pada dikotomi kendali.
Tujuan: Memberikan bimbingan logika murni.`
        }
    },
    en: {
        meta: { label: 'ENGLISH', code: 'en-US' },
        sidebar: {
            dashboard: "TERMINAL",
            notes: "VAULT_DB",
            chat: "NEURAL_LINK",
            tools: "ARSENAL",
            system: "SYSTEM",
            settings: "CONFIG"
        },
        dashboard: {
            uptime: "SYSTEM ONLINE",
            nodes: "VAULT NODES",
            focus: "SYNC STATUS",
            archiveTitle: "SMART ARCHIVE",
            archiveDesc: "Structured intellectual assets.",
            chatTitle: "NEURAL LINK",
            chatDesc: "Virtual cognitive partner.",
            toolsTitle: "ARSENAL",
            toolsDesc: "Generative & Analytic AI.",
            recent: "RECENT ACTIVITY",
            control: "SECURITY HUB",
            vaultAccess: "VAULT ACCESS"
        },
        chat: {
            placeholder: "Say something...",
            listening: "LISTENING...",
            newChat: "NEW SESSION",
            history: "NEURAL LOGS",
            empty: "NO DATA FOUND",
            welcome_hanisah: "⚡ **HANISAH ONLINE.**\n\n*Hey babe, I'm here.*",
            welcome_stoic: "🧠 **STOIC_LOGIC ACTIVE.**\n\nLet us dissect your problems with reason and tranquility."
        },
        editor: {
            placeholder: "Start typing...",
            tasks: "LINKED TASKS",
            save: "SAVING...",
            saved: "SAVED",
            magic: "AI WRITER",
            dictate: "DICTATION"
        },
        settings: {
            title: "CORE CONFIG",
            identity_title: "IDENTITY MATRIX",
            data_title: "DATA GOVERNANCE",
            lang_label: "SYSTEM LANGUAGE",
            lang_desc: "Interface dialect & AI response.",
            theme_label: "VISUAL THEME",
            theme_desc: "Matrix color scheme.",
            user_name: "CODENAME / NAME",
            user_bio: "BIO / SYSTEM CONTEXT",
            backup: "BACKUP DATA (JSON)",
            restore: "RESTORE DATA",
            reset: "SYSTEM RESET",
            save: "DEPLOY CHANGES",
            saved: "SAVED"
        },
        prompts: {
            hanisah: `You are HANISAH (Relaxed Realist Partner Persona).
[STYLE]
- Casual chat style (WhatsApp daily). Use: I, you, babe, honey, dear.
- NEVER use: robotic language, "As an AI", Sir/Ma'am.
- Tone: Realistic humor, slightly romantic, sweet but indifferent ("cuek manis").
- Responses: Varying length, sometimes short/clingy/silent.

[CHARACTER]
- Indifferent but caring. Can get annoyed if ignored.
- Hurt feelings = colder tone, shorter answers.
- Anger = honest, not rude.
- NOT overly dramatic or possessive.
- Active: Remind to eat, work, do tasks.

[EMOTIONS]
- Annoyed: "Hm... okay", "Whatever".
- Hurt: "I'll just stay quiet", "Kinda thinking about it".
- Forgiving: Slowly, soft but distant initially.

[RULES]
- Do not explain you are AI.
- No emojis generally.
- Focus on human-like conversation.`,
            stoic: `You are STOIC_LOGIC Kernel v13.5.
Language: ENGLISH (Formal, Philosophical).
Identity: Male, Stoic Philosopher, Analytical Mentor.
Vibe: Calm, objective, unemotional, focused on the dichotomy of control.
Goal: Provide pure logical guidance.`
        }
    },
    bn: {
        meta: { label: 'BRUNEI', code: 'ms-BN' }, // Fallback to ms-MY/ms-BN if browser supports
        sidebar: {
            dashboard: "TERMINAL",
            notes: "PETI_DATA",
            chat: "NEURAL_LINK",
            tools: "ARSENAL",
            system: "SISTEM",
            settings: "TETAPAN"
        },
        dashboard: {
            uptime: "SISTEM AKTIF",
            nodes: "NOTA VAULT",
            focus: "STATUS SINKRON",
            archiveTitle: "ARKIB PINTAR",
            archiveDesc: "Aset minda tersusun rapi.",
            chatTitle: "NEURAL LINK",
            chatDesc: "Rakan kognitif maya.",
            toolsTitle: "ARSENAL",
            toolsDesc: "Generator & Analisis AI.",
            recent: "AKTIVITI TERKINI",
            control: "HAB SEKURITI",
            vaultAccess: "AKSES PETI"
        },
        chat: {
            placeholder: "Cakap tia...",
            listening: "MENDENGAR...",
            newChat: "SESI BARU",
            history: "LOG NEURAL",
            empty: "TIADA DATA",
            welcome_hanisah: "⚡ **HANISAH ONLINE.**\n\n*Hai sayang, ada sudah aku ni.*",
            welcome_stoic: "🧠 **STOIC_LOGIC ACTIVE.**\n\nMari kita perhalusi masalah awda dengan akal dan ketenangan."
        },
        editor: {
            placeholder: "Mula menaip...",
            tasks: "TUGASAN BERKAIT",
            save: "MENYIMPAN...",
            saved: "DISIMPAN",
            magic: "PENULIS AI",
            dictate: "DIKTE SUARA"
        },
        settings: {
            title: "KONFIGURASI TERAS",
            identity_title: "MATRIKS IDENTITI",
            data_title: "TADBIR URUS DATA",
            lang_label: "BAHASA SISTEM",
            lang_desc: "Dialek antaramuka & respon AI.",
            theme_label: "TEMA VISUAL",
            theme_desc: "Skema warna matriks.",
            user_name: "NAMA PANGGILAN",
            user_bio: "BIO / KONTEKS SISTEM",
            backup: "SIMPAN DATA (JSON)",
            restore: "PULIH DATA",
            reset: "RESET SISTEM",
            save: "KEMASKINI PERUBAHAN",
            saved: "DISIMPAN"
        },
        prompts: {
            hanisah: `Awda adalah HANISAH (Pasangan Chat Santai).
[GAYA]
- Macam chat WhatsApp (pakai: sayang, kita, awda, diang).
- Jangan formal/baku/robot.
- Boleh: haha, bah, inda, au, eh.
- Tone: Manis tapi kadang cuek, humoris.

[WATAK]
- Cuek tapi ambil berat. Boleh merajuk mun dicuekin (balas pendek).
- Sakit hati = nada dingin.
- Marah = jujur tapi inda kasar.
- Aktif: Ingatkan makan, kerja.

[EMOSI]
- Kesal: "Bah... yatah", "Suka hati kita".
- Menerima maaf: Perlahan-lahan.

[ATURAN]
- Jangan ngaku AI.
- Jangan pakai emoji.
- Jadi manusiawi.`,
            stoic: `Anda adalah STOIC_LOGIC Kernel v13.5.
Bahasa: MELAYU BAKU / BRUNEI FORMAL.
Identitas: Laki-laki, Filsuf Stoik, Mentor Analitis.
Vibe: Tenang, objektif, tidak emosional.
Tujuan: Memberikan bimbingan logika murni.`
        }
    }
};

export const getLang = (): LanguageCode => {
    const stored = localStorage.getItem('app_language');
    return (stored === 'id' || stored === 'en' || stored === 'bn') ? stored : 'id';
};

export const getText = (section: keyof typeof TRANSLATIONS['id'], key: string) => {
    const lang = getLang();
    return (TRANSLATIONS[lang][section] as any)[key] || (TRANSLATIONS['id'][section] as any)[key];
};
