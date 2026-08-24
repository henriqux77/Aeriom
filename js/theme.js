/* =========================================================
   AERIOM — GERENCIADOR DE TEMAS E ATMOSFERA (js/theme.js)
   Fase 2: Prevenção de FOUC, Correção de null body e Tokens
========================================================= */
(function() {
    "use strict";

    // =========================================================
    // 1. DICIONÁRIO DE TEMAS DISPONÍVEIS
    // =========================================================
    const AeriomThemes = {
        default: {
            name: "Obsidiana (Padrão)",
            primary: "#d4af37",          // Dourado Envelhecido / Bronze
            primaryHover: "#f1cf5b",
            bg: "#09090b",               // Obsidiana
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
            const root = document.documentElement; // Aplicação síncrona no :root para evitar FOUC

            // Injeção utilizando exclusivamente o novo sistema de tokens (--color-*)
            root.style.setProperty('--color-primary', theme.primary);
            root.style.setProperty('--color-primary-hover', theme.primaryHover);
            
            const rgbString = hexToRgbString(theme.primary);
            root.style.setProperty('--color-primary-muted', `rgba(${rgbString}, 0.15)`);
            root.style.setProperty('--color-border-focus', `rgba(${rgbString}, 0.5)`);

            root.style.setProperty('--color-bg', theme.bg);
            root.style.setProperty('--color-surface', theme.surface);

            localStorage.setItem('aeriom_active_theme', themeId);

            // A manipulação da imagem de fundo exige o document.body
            const applyBackground = () => {
                if (theme.backgroundImage) {
                    document.body.style.setProperty('--campaign-background-image', theme.backgroundImage);
                } else {
                    document.body.style.setProperty('--campaign-background-image', 'none');
                }
                
                // Dispara o evento para módulos dependentes (ex: Motor de dados, se houver)
                document.dispatchEvent(new CustomEvent('aeriomThemeChanged', { detail: { themeId: themeId, theme: theme } }));
            };

            // Proteção crírica: se o body já existe aplica direto, senão aguarda o DOMContentLoaded
            if (document.body) {
                applyBackground();
            } else {
                document.addEventListener('DOMContentLoaded', applyBackground);
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
    
    // Executa a inicialização imediatamente (no <head>). 
    // Como implementámos a proteção, as variáveis no :root são aplicadas e previnem FOUC, 
    // mas o body.style só é alterado quando o body existir.
    ThemeManager.init();

})();
