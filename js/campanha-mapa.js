/* =========================================================
   AERIOM — MAPAS INTERATIVOS E PINS (js/campanha-mapa.js)
   Gerenciamento de Pins, Coordenadas e Tooltips Imersivos
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
        modal.classList.add('active'); // Novo padrão de modal

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
                const toggleText = pin.is_hidden ? '👁️ Revelar aos Jogadores' : '🔒 Ocultar do Grupo';
                masterActions = `
                    <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
                        <button class="btn btn-secondary w-full" style="padding: 6px; font-size: 0.75rem;" onclick="window.togglePinVisibility('${pin.id}', ${!pin.is_hidden})">${toggleText}</button>
                        <button class="btn btn-ghost w-full" style="padding: 6px; font-size: 0.75rem; color: var(--danger);" onclick="window.deletePin('${pin.id}')">Excluir Pin</button>
                    </div>
                `;
            }

            tooltip.innerHTML = `
                <strong style="color: var(--theme-primary); font-family: var(--font-heading); display: block; margin-bottom: 4px; font-size: 1.1rem;">${pin.title}</strong>
                <span style="color: var(--text-primary); font-size: 0.85rem; display: block; white-space: pre-wrap; line-height: 1.4;">${pin.description || ''}</span>
                ${pin.is_hidden ? '<span style="color: var(--danger); font-size: 0.7rem; display: block; margin-top: 8px; text-transform: uppercase; font-weight: 600;">(Oculto)</span>' : ''}
                ${masterActions}
            `;

            pinEl.appendChild(tooltip);
            
            // Lógica para abrir/fechar tooltip no clique
            pinEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede de criar um novo pin atrás do atual
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
            modal.classList.remove('active');
            supabase.removeAllChannels(); // Para de ouvir o realtime quando fecha
        });

        // Fechar qualquer tooltip se clicar no mapa vazio ou abrir form de novo pin
        mapArea?.addEventListener('click', (e) => {
            document.querySelectorAll('.pin-tooltip.active').forEach(t => t.classList.remove('active'));
            
            // Se for mestre e clicou na imagem do mapa em si
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
            pinFormModal.classList.remove('active');
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
                
                pinFormModal.classList.remove('active');
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
        document.getElementById('createPinModal').classList.add('active');
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
