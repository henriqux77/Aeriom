/* =========================================================
   AERIOM — SISTEMA CENTRAL DE TEMAS (js/theme.js)
   Fase de Refatoração: Atmosferas de Campanha (VTT)
========================================================= */
(function() {
    "use strict";

    // Dicionário Oficial de Temas da Campanha
    const AeriomThemes = {
        default: {
            name: "Obsidiana (Padrão)",
            backgroundUrl: "none",
            primary: "#d4af37", // Dourado Envelhecido
            accent: "#f26b1d",  // Laranja Fogo
            bg: "#09090b",      // Obsidiana
            surface: "rgba(24, 24, 27, 0.85)",
            surfaceRaised: "#1c1c21",
            surfaceHover: "#27272a",
            border: "rgba(255, 255, 255, 0.08)",
            borderStrong: "rgba(255, 255, 255, 0.15)",
            text: "#f4f4f5",
            muted: "#a1a1aa",
            overlay: "rgba(9, 9, 11, 0.75)"
        },
        forest: {
            name: "Floresta Profunda",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')", // Para ser substituído com URL real
            primary: "#4ade80", // Verde vibrante
            accent: "#facc15",  // Amarelo sol
            bg: "#052e16",      // Verde muito escuro
            surface: "rgba(6, 78, 59, 0.75)",
            surfaceRaised: "#065f46",
            surfaceHover: "#047857",
            border: "rgba(110, 231, 183, 0.15)",
            borderStrong: "rgba(110, 231, 183, 0.3)",
            text: "#ecfdf5",
            muted: "#a7f3d0",
            overlay: "rgba(2, 44, 34, 0.8)"
        },
        cave: {
            name: "Caverna Escura",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#94a3b8", // Prata/Cinza
            accent: "#38bdf8",  // Azul cristalino
            bg: "#0f172a",      // Ardósia escuro
            surface: "rgba(30, 41, 59, 0.85)",
            surfaceRaised: "#334155",
            surfaceHover: "#475569",
            border: "rgba(148, 163, 184, 0.15)",
            borderStrong: "rgba(148, 163, 184, 0.3)",
            text: "#f8fafc",
            muted: "#cbd5e1",
            overlay: "rgba(15, 23, 42, 0.85)"
        },
        volcano: {
            name: "Vulcão Ativo",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#fb923c", // Laranja
            accent: "#ef4444",  // Vermelho incandescente
            bg: "#450a0a",      // Vermelho super escuro (carvão/brasa)
            surface: "rgba(127, 29, 29, 0.7)",
            surfaceRaised: "#991b1b",
            surfaceHover: "#b91c1c",
            border: "rgba(252, 165, 165, 0.15)",
            borderStrong: "rgba(252, 165, 165, 0.3)",
            text: "#fef2f2",
            muted: "#fecaca",
            overlay: "rgba(69, 10, 10, 0.8)"
        },
        castle: {
            name: "Castelo Antigo",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#fcd34d", // Dourado claro
            accent: "#9f1239",  // Vinho profundo
            bg: "#1c1917",      // Pedra escura
            surface: "rgba(41, 37, 36, 0.85)",
            surfaceRaised: "#44403c",
            surfaceHover: "#57534e",
            border: "rgba(214, 211, 209, 0.1)",
            borderStrong: "rgba(214, 211, 209, 0.25)",
            text: "#fafaf9",
            muted: "#d6d3d1",
            overlay: "rgba(28, 25, 23, 0.85)"
        },
        coast: {
            name: "Costa Sombria",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#67e8f9", // Ciano fantasmagórico
            accent: "#fde047",  // Areia
            bg: "#083344",      // Petróleo escuro
            surface: "rgba(22, 78, 99, 0.75)",
            surfaceRaised: "#155e75",
            surfaceHover: "#0e7490",
            border: "rgba(165, 243, 252, 0.15)",
            borderStrong: "rgba(165, 243, 252, 0.3)",
            text: "#ecfeff",
            muted: "#cffafe",
            overlay: "rgba(8, 51, 68, 0.75)"
        },
        ruins: {
            name: "Ruínas Esquecidas",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#a3e635", // Verde musgo claro
            accent: "#d97706",  // Bronze oxidado
            bg: "#171717",      // Cinza neutro escuro
            surface: "rgba(38, 38, 38, 0.85)",
            surfaceRaised: "#404040",
            surfaceHover: "#525252",
            border: "rgba(163, 163, 163, 0.15)",
            borderStrong: "rgba(163, 163, 163, 0.3)",
            text: "#f5f5f5",
            muted: "#d4d4d4",
            overlay: "rgba(23, 23, 23, 0.85)"
        }
    };

    const ThemeManager = {
        themes: AeriomThemes,
        
        applyTheme: function(themeId, customBackgroundUrl = null) {
            const root = document.documentElement;
            // Fallback silencioso para o tema padrão se o ID não existir
            const theme = this.themes[themeId] || this.themes['default'];

            // Atualiza as variáveis CSS que alimentam o UI (Layer 2)
            root.style.setProperty('--theme-primary', theme.primary);
            root.style.setProperty('--theme-accent', theme.accent);
            root.style.setProperty('--theme-bg', theme.bg);
            root.style.setProperty('--theme-surface', theme.surface);
            root.style.setProperty('--theme-surface-raised', theme.surfaceRaised);
            root.style.setProperty('--theme-surface-hover', theme.surfaceHover);
            root.style.setProperty('--theme-border', theme.border);
            root.style.setProperty('--theme-border-strong', theme.borderStrong);
            root.style.setProperty('--theme-text', theme.text);
            root.style.setProperty('--theme-muted', theme.muted);
            
            // Atualiza o background e o overlay (Layers 0 e 1)
            const finalBg = customBackgroundUrl ? `url('${customBackgroundUrl}')` : theme.backgroundUrl;
            root.style.setProperty('--theme-background-image', finalBg);
            root.style.setProperty('--theme-overlay', theme.overlay);
        },

        // Utilidade para preencher o Select do Mestre na Interface (campanha.html)
        getThemeOptions: function() {
            return Object.keys(this.themes).map(key => ({
                id: key,
                name: this.themes[key].name
            }));
        }
    };

    window.AeriomThemeManager = ThemeManager;

})();
