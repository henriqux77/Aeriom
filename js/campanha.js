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

        // Inicializa Módulos Separados
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
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const targetId = tab.getAttribute('data-tab');
                document.getElementById(targetId).classList.add('active');

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
        roleLabel.style.color = userRole === 'master' ? 'var(--fire)' : 'var(--orange)';
        bannerName.textContent = currentCampaign.name;
        if (currentCampaign.cover_url) banner.style.backgroundImage = `url('${currentCampaign.cover_url}')`;

        if (userRole === 'master') {
            masterPanel.hidden = false;
            document.querySelectorAll('.master-only').forEach(el => {
                el.hidden = false;
                el.style.display = el.tagName === 'BUTTON' && el.classList.contains('dash-tab') ? 'inline-block' : 'flex';
            });
        }
        await loadCampaignCharacters();
    }

    async function loadCampaignCharacters() {
        const list = document.getElementById("campaignCharactersList");
        if (!list) return;
        const { data } = await supabase.from('campaign_characters').select(`id, user_id, character_id, current_hp, current_mana, conditions, characters(id, name, race, class, avatar_url)`).eq('campaign_id', campaignId);
        
        list.innerHTML = '';
        if (!data || data.length === 0) { list.innerHTML = '<p style="color: var(--cream-muted);">Nenhum aventureiro presente.</p>'; return; }

        data.forEach(link => {
            const char = link.characters;
            if (!char) return;
            const isOwnCharacter = link.user_id === currentUser.id;
            const card = document.createElement('div');
            card.className = `campaign-char-card ${isOwnCharacter ? 'own-character' : ''}`;
            
            const avatarHtml = char.avatar_url ? `<img src="${char.avatar_url}" class="char-card-avatar" onerror="this.outerHTML='<div class=\\'char-card-fallback\\'>${char.name.charAt(0)}</div>'">` : `<div class="char-card-fallback">${char.name.charAt(0)}</div>`;
            const conds = link.conditions ? `<div class="char-state-badge" style="border-color:var(--fire); color:#ff9d85;">⚠️ Condições</div>` : '';
            const actionHtml = userRole === 'master' ? `<button class="secondary-button" style="min-height:30px; padding:5px 12px; font-size:10px;" data-action="gerenciar">Gerenciar</button>` : 
                              (isOwnCharacter ? `<button class="primary-button" style="min-height:30px; padding:5px 12px; font-size:10px;" data-action="acessar">Minha Ficha</button>` : '');

            card.innerHTML = `${avatarHtml}<div class="char-card-info"><h4>${char.name}</h4><span>${char.race || '?'} • ${char.class || '?'}</span><div style="font-size: 0.75rem; color: var(--gold); margin-top: 4px;">PV: ${link.current_hp || 0} | Mana: ${link.current_mana || 0}</div>${conds}</div><div class="char-card-actions">${actionHtml}</div>`;
            
            const btn = card.querySelector('button');
            if (btn) {
                btn.addEventListener('click', () => {
                    if (btn.getAttribute('data-action') === 'gerenciar') {
                        activeStateLinkId = link.id;
                        document.getElementById("stateHp").value = link.current_hp;
                        document.getElementById("stateMana").value = link.current_mana;
                        document.getElementById("stateConditions").value = link.conditions;
                        document.getElementById("characterStateModal").style.display = "flex";
                    } else openPlayerSheet(link.character_id, link.id, link.current_hp, link.current_mana, link.conditions);
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
        const standardAttributes = [{ key: 'forca', label: 'Força' }, { key: 'agilidade', label: 'Agilidade' }, { key: 'vigor', label: 'Vigor' }, { key: 'intelecto', label: 'Intelecto' }, { key: 'percepcao', label: 'Percepção' }, { key: 'presenca', label: 'Presença' }, { key: 'precisao', label: 'Precisão' }, { key: 'controle', label: 'Controle' }];
        
        standardAttributes.forEach(attr => {
            let val = char[attr.key] !== undefined ? parseInt(char[attr.key]) : (char.attributes && char.attributes[attr.key] !== undefined ? parseInt(char.attributes[attr.key]) : 0);
            const btn = document.createElement('button');
            btn.className = 'ps-roll-btn';
            btn.innerHTML = `${attr.label} <span class="attr-val">${val}</span>`;
            
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
        document.getElementById("playerSheetModal").style.display = "flex";
    }

    // Toggle Formulário da Ficha
    document.getElementById('psToggleEditStateBtn')?.addEventListener('click', () => {
        const form = document.getElementById('psStateForm');
        form.style.display = form.style.display === 'none' ? 'grid' : 'none';
    });

    document.getElementById('psStateForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hp = parseInt(document.getElementById("psHp").value) || 0;
        const mana = parseInt(document.getElementById("psMana").value) || 0;
        const cond = document.getElementById("psConditions").value.trim();
        await supabase.from('campaign_characters').update({ current_hp: hp, current_mana: mana, conditions: cond }).eq('id', playerSheetLinkId);
        if(window.generateLog) window.generateLog(`${playerSheetCharName} atualizou seu estado (PV: ${hp}, Mana: ${mana}).`, 'system');
        await loadCampaignCharacters();
        document.getElementById("playerSheetModal").style.display = "none";
    });

    // Mural com Integração de Mapa
    async function loadMural() {
        const { data } = await supabase.from('campaign_mural').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
        const list = document.getElementById("muralList");
        list.innerHTML = '';
        if(data) data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'mural-card';
            let imgHtml = '';
            let mapBtnHtml = '';
            
            if (item.image_url) {
                imgHtml = `<img src="${item.image_url}" class="mural-image">`;
                mapBtnHtml = `<button class="secondary-button" style="margin: 10px auto; width: 90%; min-height: 30px; font-size: 11px;" onclick="window.openInteractiveMap('${item.id}', '${item.image_url}', '${item.title.replace(/'/g, "\\'")}')">🗺️ Abrir Mapa Interativo</button>`;
            }

            div.innerHTML = `${imgHtml}<div class="mural-content-box"><h4>${item.title}</h4><p>${item.content}</p>${mapBtnHtml}</div>`;
            list.appendChild(div);
        });
    }

    // Modal Events Simples
    document.getElementById("closePlayerSheetModal")?.addEventListener("click", () => document.getElementById("playerSheetModal").style.display = "none");
    document.getElementById("closeCharacterStateModal")?.addEventListener("click", () => document.getElementById("characterStateModal").style.display = "none");

    // Rolagens do Mestre
    document.querySelectorAll('.master-dice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sides = parseInt(btn.getAttribute('data-dice'));
            const result = Math.floor(Math.random() * sides) + 1;
            if(window.showCinematicRoll) window.showCinematicRoll('Rolagem do Mestre', `1d${sides}`, result);
            if(window.generateLog) window.generateLog(`O Mestre rolou 1d${sides}. Resultado: ${result}`, 'combat');
        });
    });

    // Combate
    async function loadCombatState() {
        const { data } = await supabase.from('campaign_combat').select('*').eq('campaign_id', campaignId).maybeSingle();
        combatState = data || { is_active: false, round_number: 1, turn_index: 0, combatants: [] };
        renderCombat();
    }

    function renderCombat() {
        if (!combatState || !combatState.is_active) {
            combatTrackerContainer.style.display = "none";
            noCombatPlaceholder.style.display = "flex";
            if (userRole === 'master') { toggleCombatBtn.textContent = "Iniciar Combate"; toggleCombatBtn.style.background = ""; combatMasterPanel.hidden = true; }
        } else {
            noCombatPlaceholder.style.display = "none";
            combatTrackerContainer.style.display = "block";
            document.getElementById("combatRoundDisplay").textContent = combatState.round_number;
            if (userRole === 'master') { toggleCombatBtn.textContent = "Encerrar Combate"; toggleCombatBtn.style.background = "#8b2518"; combatMasterPanel.hidden = false; }
            
            initiativeList.innerHTML = '';
            combatState.combatants.forEach((c, index) => {
                const isActive = index === combatState.turn_index;
                const card = document.createElement('div');
                card.className = `combatant-card ${isActive ? 'active-turn' : ''}`;
                card.innerHTML = `<div class="combatant-init">${c.init}</div><div class="combatant-name" style="flex: 1;">${c.name}</div>${userRole === 'master' ? `<button class="remove-combatant-btn" data-index="${index}">×</button>` : ''}`;
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
        if(!combatState.is_active) { combatState.combatants = []; combatState.turn_index = 0; combatState.round_number = 1; }
        await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
        if(window.generateLog) window.generateLog(combatState.is_active ? "O Mestre iniciou um combate!" : "Combate encerrado.", "combat");
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

    // Request Rolls
    document.getElementById("sendRollRequestBtn")?.addEventListener('click', async () => {
        if(window.generateLog) await window.generateLog(`Teste Solicitado: ${document.getElementById("requestRollSelect").value}`, 'request_roll');
    });

    function showRollRequest(requestStr) {
        currentRequestAttrName = requestStr.split(': ')[1]?.trim();
        if(!currentRequestAttrName) return;
        document.getElementById("requestToastMsg").textContent = `Teste de ${currentRequestAttrName}`;
        document.getElementById("requestToast").hidden = false;
        
        currentRequestAttrValue = 0;
        if (playerSheetCharName && currentRequestAttrName !== 'Puro (1d20)') {
            document.querySelectorAll('.ps-roll-btn').forEach(b => {
                if(b.textContent.includes(currentRequestAttrName)) currentRequestAttrValue = parseInt(b.querySelector('.attr-val')?.textContent) || 0;
            });
        }
    }

    document.getElementById("requestToastRollBtn")?.addEventListener('click', () => {
        document.getElementById("requestToast").hidden = true;
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + currentRequestAttrValue;
        const charName = playerSheetCharName || 'Um jogador';
        
        if(window.showCinematicRoll) window.showCinematicRoll(`Teste de ${currentRequestAttrName}`, charName, total);
        if(window.generateLog) window.generateLog(`${charName} respondeu ao teste de ${currentRequestAttrName}: 1d20 (${d20}) + ${currentRequestAttrValue} = ${total}`, 'roll');
    });
    
    document.getElementById("requestToastCloseBtn")?.addEventListener('click', () => document.getElementById("requestToast").hidden = true);

    init(); // Inicializa
});
