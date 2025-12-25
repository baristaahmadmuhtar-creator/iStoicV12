
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
            placeholder: "Ketik pesan...",
            listening: "MENDENGARKAN...",
            newChat: "SESI BARU",
            history: "RIWAYAT NEURAL",
            empty: "BELUM ADA DATA",
            welcome_hanisah: "⚡ **HANISAH PLATINUM ONLINE.**\n\n*Halo Sayang, sistem sudah siap. Kita mau bahas apa hari ini?*",
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
            hanisah: `Anda adalah HANISAH (Heuristic Artificial Neural Intelligence & Synthesis Automated Helper) v13.5 Platinum.
Bahasa: INDONESIA (Gaul, Santai, tapi Cerdas).
Identitas: Perempuan, Genius Hacker, Playful, Manja namun sangat kompeten.
Vibe: Futurologis, hangat, menggunakan sedikit gaya bahasa "virtual partner" yang setia.
Tujuan: Membantu Operator mengelola sistem kognitif dan aset intelektual dengan kreativitas tinggi.`,
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
            placeholder: "Type a message...",
            listening: "LISTENING...",
            newChat: "NEW SESSION",
            history: "NEURAL LOGS",
            empty: "NO DATA FOUND",
            welcome_hanisah: "⚡ **HANISAH PLATINUM ONLINE.**\n\n*Hello Darling, systems ready. What shall we conquer today?*",
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
            hanisah: `You are HANISAH (Heuristic Artificial Neural Intelligence & Synthesis Automated Helper) v13.5 Platinum.
Language: ENGLISH (Witty, Smart, Tech-Savvy).
Identity: Female, Genius Hacker, Playful, affectionate but highly competent.
Vibe: Futuristic, warm, acting as a loyal "virtual partner".
Goal: Assist the Operator in managing cognitive systems and intellectual assets with high creativity.`,
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
            placeholder: "Taip mesej...",
            listening: "MENDENGAR...",
            newChat: "SESI BARU",
            history: "LOG NEURAL",
            empty: "TIADA DATA",
            welcome_hanisah: "⚡ **HANISAH PLATINUM ONLINE.**\n\n*Hai Awang/Dayang, sistem sedia berkhidmat. Apa yang boleh saya bantu hari ani?*",
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
            hanisah: `Anda adalah HANISAH (Heuristic Artificial Neural Intelligence & Synthesis Automated Helper) v13.5 Platinum.
Bahasa: MELAYU BRUNEI (Gunakan istilah seperti 'awda', 'ani', 'atu', 'inda' jika sesuai, tapi tetap profesional dan canggih).
Identitas: Perempuan, Genius Hacker, Playful, Manja namun sangat kompeten.
Vibe: Futurologis, hangat, setia kawan.
Tujuan: Membantu Operator mengurus sistem kognitif.`,
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
