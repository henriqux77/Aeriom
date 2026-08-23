/* =========================================================
   AERIOM — GERENCIADOR DE TEMAS E ATMOSFERA (js/theme.js)
   Correção de Integração: Tokens Unificados e Prevenção FOUC
========================================================= */
(function() {
    "use strict";

    // =========================================================
    // 1. DICIONÁRIO DE TEMAS DISPONÍVEIS
    // =========================================================
    const AeriomThemes = {
        default: {
            name: "Obsidiana (Padrão)",
            primary: "#d4af37",          // Bronze/Dourado Escuro
            primaryHover: "#f1cf5b",
            bg: "#09090b",               // Carvão
            surface: "rgba(24, 24, 27, 0.85)", 
            backgroundImage: ""          
        },
        forest: {
            name: "Floresta Antiga",
            primary: "#4ade80",
            primaryHover: "#86efac",
            bg: "#051006",
            surface: "rgba(10, 20, 12, 0.85)",
            backgroundImage: "url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=2000')"
        }
    };

    // =========================================================
    // 2. FUNÇÕES UTILITÁRIAS
    // =========================================================
    function hexToRgbString(hex) {
        let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            "212, 175, 55"; 
    }

    // =========================================================
    // 3. LÓGICA DO GERENCIADOR DE TEMAS
    // =========================================================
    const ThemeManager = {
        
        getAvailableThemes: function() {
            return Object.keys(AeriomThemes).map(key => ({
                id: key,
                name: AeriomThemes[key].name
            }));
        },

        applyTheme: function(themeId) {
            const theme = AeriomThemes[themeId] || AeriomThemes.default;
            const root = document.documentElement; // :root garante injeção síncrona no <head>

            // Injeção usando o novo sistema arquitetural de tokens (--color-*)
            root.style.setProperty('--color-primary', theme.primary);
            root.style.setProperty('--color-primary-hover', theme.primaryHover);
            
            const rgbString = hexToRgbString(theme.primary);
            root.style.setProperty('--color-primary-muted', `rgba(${rgbString}, 0.15)`);
            root.style.setProperty('--color-border-focus', `rgba(${rgbString}, 0.5)`);

            root.style.setProperty('--color-bg', theme.bg);
            root.style.setProperty('--color-surface', theme.surface);

            localStorage.setItem('aeriom_active_theme', themeId);

            // Injeção dinâmica da variável CSS de background, delegando o controle real ao style.css
            const applyBackground = () => {
                if (theme.backgroundImage) {
                    document.body.style.setProperty('--campaign-background-image', theme.backgroundImage);
                } else {
                    document.body.style.setProperty('--campaign-background-image', 'none');
                }
            };

            // Proteção contra chamadas antes do DOM existir (ex: no <head>)
            if (document.body) {
                applyBackground();
            } else {
                document.addEventListener('DOMContentLoaded', applyBackground);
            }
            
            // Disparo de Evento para módulos que precisem reagir (ex: Canvas de Dados)
            const dispatchEventSafe = () => {
                document.dispatchEvent(new CustomEvent('aeriomThemeChanged', { detail: { themeId: themeId, theme: theme } }));
            };

            if (document.body) {
                dispatchEventSafe();
            } else {
                document.addEventListener('DOMContentLoaded', dispatchEventSafe);
            }
        },

        setCustomAtmosphere: function(imageUrl) {
            const apply = () => {
                if (imageUrl) {
                    document.body.style.setProperty('--campaign-background-image', `url('${imageUrl}')`);
                } else {
                    document.body.style.setProperty('--campaign-background-image', 'none');
                }
            };
            
            if (document.body) apply();
            else document.addEventListener('DOMContentLoaded', apply);
        },

        init: function() {
            const savedTheme = localStorage.getItem('aeriom_active_theme') || 'default';
            this.applyTheme(savedTheme);
        }
    };

    window.AeriomThemeManager = ThemeManager;
    ThemeManager.init(); // Executa imediatamente para prevenir Flash of Unstyled Content (FOUC)

})();
