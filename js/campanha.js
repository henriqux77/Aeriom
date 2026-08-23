/* =========================================================
   AERIOM — NÚCLEO DA MESA DIGITAL (js/campanha.js)
   Fase 5: Motor VTT Desacoplado, Seguro e Imersivo
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
    const bannerName = document.getElementById("bannerName");
    const masterPanel = document.getElementById("masterPanel");

    // Elementos Combate
    const toggleCombatBtn = document.getElementById("toggleCombatBtn");
    const combatMasterPanel = document.getElementById("combatMasterPanel");
    const combatTrackerContainer = document.getElementById("combatTrackerContainer");
    const noCombatPlaceholder = document.getElementById("noCombatPlaceholder");
    const initiativeList = document.getElementById("initiativeList");

    // =========================================================
    // 1. UTILITÁRIOS SEGUROS (DOM Puro / Anti-XSS)
    // =========================================================
    function createSafeElement(tag, className, text = null) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== null && text !== undefined) el.textContent = text;
        return el;
    }

    // =========================================================
    // 2. INICIALIZAÇÃO
    // =========================================================
    async function init() {
        if (!campaignId) { window.location.href = "campanhas.html"; return; }
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) { window.location.href = "index.html"; return; }
        currentUser = session.user;

        await loadCampaignData();
        setupTabs();
        setupRealtime();

        // Inicializa Módulos Separados (Se existirem)
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
                if (document.getElementById('tab-logs')?.classList.contains('active') && window.loadTimeline) window.loadTimeline(); 
                if (newLog.log_type === 'request_roll' && userRole !== 'master') showRollRequest(newLog.description);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_mural', filter: `campaign_id=eq.${campaignId}` }, () => {
                if (document.getElementById('tab-mural')?.classList.contains('active') && window.loadMural) window.loadMural(); 
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_combat', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                combatState = payload.new;
                if (document.getElementById('tab-combate')?.classList.contains('active')) renderCombat();
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
                const targetContent = document.getElementById(targetId);
                if(targetContent) targetContent.classList.add('active');

                // Dispara atualizações contextuais
                if (targetId === 'tab-mural' && window.loadMural) window.loadMural();
                if (targetId === 'tab-logs' && window.loadTimeline) window.loadTimeline();
                if (targetId === 'tab-overview') loadCampaignCharacters();
                if (targetId === 'tab-combate') loadCombatState();
            });
        });
    }

    async function loadCampaignData() {
        const { data: memberData } = await supabase.from('campaign_members').select('role').eq('campaign_id', campaignId).eq('user_id', currentUser.id).maybeSingle();
        userRole = memberData ? memberData.role : 'player';

        const { data: campData } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
        currentCampaign = campData;

        loadingEl.hidden = true;
        contentEl.hidden = false;
        roleLabel.textContent = userRole === 'master' ? 'Mestre da Campanha' : 'Jogador';
        // A cor do label (Laranja Mestre / Dourado Jogador) será tratada via CSS no futuro, mantemos o inline temporário para o label apenas.
        roleLabel.style.color = userRole === 'master' ? 'var(--danger)' : 'var(--theme-primary)';
        bannerName.textContent = currentCampaign.name;
        
        if (currentCampaign.cover_url && window.AeriomThemeManager) {
            window.AeriomThemeManager.setCustomAtmosphere(currentCampaign.cover_url);
        }

        if (userRole === 'master') {
            masterPanel.hidden = false;
            document.querySelectorAll('.master-only').forEach(el => {
                el.hidden = false;
            });
        }
        await loadCampaignCharacters();
    }

    // =========================================================
    // 3. O GRUPO E FICHA IN-GAME (HUD)
    // =========================================================
    async function loadCampaignCharacters() {
        const list = document.getElementById("campaignCharactersList");
        if (!list) return;
        const { data } = await supabase.from('campaign_characters').select(`id, user_id, character_id, current_hp, current_mana, conditions, characters(id, name, race, class, avatar_url)`).eq('campaign_id', campaignId);
        
        list.innerHTML = '';
        if (!data || data.length === 0) { 
            const empty = createSafeElement("p", "text-muted w-full", "Nenhum aventureiro presente na mesa.");
            empty.style.gridColumn = "1/-1";
            list.appendChild(empty);
            return; 
        }

        data.forEach(link => {
            const char = link.characters;
            if (!char) return;
            const isOwnCharacter = link.user_id === currentUser.id;
            
            const card = document.createElement('div');
            card.className = `campaign-char-card ${isOwnCharacter ? 'own-character' : ''}`;
            
            // Avatar Fallback Seguro
            const avatarContainer = document.createElement("div");
            avatarContainer.className = "char-avatar-container";
            const initial = char.name ? char.name.charAt(0).toUpperCase() : '?';
            
            if (char.avatar_url) {
                const img = document.createElement("img");
                img.src = char.avatar_url;
                img.className = "char-card-avatar";
                img.alt = char.name;
                img.onerror = () => { avatarContainer.innerHTML = `<div class="char-card-fallback">${initial}</div>`; };
                avatarContainer.appendChild(img);
            } else {
                avatarContainer.innerHTML = `<div class="char-card-fallback">${initial}</div>`;
            }

            // Infos
            const infoDiv = document.createElement('div');
            infoDiv.className = "char-card-info";
            infoDiv.appendChild(createSafeElement("h4", "", char.name));
            infoDiv.appendChild(createSafeElement("span", "subtitle", `${char.race || '?'} • ${char.class || '?'}`));
            
            const stats = document.createElement('div');
            stats.className = "char-stats-mini";
            stats.appendChild(createSafeElement("span", "pv", `PV: ${link.current_hp || 0}`));
            stats.appendChild(createSafeElement("span", "mp", `MP: ${link.current_mana || 0}`));
            infoDiv.appendChild(stats);

            if (link.conditions && link.conditions.trim() !== '') {
                infoDiv.appendChild(createSafeElement("div", "char-state-badge", "⚠️ Condições"));
            }

            // Ações
            const actionDiv = document.createElement('div');
            if (userRole === 'master') {
                const btn = createSafeElement("button", "btn btn-secondary", "Gerenciar");
                btn.style.padding = "0.5rem";
                btn.addEventListener('click', () => {
                    activeStateLinkId = link.id;
                    document.getElementById("stateHp").value = link.current_hp;
                    document.getElementById("stateMana").value = link.current_mana;
                    document.getElementById("stateConditions").value = link.conditions;
                    document.getElementById("characterStateModal").classList.add('active');
                });
                actionDiv.appendChild(btn);
            } else if (isOwnCharacter) {
                const btn = createSafeElement("button", "btn btn-primary", "Abrir Ficha");
                btn.style.padding = "0.5rem";
                btn.addEventListener('click', () => openPlayerSheet(link.character_id, link.id, link.current_hp, link.current_mana, link.conditions));
                actionDiv.appendChild(btn);
            }

            card.appendChild(avatarContainer);
            card.appendChild(infoDiv);
            card.appendChild(actionDiv);
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
        
        const attrsData = char.attributes || char;

        standardAttributes.forEach(attr => {
            let val = parseInt(attrsData[attr.key]) || 0;
            const btn = document.createElement('button');
            btn.className = 'ps-roll-btn';
            
            const labelSpan = createSafeElement("span", "attr-label", attr.label);
            const valSpan = createSafeElement("span", "attr-val", val);
            
            btn.appendChild(labelSpan);
            btn.appendChild(valSpan);
            
            btn.addEventListener('click', () => {
                const d20 = Math.floor(Math.random() * 20) + 1;
                const total = d20 + val;
                // Integração com o sistema de dados da Fase 6 que será criado, por enquanto usa o cinematic antigo
                if(window.showCinematicRoll) window.showCinematicRoll(`Teste de ${attr.label}`, char.name, total);
                if(window.generateLog) window.generateLog(`${char.name} rolou ${attr.label}: 1d20 (${d20}) + ${val} = ${total}`, 'roll');
            });
            attrGrid.appendChild(btn);
        });

        document.getElementById("psInventory").textContent = char.inventory || "Vazio";
        document.getElementById("psSkills").textContent = char.skills || "Nenhuma habilidade";
        
        document.getElementById("playerSheetModal").classList.add('active');
    }

    // Toggle Formulário HUD
    document.getElementById('psToggleEditStateBtn')?.addEventListener('click', () => {
        const form = document.getElementById('psStateForm');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    // =========================================================
    // 4. MICROINTERAÇÕES E ESTADO (DANO/CURA)
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
            el.className = `floating-number ${isHp ? (diff > 0 ? 'float-heal' : 'float-damage') : 'float-mana-loss'}`;
            
            // Randomiza posição levemente e injeta de forma segura
            const randomX = Math.random() * 30 - 15;
            el.style.left = `${rect.left + 20 + randomX}px`;
            el.style.top = `${rect.top - 20}px`;
            el.textContent = diff > 0 ? `+${diff}` : diff;
            if (!isHp) el.textContent += " MP";
            
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1200); 
        };

        spawnFloatingNumber(hpDiff, true);
        setTimeout(() => spawnFloatingNumber(manaDiff, false), 150);

        // UI Otimista
        document.getElementById("psHpView").textContent = hp;
        document.getElementById("psManaView").textContent = mana;
        document.getElementById("psConditionsView").textContent = cond || "Nenhuma";
        document.getElementById('psStateForm').style.display = 'none';

        await supabase.from('campaign_characters').update({ current_hp: hp, current_mana: mana, conditions: cond }).eq('id', playerSheetLinkId);
        if(window.generateLog && (hpDiff !== 0 || manaDiff !== 0)) {
            window.generateLog(`${playerSheetCharName} atualizou seu estado vital (PV: ${hp}, Mana: ${mana}).`, 'system');
        }
        await loadCampaignCharacters();
    });

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
    // 5. TRACKER TÁTICO DE COMBATE
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
            if (userRole === 'master') { 
                toggleCombatBtn.textContent = "Iniciar Combate"; 
                toggleCombatBtn.className = "btn btn-primary master-only";
                combatMasterPanel.hidden = true; 
            }
        } else {
            noCombatPlaceholder.style.display = "none";
            combatTrackerContainer.style.display = "block";
            document.getElementById("combatRoundDisplay").textContent = combatState.round_number;
            
            if (userRole === 'master') { 
                toggleCombatBtn.textContent = "Encerrar Combate"; 
                toggleCombatBtn.className = "btn btn-danger master-only";
                combatMasterPanel.hidden = false; 
            }
            
            initiativeList.innerHTML = '';
            combatState.combatants.forEach((c, index) => {
                const isActive = index === combatState.turn_index;
                const card = document.createElement('div');
                card.className = `combatant-card ${isActive ? 'active-turn' : ''}`;
                
                card.appendChild(createSafeElement("div", "combatant-init", c.init));
                card.appendChild(createSafeElement("div", "combatant-name", c.name));
                
                if (userRole === 'master') {
                    const removeBtn = createSafeElement("button", "remove-combatant-btn", "×");
                    removeBtn.title = "Remover";
                    removeBtn.addEventListener('click', async () => {
                        combatState.combatants.splice(index, 1);
                        await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
                    });
                    card.appendChild(removeBtn);
                }
                
                initiativeList.appendChild(card);
            });
        }
    }

    document.getElementById("toggleCombatBtn")?.addEventListener('click', async () => {
        combatState.is_active = !combatState.is_active;
        if(!combatState.is_active) { 
            combatState.combatants = []; 
            combatState.turn_index = 0; 
            combatState.round_number = 1; 
        }
        await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
        if(window.generateLog) window.generateLog(combatState.is_active ? "O Mestre inciou o Tracker de Combate!" : "A batalha foi encerrada.", "combat");
    });

    document.getElementById("nextTurnBtn")?.addEventListener('click', async () => {
        if (!combatState.combatants.length) return;
        combatState.turn_index++;
        if (combatState.turn_index >= combatState.combatants.length) { combatState.turn_index = 0; combatState.round_number++; }
        await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
    });

    document.getElementById("addCombatantForm")?.addEventListener('submit', async (e) => {
        e.preventDefault();
        combatState.combatants.push({ 
            name: document.getElementById("combatantName").value.trim(), 
            init: parseInt(document.getElementById("combatantInit").value) || 0 
        });
        combatState.combatants.sort((a, b) => b.init - a.init);
        combatState.turn_index = 0;
        await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
        e.target.reset();
    });

    // =========================================================
    // 6. SOLICITAÇÕES E TOASTS (Ações do Mestre)
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
                if(b.querySelector('.attr-label')?.textContent === currentRequestAttrName) {
                    currentRequestAttrValue = parseInt(b.querySelector('.attr-val')?.textContent) || 0;
                }
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

    // Fechamento de modais VTT
    document.getElementById("closePlayerSheetModal")?.addEventListener("click", () => document.getElementById("playerSheetModal").classList.remove('active'));
    document.getElementById("closeCharacterStateModal")?.addEventListener("click", () => document.getElementById("characterStateModal").classList.remove('active'));
    document.getElementById("closeCreateSecretModal")?.addEventListener("click", () => document.getElementById("createSecretModal").classList.remove('active'));

    // Rolagens Públicas Mestre
    document.querySelectorAll('.master-dice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sides = parseInt(btn.getAttribute('data-dice'));
            const result = Math.floor(Math.random() * sides) + 1;
            if(window.showCinematicRoll) window.showCinematicRoll('Rolagem Pública', `1d${sides}`, result);
            if(window.generateLog) window.generateLog(`O Mestre rolou 1d${sides}. Resultado: ${result}`, 'roll');
        });
    });

    init();
});
