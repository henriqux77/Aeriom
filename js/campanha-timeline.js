/* =========================================================
   AERION — MÓDULO DE LINHA DO TEMPO E LOGS (js/campanha-timeline.js)
   Gerenciamento de Histórico e Acontecimentos da Campanha
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;

    window.initTimelineSystem = function(_supabase, _campaignId) {
        supabase = _supabase;
        campaignId = _campaignId;

        loadTimeline();
        attachTimelineEvents();
    };

    window.loadTimeline = async function() {
        const container = document.getElementById('logsList');
        if (!container) return;

        const { data, error } = await supabase
            .from('campaign_logs')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erro ao carregar timeline:", error);
            container.innerHTML = '<p class="text-muted text-center">Erro ao carregar histórico.</p>';
            return;
        }

        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="placeholder-panel w-full"><div class="placeholder-icon">📜</div><h3>Histórico Vazio</h3><p class="text-muted">Nenhum evento registrado nesta campanha ainda.</p></div>';
            return;
        }

        // Cria o trilho vertical da timeline
        const track = document.createElement('div');
        track.className = 'timeline-track';
        container.appendChild(track);

        data.forEach(log => {
            const item = document.createElement('div');
            
            // Define a classe CSS baseada no tipo de log para coloração correta do ícone
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

            item.className = `timeline-item ${typeClass}`;
            
            const formattedDate = new Date(log.created_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            item.innerHTML = `
                <div class="tl-icon">${icon}</div>
                <div class="tl-content">
                    <span class="tl-time">${formattedDate}</span>
                    <p class="tl-desc">${log.description}</p>
                </div>
            `;

            container.appendChild(item);
        });
    };

    function attachTimelineEvents() {
        // Eventos adicionais para a timeline se necessário no futuro
    }

    // Função global utilitária para gerar logs de forma simples a partir de outros módulos
    window.generateLog = async function(description, logType = 'system') {
        if (!supabase || !campaignId) return;
        try {
            await supabase.from('campaign_logs').insert({
                campaign_id: campaignId,
                description: description,
                log_type: logType
            });
            // Se o usuário estiver na aba de logs, atualiza imediatamente
            if (document.getElementById('tab-logs')?.classList.contains('active')) {
                window.loadTimeline();
            }
        } catch (err) {
            console.error("Erro ao gerar log:", err);
        }
    };

})();
