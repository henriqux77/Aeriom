/* =========================================================
   AERION — MODO CENA (FASE C)
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;
    let currentSceneData = null;

    window.initSceneSystem = async function(_supabase, _campaignId) {
        supabase = _supabase;
        campaignId = _campaignId;

        await loadScene();
        setupSceneRealtime();
        attachMasterSceneEvents();
        attachPlayerSceneEvents();
    };

    async function loadScene() {
        const { data } = await supabase.from('campaign_scenes').select('*').eq('campaign_id', campaignId).maybeSingle();
        currentSceneData = data;
        updateSceneUI();
    }

    function setupSceneRealtime() {
        supabase.channel('scene-events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_scenes', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                const wasActive = currentSceneData?.is_active;
                currentSceneData = payload.new;
                
                // Se a cena acabou de ser ativada, força a abertura do overlay
                if (currentSceneData.is_active && !wasActive) {
                    const overlay = document.getElementById('globalSceneOverlay');
                    if(overlay) overlay.classList.add('active');
                }
                updateSceneUI();
            })
            .subscribe();
    }

    function updateSceneUI() {
        const overlay = document.getElementById('globalSceneOverlay');
        const activeIndicator = document.getElementById('activeSceneIndicator');
        
        if (!overlay || !activeIndicator) return;

        if (!currentSceneData || !currentSceneData.is_active) {
            overlay.classList.remove('active');
            activeIndicator.hidden = true;
            return;
        }

        // Preenche os dados
        document.getElementById('sceneDisplayTitle').textContent = currentSceneData.title;
        document.getElementById('sceneDisplayDesc').textContent = currentSceneData.description || '';
        
        const bg = document.getElementById('sceneBackground');
        if (currentSceneData.image_url) {
            bg.style.backgroundImage = `url('${currentSceneData.image_url}')`;
            bg.style.opacity = '0.4';
        } else {
            bg.style.backgroundImage = 'none';
            bg.style.opacity = '0';
        }

        // Mostra o indicador minimizado
        activeIndicator.hidden = false;
        activeIndicator.querySelector('span').textContent = `Cena: ${currentSceneData.title}`;
    }

    function attachMasterSceneEvents() {
        const startBtn = document.getElementById('startSceneBtn');
        const stopBtn = document.getElementById('stopSceneBtn');

        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                const title = document.getElementById('sceneTitleInput').value.trim() || 'Nova Cena';
                const desc = document.getElementById('sceneDescInput').value.trim();
                const image = document.getElementById('sceneImageInput').value.trim();

                const btnText = startBtn.textContent;
                startBtn.textContent = 'Enviando...';
                startBtn.disabled = true;

                await supabase.from('campaign_scenes').upsert({
                    campaign_id: campaignId,
                    title: title,
                    description: desc,
                    image_url: image,
                    is_active: true,
                    updated_at: new Date().toISOString()
                });

                if(window.generateLog) window.generateLog(`O Mestre iniciou a cena: "${title}"`, 'scene');

                startBtn.textContent = btnText;
                startBtn.disabled = false;
                
                // Abre o overlay para o próprio mestre também
                document.getElementById('globalSceneOverlay')?.classList.add('active');
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', async () => {
                await supabase.from('campaign_scenes').upsert({
                    campaign_id: campaignId,
                    is_active: false,
                    updated_at: new Date().toISOString()
                });
                if(window.generateLog) window.generateLog(`Cena encerrada.`, 'scene');
            });
        }
    }

    function attachPlayerSceneEvents() {
        // Botão de minimizar a cena (voltar a ver a ficha)
        document.getElementById('closeSceneViewBtn')?.addEventListener('click', () => {
            document.getElementById('globalSceneOverlay').classList.remove('active');
        });

        // Botão indicador para reabrir a cena
        document.getElementById('activeSceneIndicator')?.addEventListener('click', () => {
            document.getElementById('globalSceneOverlay').classList.add('active');
        });
    }
})();
