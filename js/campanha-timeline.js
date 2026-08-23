/* =========================================================
   AERION — LINHA DO TEMPO E ROLAGENS (FASE A)
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;

    window.initTimelineSystem = async function(_supabase, _campaignId) {
        supabase = _supabase;
        campaignId = _campaignId;
        await window.loadTimeline();
    };

    // Função Global de Geração de Logs
    window.generateLog = async function(description, type = 'system') {
        if(!supabase || !campaignId) return;
        try {
            await supabase.from('campaign_logs').insert({ 
                campaign_id: campaignId, 
                description: description, 
                log_type: type 
            });
        } catch (e) {
            console.error("Falha ao salvar log na linha do tempo", e);
        }
    };

    // Renderiza a Linha do Tempo
    window.loadTimeline = async function() {
        const logsList = document.getElementById("logsList");
        if (!logsList) return;

        try {
            const { data, error } = await supabase.from('campaign_logs')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                logsList.innerHTML = '<p style="color: var(--cream-muted); text-align: center; margin-top: 20px;">A história deste mundo ainda não começou.</p>';
                return;
            }

            logsList.innerHTML = '<div class="timeline-track"></div>';
            
            data.forEach(log => {
                const date = new Date(log.created_at);
                const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                let icon = '⚙️';
                let colorClass = 'tl-system';
                
                // Mapeamento de categorias visuais
                if(log.log_type === 'roll') { icon = '🎲'; colorClass = 'tl-roll'; }
                else if(log.log_type === 'request_roll') { icon = '🎲'; colorClass = 'tl-request'; }
                else if(log.log_type === 'combat') { icon = '⚔️'; colorClass = 'tl-combat'; }
                else if(log.log_type === 'damage') { icon = '🩸'; colorClass = 'tl-damage'; }
                else if(log.log_type === 'heal') { icon = '💚'; colorClass = 'tl-heal'; }
                else if(log.log_type === 'cozinha') { icon = '🍲'; colorClass = 'tl-cozinha'; }
                else if(log.log_type === 'scene') { icon = '🎭'; colorClass = 'tl-scene'; }
                else if(log.log_type === 'loot') { icon = '💎'; colorClass = 'tl-loot'; }

                const item = document.createElement('div');
                item.className = `timeline-item ${colorClass}`;
                item.innerHTML = `
                    <div class="tl-icon">${icon}</div>
                    <div class="tl-content">
                        <span class="tl-time">${timeStr}</span>
                        <p class="tl-desc">${log.description}</p>
                    </div>
                `;
                logsList.appendChild(item);
            });
        } catch (e) {
            console.error(e);
            logsList.innerHTML = '<p style="color: #d46a4a;">Erro ao carregar o diário do mundo.</p>';
        }
    };

    // Rolagem Cinematográfica
    window.showCinematicRoll = function(title, subtitle, resultText) {
        const overlay = document.getElementById('cinematicRollOverlay');
        if(!overlay) return;
        
        document.getElementById('cineRollTitle').textContent = title;
        document.getElementById('cineRollSubtitle').textContent = subtitle;
        document.getElementById('cineRollResult').textContent = resultText;
        
        overlay.classList.add('active');
        
        // Remove automaticamente após 3 segundos
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 3000); 
    };

})();
