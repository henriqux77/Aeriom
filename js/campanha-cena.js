/* =========================================================
   AERIOM — MÓDULO DE CENAS E IMERSÃO (js/campanha-cena.js)
   Fase 5: Modo Cinematográfico Seguro e Sincronizado
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;

    // Elementos UI da Cena
    const overlay = document.getElementById('globalSceneOverlay');
    const bgEl = document.getElementById('sceneBackground');
    const titleEl = document.getElementById('sceneDisplayTitle');
    const descEl = document.getElementById('sceneDisplayDesc');
    const closeBtn = document.getElementById('closeSceneViewBtn');
    const indicator = document.getElementById('activeSceneIndicator');

    // =========================================================
    // 1. INICIALIZAÇÃO
    // =========================================================
    window.initSceneSystem = async function(_supabase, _campaignId) {
        supabase = _supabase;
        campaignId = _campaignId;

        attachSceneEvents();
        setupSceneRealtime();
        await loadCurrentScene();
    };

    // =========================================================
    // 2. CARREGAMENTO E SINCROMIZAÇÃO DO ESTADO
    // =========================================================
    async function loadCurrentScene() {
        try {
            const { data, error } = await supabase
                .from('campaign_session')
                .select('*')
                .eq('campaign_id', campaignId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error; // Ignora erro se não existir sessão registada ainda

            if (data && data.is_scene_active) {
                presentScene(data.scene_title, data.scene_desc, data.scene_image);
            } else {
                hideScene();
            }
        } catch (err) {
            console.error("Erro ao carregar o estado da cena:", err);
        }
    }

    function setupSceneRealtime() {
        supabase.channel('scene-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_session', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                const data = payload.new;
                if (data && data.is_scene_active) {
                    presentScene(data.scene_title, data.scene_desc, data.scene_image);
                } else {
                    hideScene();
                }
            })
            .subscribe();
    }

    // =========================================================
    // 3. RENDERIZAÇÃO SEGURA (Anti-XSS)
    // =========================================================
    function presentScene(title, desc, imageUrl) {
        if (!overlay) return;

        // Injeção cega e segura como texto puro
        if (titleEl) titleEl.textContent = title || "Cena Sem Título";
        if (descEl) descEl.textContent = desc || "";

        // O único estilo inline permitido é a imagem de fundo dinâmica
        if (bgEl) {
            if (imageUrl && imageUrl.trim() !== '') {
                bgEl.style.backgroundImage = `url('${imageUrl}')`;
            } else {
                bgEl.style.backgroundImage = 'none';
            }
        }

        overlay.classList.add('active');
        if (indicator) indicator.hidden = false;
    }

    function hideScene() {
        if (overlay) overlay.classList.remove('active');
        if (indicator) indicator.hidden = true;
        
        // Limpa o conteúdo após a transição de CSS terminar para não piscar
        setTimeout(() => {
            if (bgEl) bgEl.style.backgroundImage = 'none';
            if (titleEl) titleEl.textContent = '';
            if (descEl) descEl.textContent = '';
        }, 500); 
    }

    // =========================================================
    // 4. EVENTOS (Mestre e Jogador)
    // =========================================================
    function attachSceneEvents() {
        // --- Controlos do Mestre ---
        document.getElementById('startSceneBtn')?.addEventListener('click', async () => {
            const titleInput = document.getElementById('sceneTitleInput');
            const descInput = document.getElementById('sceneDescInput');
            const imageInput = document.getElementById('sceneImageInput');

            const title = titleInput ? titleInput.value.trim() : "";
            const desc = descInput ? descInput.value.trim() : "";
            const image = imageInput ? imageInput.value.trim() : "";

            if (!title) {
                alert("A cena precisa de um título narrativo.");
                return;
            }

            const btn = document.getElementById('startSceneBtn');
            btn.disabled = true;
            btn.textContent = "A Iniciar...";

            try {
                await supabase.from('campaign_session').upsert({
                    campaign_id: campaignId,
                    is_scene_active: true,
                    scene_title: title,
                    scene_desc: desc,
                    scene_image: image
                });

                if (window.generateLog) window.generateLog(`O Mestre alterou o cenário: "${title}".`, 'scene');
            } catch (err) {
                console.error("Erro ao iniciar a cena:", err);
                alert("Falha ao comunicar com os jogadores.");
            } finally {
                btn.disabled = false;
                btn.textContent = "Apresentar Cena";
            }
        });

        document.getElementById('stopSceneBtn')?.addEventListener('click', async () => {
            try {
                await supabase.from('campaign_session').upsert({
                    campaign_id: campaignId,
                    is_scene_active: false
                });
                
                // Limpa os inputs do Mestre para a próxima cena
                const titleInput = document.getElementById('sceneTitleInput');
                const descInput = document.getElementById('sceneDescInput');
                const imageInput = document.getElementById('sceneImageInput');
                if (titleInput) titleInput.value = '';
                if (descInput) descInput.value = '';
                if (imageInput) imageInput.value = '';

                if (window.generateLog) window.generateLog(`A cena visual foi encerrada pelo Mestre.`, 'system');
            } catch (err) {
                console.error("Erro ao encerrar a cena:", err);
            }
        });

        // --- Controlos do Jogador ---
        // O jogador pode "minimizar" a cena localmente para consultar a ficha
        closeBtn?.addEventListener('click', () => {
            if (overlay) overlay.classList.remove('active');
        });

        // Se o indicador for clicado, volta a exibir a cena
        indicator?.addEventListener('click', () => {
            if (overlay) overlay.classList.add('active');
        });
    }

})();