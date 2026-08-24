/* =========================================================
   AERIOM — SISTEMA CENTRAL DE TEMAS (js/theme.js)
   Fase de Redesign: Atmosferas Imersivas (Dark Fantasy)
========================================================= */
(function() {
    "use strict";

    // =========================================================
    // DICIONÁRIO DE ATMOSFERAS (PREMIUM RPG)
    // =========================================================
    const AeriomThemes = {
        default: {
            name: "Obsidiana (Padrão)",
            backgroundUrl: "none",
            primary: "#D4AF37", // Dourado Envelhecido
            accent: "#D97706",  // Bronze / Âmbar
            bg: "#0B0A0C",      // Carvão Profundo
            surface: "rgba(24, 23, 27, 0.85)",
            surfaceRaised: "#1E1D22",
            surfaceHover: "#26252B",
            border: "rgba(255, 255, 255, 0.06)",
            borderStrong: "rgba(212, 175, 55, 0.15)",
            text: "#E5E5E5",
            muted: "#A19F9D",
            overlay: "rgba(11, 10, 12, 0.85)"
        },
        forest: {
            name: "🌲 Floresta Profunda",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')", 
            primary: "#4ADE80", // Verde Musgo Vivo
            accent: "#D97706",  // Madeira / Bronze
            bg: "#0A1C15",      // Verde Sombrio
            surface: "rgba(6, 78, 59, 0.75)",
            surfaceRaised: "#064E3B",
            surfaceHover: "#047857",
            border: "rgba(74, 222, 128, 0.12)",
            borderStrong: "rgba(74, 222, 128, 0.25)",
            text: "#ECFDF5",
            muted: "#A7F3D0",
            overlay: "rgba(2, 44, 34, 0.88)"
        },
        cave: {
            name: "🕳️ Caverna Escura",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#94A3B8", // Cinza Prata
            accent: "#475569",  // Cinza Pedra Escuro
            bg: "#09090B",      // Escuridão Subterrânea
            surface: "rgba(39, 39, 42, 0.85)",
            surfaceRaised: "#27272A",
            surfaceHover: "#3F3F46",
            border: "rgba(148, 163, 184, 0.1)",
            borderStrong: "rgba(148, 163, 184, 0.2)",
            text: "#F8FAFC",
            muted: "#CBD5E1",
            overlay: "rgba(9, 9, 11, 0.9)"
        },
        volcano: {
            name: "🌋 Vulcão Ativo",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#F59E0B", // Âmbar / Laranja
            accent: "#9F1239",  // Vinho / Vermelho Queimado
            bg: "#2A0800",      // Carvão Quente
            surface: "rgba(67, 20, 7, 0.8)",
            surfaceRaised: "#431407",
            surfaceHover: "#7C2D12",
            border: "rgba(245, 158, 11, 0.15)",
            borderStrong: "rgba(245, 158, 11, 0.3)",
            text: "#FFF7ED",
            muted: "#FECACA",
            overlay: "rgba(42, 8, 0, 0.85)"
        },
        castle: {
            name: "🏰 Castelo Antigo",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#D4AF37", // Dourado Envelhecido
            accent: "#9F1239",  // Vinho Escuro (Nobreza)
            bg: "#1C1917",      // Pedra Sombria
            surface: "rgba(41, 37, 36, 0.85)",
            surfaceRaised: "#292524",
            surfaceHover: "#44403C",
            border: "rgba(212, 175, 55, 0.1)",
            borderStrong: "rgba(212, 175, 55, 0.25)",
            text: "#FAFAF9",
            muted: "#D6D3D1",
            overlay: "rgba(28, 25, 23, 0.88)"
        },
        coast: {
            name: "🌊 Costa Sombria",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#67E8F9", // Ciano Misterioso
            accent: "#D4AF37",  // Areia / Bronze
            bg: "#082F49",      // Azul Petróleo Profundo
            surface: "rgba(22, 78, 99, 0.8)",
            surfaceRaised: "#164E63",
            surfaceHover: "#0E7490",
            border: "rgba(103, 232, 249, 0.15)",
            borderStrong: "rgba(103, 232, 249, 0.3)",
            text: "#ECFEFF",
            muted: "#CFFAFE",
            overlay: "rgba(8, 47, 73, 0.85)"
        },
        ruins: {
            name: "☠️ Ruínas Esquecidas",
            backgroundUrl: "url('BACKGROUND_URL_AQUI')",
            primary: "#A3E635", // Verde Envelhecido / Musgo
            accent: "#D97706",  // Bronze Oxidado
            bg: "#171717",      // Cinza Neutro
            surface: "rgba(38, 38, 38, 0.85)",
            surfaceRaised: "#262626",
            surfaceHover: "#404040",
            border: "rgba(163, 230, 53, 0.12)",
            borderStrong: "rgba(163, 230, 53, 0.25)",
            text: "#F5F5F5",
            muted: "#D4D4D4",
            overlay: "rgba(23, 23, 23, 0.88)"
        }
    };

    // =========================================================
    // GERENCIADOR CENTRAL
    // =========================================================
    const ThemeManager = {
        themes: AeriomThemes,
        
        applyTheme: function(themeId, customBackgroundUrl = null) {
            const root = document.documentElement;
            // Fallback elegante caso o ID não exista ou seja apagado do banco
            const theme = this.themes[themeId] || this.themes['default'];

            // Injeta as variáveis de UI (Layer 2 e superiores)
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
            
            // Injeta o Background e Overlay Atmosférico (Layer 0 e 1)
            // Dá prioridade à capa customizada da campanha (customBackgroundUrl) se o Mestre forneceu
            const finalBg = customBackgroundUrl ? `url('${customBackgroundUrl}')` : theme.backgroundUrl;
            root.style.setProperty('--theme-background-image', finalBg);
            root.style.setProperty('--theme-overlay', theme.overlay);
        },

        getThemeOptions: function() {
            return Object.keys(this.themes).map(key => ({
                id: key,
                name: this.themes[key].name
            }));
        }
    };

    window.AeriomThemeManager = ThemeManager;

})();
