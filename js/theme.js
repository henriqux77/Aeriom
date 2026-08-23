/* =========================================================
   AERIOM — GERENCIADOR DE TEMAS E ATMOSFERA (js/theme.js)
   Controla a identidade visual dinâmica e injeção de CSS
========================================================= */
(function() {
    "use strict";

    // =========================================================
    // 1. DICIONÁRIO DE TEMAS DISPONÍVEIS
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
            primary: "#4ade80",          // Verde Fantasia
            primaryHover: "#86efac",
            bg: "#051006",               // Fundo musgo profundo
            surface: "rgba(10, 20, 12, 0.85)",
            // Exemplo de como URLs externas podem injetar clima (Usando uma imagem genérica de floresta dark)
            backgroundImage: "url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=2000')"
        },
        volcano: {
            name: "Forja Profunda",
            primary: "#fb923c",          // Laranja Magma
            primaryHover: "#fcd34d",
            bg: "#1a0505",               // Fundo vulcânico escuro
            surface: "rgba(30, 10, 10, 0.85)",
            backgroundImage: ""
        },
        cave: {
            name: "Cavernas de Cristal",
            primary: "#60a5fa",          // Azul Cristal
            primaryHover: "#93c5fd",
            bg: "#030712",               // Azul abissal
            surface: "rgba(10, 15, 25, 0.85)",
            backgroundImage: ""
        }
    };

    // =========================================================
    // 2. FUNÇÕES UTILITÁRIAS
    // =========================================================
    
    // Converte HEX puro para formato RGB (ex: "212, 175, 55") para uso com o rgba() no CSS
    function hexToRgbString(hex) {
        // Expande shorthand (ex: "03F") para full (ex: "0033FF")
        let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            "212, 175, 55"; // Fallback para Dourado Padrão
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
            const root = document.documentElement;

            // Injeta as cores principais diretamente no root do CSS
            root.style.setProperty('--theme-primary', theme.primary);
            root.style.setProperty('--theme-primary-hover', theme.primaryHover);
            
            // Injeta a versão translúcida com a opacidade correta (15%) para shadows e glows
            const rgbString = hexToRgbString(theme.primary);
            root.style.setProperty('--theme-primary-soft', `rgba(${rgbString}, 0.15)`);
            root.style.setProperty('--theme-border-focus', `rgba(${rgbString}, 0.5)`);

            // Injeta as cores de fundo
            root.style.setProperty('--theme-bg', theme.bg);
            root.style.setProperty('--theme-surface', theme.surface);

            // Controla a atmosfera do Background (Body)
            if (theme.backgroundImage) {
                document.body.style.backgroundImage = theme.backgroundImage;
                // Escurece um pouco o background pra não quebrar a leitura da interface
                document.body.style.boxShadow = "inset 0 0 0 2000px rgba(0, 0, 0, 0.7)";
            } else {
                document.body.style.backgroundImage = 'none';
                document.body.style.boxShadow = 'none';
            }

            // Salva o tema escolhido para a próxima visita
            localStorage.setItem('aeriom_active_theme', themeId);
            
            // Dispara evento global para que outros módulos saibam da mudança (se precisarem atualizar canvas, etc)
            document.dispatchEvent(new CustomEvent('aeriomThemeChanged', { detail: { themeId: themeId, theme: theme } }));
        },

        // Função para customizar apenas o fundo (Útil para o Mestre da Campanha mudar a tela da galera)
        setCustomAtmosphere: function(imageUrl) {
            if (imageUrl) {
                document.body.style.backgroundImage = `url('${imageUrl}')`;
                document.body.style.boxShadow = "inset 0 0 0 2000px rgba(0, 0, 0, 0.7)";
            } else {
                document.body.style.backgroundImage = 'none';
                document.body.style.boxShadow = 'none';
            }
        },

        init: function() {
            // Tenta recuperar o tema salvo, se não, usa o padrão
            const savedTheme = localStorage.getItem('aeriom_active_theme') || 'default';
            this.applyTheme(savedTheme);
        }
    };

    // Expor Globalmente
    window.AeriomThemeManager = ThemeManager;

    // Inicia imediatamente ao carregar o script para evitar FOUC (Flash of Unstyled Content)
    ThemeManager.init();

})();
