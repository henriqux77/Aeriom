/* =========================================================
   AERION — CRONÔMETRO E SESSÃO (FASE B)
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;
    let timerInterval = null;
    let currentTimerData = null;

    window.initSessionSystem = async function(_supabase, _campaignId) {
        supabase = _supabase;
        campaignId = _campaignId;
        await loadTimer();
        setupTimerRealtime();
        attachMasterTimerEvents();
    };

    async function loadTimer() {
        const { data } = await supabase.from('campaign_timers').select('*').eq('campaign_id', campaignId).maybeSingle();
        currentTimerData = data;
        updateTimerUI();
    }

    function setupTimerRealtime() {
        supabase.channel('timer-events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_timers', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                currentTimerData = payload.new;
                updateTimerUI();
            })
            .subscribe();
    }

    function updateTimerUI() {
        const display = document.getElementById('globalTimerDisplay');
        if (!display) return;

        clearInterval(timerInterval);

        if (!currentTimerData || !currentTimerData.is_active || !currentTimerData.end_time) {
            display.hidden = true;
            return;
        }

        display.hidden = false;
        document.getElementById('timerLabel').textContent = currentTimerData.label;

        timerInterval = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(currentTimerData.end_time).getTime();
            const distance = end - now;

            if (distance <= 0) {
                clearInterval(timerInterval);
                document.getElementById('timerCountdown').textContent = "00:00";
                document.getElementById('timerCountdown').style.color = "var(--fire)";
            } else {
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                document.getElementById('timerCountdown').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                document.getElementById('timerCountdown').style.color = "var(--gold)";
            }
        }, 1000);
    }

    function attachMasterTimerEvents() {
        const startBtn = document.getElementById('startTimerBtn');
        const stopBtn = document.getElementById('stopTimerBtn');
        
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                const label = document.getElementById('timerInputLabel').value || 'Tempo Narrativo';
                const minutes = parseInt(document.getElementById('timerInputMinutes').value) || 10;
                
                const endTime = new Date();
                endTime.setMinutes(endTime.getMinutes() + minutes);

                await supabase.from('campaign_timers').upsert({
                    campaign_id: campaignId,
                    label: label,
                    duration_seconds: minutes * 60,
                    end_time: endTime.toISOString(),
                    is_active: true
                });

                if(window.generateLog) window.generateLog(`O Mestre iniciou um cronômetro: ${label} (${minutes} min).`, 'system');
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', async () => {
                await supabase.from('campaign_timers').upsert({
                    campaign_id: campaignId,
                    is_active: false
                });
                if(window.generateLog) window.generateLog(`O cronômetro foi parado.`, 'system');
            });
        }
    }
})();
