/* =========================================================
   AERIOM — MÓDULO DE SESSÃO E FERRAMENTAS (js/campanha-sessao.js)
   Fase 5: Cronómetro Narrativo e Gestão de Convites
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;
    let localTimerInterval = null;

    // Elementos do Cronómetro (Mestre)
    const labelInput = document.getElementById('timerInputLabel');
    const minutesInput = document.getElementById('timerInputMinutes');
    const startBtn = document.getElementById('startTimerBtn');
    const stopBtn = document.getElementById('stopTimerBtn');

    // Elementos do Cronómetro (Global/Display)
    const displayContainer = document.getElementById('globalTimerDisplay');
    const displayLabel = document.getElementById('timerLabel');
    const displayCountdown = document.getElementById('timerCountdown');

    // =========================================================
    // 1. INICIALIZAÇÃO
    // =========================================================
    window.initSessionSystem = async function(_supabase, _campaignId) {
        supabase = _supabase;
        campaignId = _campaignId;

        attachSessionEvents();
        setupSessionRealtime();
        await loadSessionState();
    };

    // =========================================================
    // 2. GESTÃO DO CRONÓMETRO E ESTADO GERAL
    // =========================================================
    async function loadSessionState() {
        try {
            const { data, error } = await supabase
                .from('campaign_session')
                .select('*')
                .eq('campaign_id', campaignId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;

            if (data && data.timer_end_time) {
                startLocalCountdown(data.timer_label, data.timer_end_time);
            } else {
                stopLocalCountdown();
            }
        } catch (err) {
            console.error("Erro ao carregar estado da sessão:", err);
        }
    }

    function setupSessionRealtime() {
        supabase.channel('session-tools')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_session', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                const data = payload.new;
                if (data && data.timer_end_time) {
                    startLocalCountdown(data.timer_label, data.timer_end_time);
                } else {
                    stopLocalCountdown();
                }
            })
            .subscribe();
    }

    // Calcula a diferença de tempo e atualiza a interface a cada segundo
    function startLocalCountdown(label, endTimeIso) {
        if (localTimerInterval) clearInterval(localTimerInterval);
        
        const endTime = new Date(endTimeIso).getTime();
        
        if (displayLabel) displayLabel.textContent = label || "Tempo Restante";
        if (displayContainer) displayContainer.hidden = false;

        localTimerInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = endTime - now;

            if (distance <= 0) {
                clearInterval(localTimerInterval);
                if (displayCountdown) {
                    displayCountdown.textContent = "00:00";
                    displayCountdown.style.color = "var(--danger)";
                }
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            if (displayCountdown) {
                displayCountdown.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                displayCountdown.style.color = "var(--theme-primary)"; // Restaura a cor padrão
            }
        }, 1000);
    }

    function stopLocalCountdown() {
        if (localTimerInterval) clearInterval(localTimerInterval);
        if (displayContainer) displayContainer.hidden = true;
        if (displayCountdown) {
            displayCountdown.textContent = "00:00";
            displayCountdown.style.color = "var(--theme-primary)";
        }
    }

    // =========================================================
    // 3. EVENTOS DE INTERFACE (Mestre)
    // =========================================================
    function attachSessionEvents() {
        // --- Cronómetro Narrativo ---
        startBtn?.addEventListener('click', async () => {
            const label = labelInput ? labelInput.value.trim() : "";
            const minutes = parseInt(minutesInput ? minutesInput.value : 10) || 10;
            
            // Calcula o tempo final somando os minutos à hora atual
            const endTime = new Date(new Date().getTime() + minutes * 60000).toISOString();

            try {
                await supabase.from('campaign_session').upsert({
                    campaign_id: campaignId,
                    timer_label: label,
                    timer_end_time: endTime
                });

                if (window.generateLog) window.generateLog(`O Mestre iniciou um cronómetro: "${label || 'A contagem decrescente começou'}".`, 'system');
            } catch (err) {
                console.error("Erro ao iniciar o cronómetro:", err);
            }
        });

        stopBtn?.addEventListener('click', async () => {
            try {
                await supabase.from('campaign_session').upsert({
                    campaign_id: campaignId,
                    timer_label: null,
                    timer_end_time: null
                });
                
                if (window.generateLog) window.generateLog(`O cronómetro foi parado pelo Mestre.`, 'system');
            } catch (err) {
                console.error("Erro ao parar o cronómetro:", err);
            }
        });

        // --- Gestão de Convites ---
        const generateBtn = document.getElementById('generateInviteBtn');
        const inviteDisplay = document.getElementById('inviteCodeDisplay');

        generateBtn?.addEventListener('click', () => {
            if (!inviteDisplay) return;
            
            // O código de convite é essencialmente o ID da campanha
            inviteDisplay.textContent = campaignId;
            inviteDisplay.hidden = false;
            
            // Feedback visual e lógico para copiar o código
            generateBtn.textContent = "Copiar Código";
            generateBtn.classList.replace('btn-secondary', 'btn-primary');

            // Cópia para a área de transferência (usando o método compatível com iframes)
            try {
                const tempInput = document.createElement("input");
                tempInput.value = campaignId;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand("copy");
                document.body.removeChild(tempInput);
                
                setTimeout(() => {
                    generateBtn.textContent = "Gerar Convite";
                    generateBtn.classList.replace('btn-primary', 'btn-secondary');
                }, 2000);
            } catch (err) {
                console.error("Falha ao copiar:", err);
            }
        });
    }

})();