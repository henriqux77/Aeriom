/* =========================================================
   AERIOM — NÚCLEO DA MESA DIGITAL (js/campanha.js)
   Gerenciamento de Estado, Combate, Mural e Supabase
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) return;

    let currentUser = null;
    let currentCampaign = null;
    let userRole = null;
    let activeStateLinkId = null;
    let playerSheetLinkId = null;
    let playerSheetCharName = "";
    
    let combatState = null;
    let currentRequestAttrValue = 0;
    let currentRequestAttrName = "";

    const campaignId = localStorage.getItem("aeriom_active_campaign");
    const loadingEl = document.getElementById("loadingDash");
    const contentEl = document.getElementById("dashContent");
    const roleLabel = document.getElementById("campaignRoleLabel");
    const banner = document.getElementById("campaignBanner");
    const bannerName = document.getElementById("bannerName");
    const masterPanel = document.getElementById("masterPanel");

    // Elementos Combate
    const toggleCombatBtn = document.getElementById("toggleCombatBtn");
    const combatMasterPanel = document.getElementById("combatMasterPanel");
    const combatTrackerContainer = document.getElementById("combatTrackerContainer");
    const noCombatPlaceholder = document.getElementById("noCombatPlaceholder");
    const initiativeList = document.getElementById("initiativeList");

    async function init() {
        if (!campaignId) { window.location.href = "campanhas.html"; return; }
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) { window.location.href = "index.html"; return; }
        currentUser = session.user;

        await loadCampaignData();
        setupTabs();
        setupRealtime();

        // Inicializa Módulos Separados Narrativos
        if (window.initTimelineSystem) window.initTimelineSystem(supabase, campaignId);
        if (window.initCookingSystem) window.initCookingSystem(supabase, campaignId);
        if (window.initSessionSystem) window.initSessionSystem(supabase, campaignId);
        if (window.initSceneSystem) window.initSceneSystem(supabase, campaignId);
        if (window.initSecretsSystem) window.initSecretsSystem(supabase, campaignId, currentUser, userRole);
        if (window.initMapSystem) window.initMapSystem(supabase, campaignId, userRole);
    }

    function setupRealtime() {
        supabase.channel('campaign-events')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_logs', filter: `campaign_id=eq.${campaignId}` }, async (payload) => {
                const newLog = payload.new;
                if (document.getElementById('tab-logs').classList.contains('active') && window.loadTimeline) window.loadTimeline(); 
                if (newLog.log_type === 'request_roll' && userRole !== 'master') showRollRequest(newLog.description);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_mural', filter: `campaign_id=eq.${campaignId}` }, () => {
                if (document.getElementById('tab-mural').classList.contains('active')) loadMural(); 
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_combat', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                combatState = payload.new;
                if (document.getElementById('tab-combate').classList.contains('active')) renderCombat();
            })
            .subscribe();
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.dash-tab');
        const tabContents = document.querySelectorAll('.dash-tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Desktop Tabs
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                
                const targetId = tab.getAttribute('data-tab');
                const targetContent = document.getElementById(targetId);
                if(targetContent) targetContent.classList.add('active');

                // Atualizações contextuais
                if (targetId === 'tab-mural') loadMural();
                if (targetId === 'tab-logs' && window.loadTimeline) window.loadTimeline();
                if (targetId === 'tab-overview') loadCampaignCharacters();
                if (targetId === 'tab-combate') loadCombatState();
            });
        });
    }

    async function loadCampaignData() {
        const { data: memberData } = await supabase.from('campaign_members').select('role').eq('campaign_id', campaignId).eq('user_id', currentUser.id).single();
        userRole = memberData ? memberData.role : 'player';

        const { data: campData } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
        currentCampaign = campData;

        loadingEl.style.display = "none";
        contentEl.hidden = false;
        roleLabel.textContent = userRole === 'master' ? 'Mestre da Campanha' : 'Jogador';
        // Cores semânticas via inline apenas para o label rápido
        roleLabel.style.color = userRole === 'master' ? 'var(--danger)' : 'var(--theme-primary)';
        bannerName.textContent = currentCampaign.name;
        if (currentCampaign.cover_url) banner.style.backgroundImage = `url('${currentCampaign.cover_url}')`;

        if (userRole === 'master') {
            masterPanel.hidden = false;
            document.querySelectorAll('.master-only').forEach(el => {
                el.hidden = false;
                el.style.display = el.tagName === 'BUTTON' && el.classList.contains('dash-tab') ? 'flex' : '';
            });
        }
        await loadCampaignCharacters();
    }

    async function loadCampaignCharacters() {
        const list = document.getElementById("campaignCharactersList");
        if (!list) return;
        const { data } = await supabase.from('campaign_characters').select(`id, user_id, character_id, current_hp, current_mana, conditions, characters(id, name, race, class, avatar_url)`).eq('campaign_id', campaignId);
        
        list.innerHTML = '';
        if (!data || data.length === 0) { list.innerHTML = '<p class="text-muted text-center w-full" style="padding: 2rem;">Nenhum aventureiro presente.</p>'; return; }

        data.forEach(link => {
            const char = link.characters;
            if (!char) return;
            const isOwnCharacter = link.user_id === currentUser.id;
            
            const card = document.createElement('div');
            card.className = `campaign-char-card ${isOwnCharacter ? 'own-character' : ''}`;
            
            const avatarHtml = char.avatar_url ? `<img src="${char.avatar_url}" class="char-card-avatar" onerror="this.outerHTML='<div class=\\'char-card-fallback\\'>${char.name.charAt(0)}</div>'">` : `<div class="char-card-fallback">${char.name.charAt(0)}</div>`;
            const conds = link.conditions ? `<div class="char-state-badge">⚠️ Condições</div>` : '';
            
            const actionHtml = userRole === 'master' 
                ? `<button class="btn btn-secondary" style="padding: 0.5rem;" data-action="gerenciar">Gerenciar</button>` 
                : (isOwnCharacter ? `<button class="btn btn-primary" style="padding: 0.5rem;" data-action="acessar">Abrir Ficha</button>` : '');

            card.innerHTML = `
                ${avatarHtml}
                <div class="char-card-info">
                    <h4>${char.name}</h4>
                    <span class="subtitle">${char.race || '?'} • ${char.class || '?'}</span>
                    <div class="char-stats-mini">
                        <span class="pv">PV: ${link.current_hp || 0}</span>
                        <span class="mp">MP: ${link.current_mana || 0}</span>
                    </div>
                    ${conds}
                </div>
                <div>${actionHtml}</div>
            `;
            
            const btn = card.querySelector('button');
            if (btn) {
                btn.addEventListener('click', () => {
                    if (btn.getAttribute('data-action') === 'gerenciar') {
                        activeStateLinkId = link.id;
                        document.getElementById("stateHp").value = link.current_hp;
                        document.getElementById("stateMana").value = link.current_mana;
                        document.getElementById("stateConditions").value = link.conditions;
                        document.getElementById("characterStateModal").classList.add('active');
                    } else {
                        openPlayerSheet(link.character_id, link.id, link.current_hp, link.current_mana, link.conditions);
                    }
                });
            }
            list.appendChild(card);
        });
    }

    async function openPlayerSheet(characterId, linkId, currentHp, currentMana, conditions) {
        playerSheetLinkId = linkId;
        const { data: char } = await supabase.from('characters').select('*').eq('id', characterId).single();
        if (!char) return;
        playerSheetCharName = char.name;

        document.getElementById("psName").textContent = char.name;
        document.getElementById("psSubinfo").textContent = `${char.race || '?'} • ${char.class || '?'}`;
        document.getElementById("psHpView").textContent = currentHp || 0;
        document.getElementById("psManaView").textContent = currentMana || 0;
        document.getElementById("psConditionsView").textContent = conditions || "Nenhuma";
        document.getElementById("psHp").value = currentHp || 0;
        document.getElementById("psMana").value = currentMana || 0;
        document.getElementById("psConditions").value = conditions || "";

        const attrGrid = document.getElementById("psAttributesGrid");
        attrGrid.innerHTML = '';
        
        const standardAttributes = [
            { key: 'forca', label: 'Força' }, { key: 'agilidade', label: 'Agilidade' }, 
            { key: 'vigor', label: 'Vigor' }, { key: 'intelecto', label: 'Intelecto' }, 
            { key: 'percepcao', label: 'Percepção' }, { key: 'presenca', label: 'Presença' }, 
            { key: 'precisao', label: 'Precisão' }, { key: 'controle', label: 'Controle' }
        ];
        
        standardAttributes.forEach(attr => {
            let val = char[attr.key] !== undefined ? parseInt(char[attr.key]) : (char.attributes && char.attributes[attr.key] !== undefined ? parseInt(char.attributes[attr.key]) : 0);
            const btn = document.createElement('button');
            btn.className = 'ps-roll-btn';
            btn.innerHTML = `<span class="attr-label">${attr.label}</span> <span class="attr-val">${val}</span>`;
            
            btn.addEventListener('click', () => {
                const d20 = Math.floor(Math.random() * 20) + 1;
                const total = d20 + val;
                if(window.showCinematicRoll) window.showCinematicRoll(`Teste de ${attr.label}`, char.name, total);
                if(window.generateLog) window.generateLog(`${char.name} rolou ${attr.label}: 1d20 (${d20}) + ${val} = ${total}`, 'roll');
            });
            attrGrid.appendChild(btn);
        });

        document.getElementById("psInventory").textContent = char.inventory || "Vazio";
        document.getElementById("psSkills").textContent = char.skills || "Nenhuma habilidade";
        
        // Abre a gaveta
        document.getElementById("playerSheetModal").classList.add('active');
    }

    // Toggle Formulário de Edição da Ficha In-Game
    document.getElementById('psToggleEditStateBtn')?.addEventListener('click', () => {
        const form = document.getElementById('psStateForm');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    // =========================================================
    // LÓGICA DE MICROINTERAÇÕES (Dano / Cura Visual)
    // =========================================================
    document.getElementById('psStateForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const oldHp = parseInt(document.getElementById("psHpView").textContent) || 0;
        const oldMana = parseInt(document.getElementById("psManaView").textContent) || 0;

        const hp = parseInt(document.getElementById("psHp").value) || 0;
        const mana = parseInt(document.getElementById("psMana").value) || 0;
        const cond = document.getElementById("psConditions").value.trim();
        
        const hpDiff = hp - oldHp;
        const manaDiff = mana - oldMana;
        
        const rect = document.getElementById('psHpView').getBoundingClientRect();
        
        const spawnFloatingNumber = (diff, isHp) => {
            if (diff === 0) return;
            const el = document.createElement('div');
            el.className = 'floating-number';
            
            // Randomiza levemente a posição X para não encavalar
            const randomX = Math.random() * 30 - 15;
            el.style.left = `${rect.left + 20 + randomX}px`;
            el.style.top = `${rect.top - 20}px`;
            
            if (isHp) {
                el.classList.add(diff > 0 ? 'float-heal' : 'float-damage');
                el.textContent = diff > 0 ? `+${diff}` : diff;
            } else {
                el.classList.add('float-mana-loss');
                el.textContent = diff > 0 ? `+${diff} MP` : `${diff} MP`;
            }
            
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1200); 
        };

        spawnFloatingNumber(hpDiff, true);
        setTimeout(() => spawnFloatingNumber(manaDiff, false), 150);

        // Atualização Otimista UI
        document.getElementById("psHpView").textContent = hp;
        document.getElementById("psManaView").textContent = mana;
        document.getElementById("psConditionsView").textContent = cond || "Nenhuma";
        document.getElementById('psStateForm').style.display = 'none';

        // Banco e Logs
        await supabase.from('campaign_characters').update({ current_hp: hp, current_mana: mana, conditions: cond }).eq('id', playerSheetLinkId);
        if(window.generateLog && (hpDiff !== 0 || manaDiff !== 0)) {
            window.generateLog(`${playerSheetCharName} atualizou seu estado (PV: ${hp}, Mana: ${mana}).`, 'system');
        }
        await loadCampaignCharacters();
    });

    // Submissão do Gerenciamento de Estado pelo Mestre
    document.getElementById('characterStateForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hp = parseInt(document.getElementById("stateHp").value) || 0;
        const mana = parseInt(document.getElementById("stateMana").value) || 0;
        const cond = document.getElementById("stateConditions").value.trim();
        await supabase.from('campaign_characters').update({ current_hp: hp, current_mana: mana, conditions: cond }).eq('id', activeStateLinkId);
        await loadCampaignCharacters();
        document.getElementById("characterStateModal").classList.remove('active');
    });

    // =========================================================
    // MURAL E MAPA INTERATIVO
    // =========================================================
    async function loadMural() {
        const { data } = await supabase.from('campaign_mural').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
        const list = document.getElementById("muralList");
        list.innerHTML = '';
        
        if(!data || data.length === 0) {
            list.innerHTML = '<div class="placeholder-panel w-full" style="grid-column: 1/-1;"><div class="placeholder-icon">📌</div><h3>Mural Vazio</h3></div>';
            return;
        }

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'mural-card';
            let imgHtml = '';
            let mapBtnHtml = '';
            
            if (item.image_url) {
                imgHtml = `<img src="${item.image_url}" class="mural-image">`;
                mapBtnHtml = `<div style="padding: 0 1.5rem 1.5rem;"><button class="btn btn-secondary w-full" onclick="window.openInteractiveMap('${item.id}', '${item.image_url}', '${item.title.replace(/'/g, "\\'")}')"><span class="tab-icon">🗺️</span> Mapa Interativo</button></div>`;
            }

            div.innerHTML = `
                ${imgHtml}
                <div class="mural-content-box">
                    <h4>${item.title}</h4>
                    <p>${item.content}</p>
                </div>
                ${mapBtnHtml}
            `;
            list.appendChild(div);
        });
    }

    // Modal Fechamentos Manuais
    document.getElementById("closePlayerSheetModal")?.addEventListener("click", () => document.getElementById("playerSheetModal").classList.remove('active'));
    document.getElementById("closeCharacterStateModal")?.addEventListener("click", () => document.getElementById("characterStateModal").classList.remove('active'));
    document.getElementById("closeCreateSecretModal")?.addEventListener("click", () => document.getElementById("createSecretModal").classList.remove('active'));

    // Rolagens Rápidas do Mestre
    document.querySelectorAll('.master-dice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sides = parseInt(btn.getAttribute('data-dice'));
            const result = Math.floor(Math.random() * sides) + 1;
            if(window.showCinematicRoll) window.showCinematicRoll('Rolagem Pública', `1d${sides}`, result);
            if(window.generateLog) window.generateLog(`O Mestre rolou 1d${sides}. Resultado: ${result}`, 'roll');
        });
    });

    // =========================================================
    // COMBATE E INICIATIVA
    // =========================================================
    async function loadCombatState() {
        const { data } = await supabase.from('campaign_combat').select('*').eq('campaign_id', campaignId).maybeSingle();
        combatState = data || { is_active: false, round_number: 1, turn_index: 0, combatants: [] };
        renderCombat();
    }

    function renderCombat() {
        if (!combatState || !combatState.is_active) {
            combatTrackerContainer.style.display = "none";
            noCombatPlaceholder.style.display = "flex";
            if (userRole === 'master') { toggleCombatBtn.textContent = "Iniciar Combate"; combatMasterPanel.hidden = true; }
        } else {
            noCombatPlaceholder.style.display = "none";
            combatTrackerContainer.style.display = "block";
            document.getElementById("combatRoundDisplay").textContent = combatState.round_number;
            
            if (userRole === 'master') { 
                toggleCombatBtn.textContent = "Encerrar Combate"; 
                toggleCombatBtn.classList.replace('btn-primary', 'btn-danger');
                combatMasterPanel.hidden = false; 
            }
            
            initiativeList.innerHTML = '';
            combatState.combatants.forEach((c, index) => {
                const isActive = index === combatState.turn_index;
                const card = document.createElement('div');
                card.className = `combatant-card ${isActive ? 'active-turn' : ''}`;
                
                const removeBtn = userRole === 'master' ? `<button class="remove-combatant-btn" data-index="${index}" title="Remover">×</button>` : '';
                
                card.innerHTML = `
                    <div class="combatant-init">${c.init}</div>
                    <div class="combatant-name">${c.name}</div>
                    ${removeBtn}
                `;
                initiativeList.appendChild(card);
            });

            if(userRole === 'master') {
                document.querySelectorAll('.remove-combatant-btn').forEach(b => b.addEventListener('click', async (e) => {
                    combatState.combatants.splice(parseInt(e.target.getAttribute('data-index')), 1);
                    await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
                }));
            }
        }
    }

    document.getElementById("toggleCombatBtn")?.addEventListener('click', async () => {
        combatState.is_active = !combatState.is_active;
        if(!combatState.is_active) { 
            combatState.combatants = []; 
            combatState.turn_index = 0; 
            combatState.round_number = 1; 
            toggleCombatBtn.classList.replace('btn-danger', 'btn-primary');
        }
        await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
        if(window.generateLog) window.generateLog(combatState.is_active ? "O Mestre iniciou um combate tático!" : "A batalha foi encerrada.", "combat");
    });

    document.getElementById("nextTurnBtn")?.addEventListener('click', async () => {
        if (!combatState.combatants.length) return;
        combatState.turn_index++;
        if (combatState.turn_index >= combatState.combatants.length) { combatState.turn_index = 0; combatState.round_number++; }
        await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
    });

    document.getElementById("addCombatantForm")?.addEventListener('submit', async (e) => {
        e.preventDefault();
        combatState.combatants.push({ name: document.getElementById("combatantName").value, init: parseInt(document.getElementById("combatantInit").value)||0 });
        combatState.combatants.sort((a, b) => b.init - a.init);
        combatState.turn_index = 0;
        await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
        e.target.reset();
    });

    // =========================================================
    // REQUEST ROLLS E TOASTS (Ações Rápidas do Mestre)
    // =========================================================
    document.getElementById("sendRollRequestBtn")?.addEventListener('click', async () => {
        if(window.generateLog) await window.generateLog(`Teste Solicitado: ${document.getElementById("requestRollSelect").value}`, 'request_roll');
    });

    function showRollRequest(requestStr) {
        currentRequestAttrName = requestStr.split(': ')[1]?.trim();
        if(!currentRequestAttrName) return;
        document.getElementById("requestToastMsg").textContent = `Teste de ${currentRequestAttrName}`;
        document.getElementById("requestToast").classList.add('active');
        
        currentRequestAttrValue = 0;
        if (playerSheetCharName && currentRequestAttrName !== 'Puro (1d20)') {
            document.querySelectorAll('.ps-roll-btn').forEach(b => {
                if(b.textContent.includes(currentRequestAttrName)) currentRequestAttrValue = parseInt(b.querySelector('.attr-val')?.textContent) || 0;
            });
        }
    }

    document.getElementById("requestToastRollBtn")?.addEventListener('click', () => {
        document.getElementById("requestToast").classList.remove('active');
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + currentRequestAttrValue;
        const charName = playerSheetCharName || 'Um jogador';
        
        if(window.showCinematicRoll) window.showCinematicRoll(`Teste de ${currentRequestAttrName}`, charName, total);
        if(window.generateLog) window.generateLog(`${charName} respondeu ao teste de ${currentRequestAttrName}: 1d20 (${d20}) + ${currentRequestAttrValue} = ${total}`, 'roll');
    });
    
    document.getElementById("requestToastCloseBtn")?.addEventListener('click', () => document.getElementById("requestToast").classList.remove('active'));

    // Inicia o motor
    init();
});
