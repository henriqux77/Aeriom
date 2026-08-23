/* =========================================================
   AERION — MAPAS INTERATIVOS E PINS (FASE E)
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;
    let userRole = null;
    let currentMapMuralId = null;
    let currentPins = [];

    window.initMapSystem = function(_supabase, _campaignId, _userRole) {
        supabase = _supabase;
        campaignId = _campaignId;
        userRole = _userRole;
        attachMapEvents();
    };

    // Chamada pelo campanha.js quando clica no botão "Ver Mapa" do mural
    window.openInteractiveMap = async function(muralId, imageUrl, title) {
        currentMapMuralId = muralId;
        
        const modal = document.getElementById('mapViewModal');
        const imgEl = document.getElementById('mapInteractiveImage');
        document.getElementById('mapViewTitle').textContent = title;
        
        imgEl.src = imageUrl;
        modal.style.display = 'flex';

        await loadPins();
        setupMapRealtime();
    };

    async function loadPins() {
        const { data } = await supabase.from('campaign_map_pins').select('*').eq('mural_id', currentMapMuralId);
        currentPins = data || [];
        renderPins();
    }

    function setupMapRealtime() {
        // Subscreve apenas para os pins deste mural específico
        supabase.channel('map-pins')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_map_pins', filter: `mural_id=eq.${currentMapMuralId}` }, () => {
                loadPins();
            })
            .subscribe();
    }

    function renderPins() {
        const container = document.getElementById('mapPinsContainer');
        container.innerHTML = ''; // Limpa os pins anteriores

        currentPins.forEach(pin => {
            const pinEl = document.createElement('div');
            pinEl.className = `map-pin ${pin.is_hidden ? 'pin-hidden' : 'pin-revealed'}`;
            pinEl.style.left = `${pin.pos_x}%`;
            pinEl.style.top = `${pin.pos_y}%`;

            // O ícone do pin
            pinEl.innerHTML = `<div class="pin-marker">📍</div>`;

            // Tooltip (balão de informação)
            const tooltip = document.createElement('div');
            tooltip.className = 'pin-tooltip';
            
            let masterActions = '';
            if (userRole === 'master') {
                const toggleText = pin.is_hidden ? '👁️ Revelar aos Jogadores' : '🔒 Ocultar';
                masterActions = `
                    <hr style="border-color: rgba(200,100,50,0.3); margin: 8px 0;">
                    <button class="secondary-button" style="width: 100%; padding: 4px; font-size: 10px; margin-bottom: 5px;" onclick="window.togglePinVisibility('${pin.id}', ${!pin.is_hidden})">${toggleText}</button>
                    <button class="secondary-button" style="width: 100%; padding: 4px; font-size: 10px; border-color: rgba(188,48,28,0.5); color: #d46a4a;" onclick="window.deletePin('${pin.id}')">Excluir Pin</button>
                `;
            }

            tooltip.innerHTML = `
                <strong style="color:var(--gold); display:block; margin-bottom:4px; font-family:var(--display-font);">${pin.title}</strong>
                <span style="color:var(--cream); font-size:0.8rem; display:block; white-space: pre-wrap;">${pin.description || ''}</span>
                ${pin.is_hidden ? '<span style="color:#d46a4a; font-size:0.7rem; display:block; margin-top:5px;">(Oculto dos jogadores)</span>' : ''}
                ${masterActions}
            `;

            pinEl.appendChild(tooltip);
            
            // Lógica para abrir/fechar tooltip no clique (melhor para mobile)
            pinEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede de clicar no mapa atrás do pin
                document.querySelectorAll('.pin-tooltip.active').forEach(t => {
                    if (t !== tooltip) t.classList.remove('active');
                });
                tooltip.classList.toggle('active');
            });

            container.appendChild(pinEl);
        });
    }

    function attachMapEvents() {
        const modal = document.getElementById('mapViewModal');
        const mapArea = document.getElementById('mapInteractiveArea');
        const pinFormModal = document.getElementById('createPinModal');
        
        // Fechar Modal do Mapa
        document.getElementById('closeMapViewBtn')?.addEventListener('click', () => {
            modal.style.display = 'none';
            supabase.removeAllChannels(); // Para de ouvir quando fecha
        });

        // Fechar qualquer tooltip se clicar no mapa vazio
        mapArea?.addEventListener('click', (e) => {
            document.querySelectorAll('.pin-tooltip.active').forEach(t => t.classList.remove('active'));
            
            // Se for mestre e clicou no mapa em si (não no pin), abre o form de criar pin
            if (userRole === 'master' && e.target === document.getElementById('mapInteractiveImage')) {
                const rect = mapArea.getBoundingClientRect();
                // Calcula % exata do clique baseada no tamanho renderizado
                const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
                const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
                
                openPinForm(xPercent, yPercent);
            }
        });

        // Form de Criar Pin
        document.getElementById('closeCreatePinBtn')?.addEventListener('click', () => {
            pinFormModal.style.display = 'none';
        });

        document.getElementById('createPinForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('savePinBtn');
            btn.disabled = true;
            btn.textContent = "Marcando...";

            const title = document.getElementById('pinTitleInput').value.trim();
            const desc = document.getElementById('pinDescInput').value.trim();
            const x = parseFloat(document.getElementById('pinPosX').value);
            const y = parseFloat(document.getElementById('pinPosY').value);
            const isHidden = document.getElementById('pinHiddenInput').checked;

            try {
                await supabase.from('campaign_map_pins').insert({
                    campaign_id: campaignId,
                    mural_id: currentMapMuralId,
                    title: title,
                    description: desc,
                    pos_x: x,
                    pos_y: y,
                    is_hidden: isHidden
                });
                
                if(!isHidden && window.generateLog) window.generateLog(`Um novo ponto foi marcado no mapa: "${title}".`, 'system');
                
                pinFormModal.style.display = 'none';
                e.target.reset();
            } catch (err) {
                console.error("Erro ao salvar pin:", err);
            } finally {
                btn.disabled = false;
                btn.textContent = "Salvar Marcação";
            }
        });
    }

    function openPinForm(x, y) {
        document.getElementById('pinPosX').value = x.toFixed(2);
        document.getElementById('pinPosY').value = y.toFixed(2);
        document.getElementById('createPinModal').style.display = 'flex';
    }

    // Funções globais atreladas aos botões dos tooltips
    window.togglePinVisibility = async function(pinId, newState) {
        await supabase.from('campaign_map_pins').update({ is_hidden: newState }).eq('id', pinId);
        if(!newState && window.generateLog) {
            const pin = currentPins.find(p => p.id === pinId);
            if(pin) window.generateLog(`Um local secreto foi revelado no mapa: "${pin.title}".`, 'scene');
        }
    };

    window.deletePin = async function(pinId) {
        if(confirm("Remover esta marcação?")) {
            await supabase.from('campaign_map_pins').delete().eq('id', pinId);
        }
    };

})();
