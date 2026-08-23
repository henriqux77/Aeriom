/* =========================================================
   AERIOM — GERENCIADOR DE TEMAS E ATMOSFERA (js/theme.js)
   Fase 0: Correção de Race Condition e Prevenção de FOUC
========================================================= */
(function() {
    "use strict";

    // =========================================================
    // 1. DICIONÁRIO DE TEMAS DISPONÍVEIS
    // (Mantidos simples por enquanto, foco na estabilidade)
    // =========================================================
    const AeriomThemes = {
        default: {
            name: "Obsidiana (Padrão)",
            primary: "#d4af37",          // Dourado
            primaryHover: "#f1cf5b",
            bg: "#09090b",               // Obsidiana
            surface: "rgba(24, 24, 27, 0.85)", 
            backgroundImage: ""          // Sem imagem padrão
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
    // 3. LÓGICA DO GERENCIADOR DE TEMAS (À PROVA DE FALHAS)
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
            const root = document.documentElement; // :root (sempre existe, mesmo no <head>)

            // 3.1 INJEÇÃO SÍNCRONA DE CORES (Evita FOUC)
            root.style.setProperty('--theme-primary', theme.primary);
            root.style.setProperty('--theme-primary-hover', theme.primaryHover);
            
            const rgbString = hexToRgbString(theme.primary);
            root.style.setProperty('--theme-primary-soft', `rgba(${rgbString}, 0.15)`);
            root.style.setProperty('--theme-border-focus', `rgba(${rgbString}, 0.5)`);

            root.style.setProperty('--theme-bg', theme.bg);
            root.style.setProperty('--theme-surface', theme.surface);

            localStorage.setItem('aeriom_active_theme', themeId);

            // 3.2 INJEÇÃO ASSÍNCRONA DE BACKGROUND (Protege contra erro de body == null)
            const applyBackground = () => {
                if (theme.backgroundImage) {
                    document.body.style.backgroundImage = theme.backgroundImage;
                    document.body.style.boxShadow = "inset 0 0 0 2000px rgba(0, 0, 0, 0.7)";
                } else {
                    document.body.style.backgroundImage = 'none';
                    document.body.style.boxShadow = 'none';
                }
            };

            // Se o body já existir (ex: chamado pelo console), aplica direto.
            // Se não (carregamento inicial no <head>), agenda para quando o DOM estiver pronto.
            if (document.body) {
                applyBackground();
            } else {
                document.addEventListener('DOMContentLoaded', applyBackground);
            }
            
            // 3.3 DISPARO DE EVENTO SEGURO
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
                    document.body.style.backgroundImage = `url('${imageUrl}')`;
                    document.body.style.boxShadow = "inset 0 0 0 2000px rgba(0, 0, 0, 0.7)";
                } else {
                    document.body.style.backgroundImage = 'none';
                    document.body.style.boxShadow = 'none';
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
    ThemeManager.init(); // Inicia imediatamente, mas agora de forma segura.

})();
