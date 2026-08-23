/* =========================================================
   AERIOM — MÓDULO DE LINHA DO TEMPO E LOGS (js/campanha-timeline.js)
   Fase 5: Registo de Histórico Seguro e Desacoplado
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;

    // =========================================================
    // 1. UTILITÁRIOS SEGUROS
    // =========================================================
    function createSafeElement(tag, className, text = null) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== null && text !== undefined) el.textContent = text;
        return el;
    }

    // =========================================================
    // 2. INICIALIZAÇÃO
    // =========================================================
    window.initTimelineSystem = function(_supabase, _campaignId) {
        supabase = _supabase;
        campaignId = _campaignId;

        loadTimeline();
    };

    // =========================================================
    // 3. CARREGAMENTO E RENDERIZAÇÃO
    // =========================================================
    window.loadTimeline = async function() {
        const container = document.getElementById('logsList');
        if (!container) return;

        try {
            const { data, error } = await supabase
                .from('campaign_logs')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            container.innerHTML = '';

            if (!data || data.length === 0) {
                const emptyState = createSafeElement('div', 'placeholder-panel w-full');
                const emptyIcon = createSafeElement('div', 'placeholder-icon', '📜');
                const emptyTitle = createSafeElement('h3', '', 'Histórico Vazio');
                const emptyDesc = createSafeElement('p', 'text-muted', 'Nenhum evento registado nesta campanha até ao momento.');
                
                emptyState.appendChild(emptyIcon);
                emptyState.appendChild(emptyTitle);
                emptyState.appendChild(emptyDesc);
                container.appendChild(emptyState);
                return;
            }

            // Cria o trilho vertical da linha do tempo
            const track = createSafeElement('div', 'timeline-track');
            container.appendChild(track);

            // Renderiza os itens de forma segura
            data.forEach(log => {
                let typeClass = 'tl-system';
                let icon = '📜';

                switch (log.log_type) {
                    case 'combat':
                        typeClass = 'tl-combat';
                        icon = '⚔️';
                        break;
                    case 'roll':
                    case 'request_roll':
                        typeClass = 'tl-roll';
                        icon = '🎲';
                        break;
                    case 'cooking':
                        typeClass = 'tl-cozinha';
                        icon = '🍲';
                        break;
                    case 'scene':
                        typeClass = 'tl-scene';
                        icon = '🎭';
                        break;
                    default:
                        typeClass = 'tl-system';
                        icon = '📜';
                        break;
                }

                const item = createSafeElement('div', `timeline-item ${typeClass}`);
                
                // Formata a data para visualização (PT)
                const formattedDate = new Date(log.created_at).toLocaleString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // Ícone
                const iconDiv = createSafeElement('div', 'tl-icon', icon);
                
                // Conteúdo (Data e Descrição)
                const contentDiv = createSafeElement('div', 'tl-content');
                contentDiv.appendChild(createSafeElement('span', 'tl-time', formattedDate));
                contentDiv.appendChild(createSafeElement('p', 'tl-desc', log.description)); // Blindado contra XSS

                item.appendChild(iconDiv);
                item.appendChild(contentDiv);

                container.appendChild(item);
            });

        } catch (error) {
            console.error("Erro ao carregar a linha do tempo:", error);
            container.innerHTML = '';
            container.appendChild(createSafeElement('p', 'text-muted text-center', 'Erro ao carregar o histórico da aventura.'));
        }
    };

    // =========================================================
    // 4. FUNÇÃO GLOBAL PARA GERAÇÃO DE LOGS
    // =========================================================
    window.generateLog = async function(description, logType = 'system') {
        if (!supabase || !campaignId) return;
        try {
            await supabase.from('campaign_logs').insert({
                campaign_id: campaignId,
                description: description,
                log_type: logType
            });
            
            // Se o utilizador estiver no separador de logs, atualiza imediatamente
            const logsTab = document.getElementById('tab-logs');
            if (logsTab && logsTab.classList.contains('active')) {
                window.loadTimeline();
            }
        } catch (err) {
            console.error("Erro ao gerar log:", err);
        }
    };

})();