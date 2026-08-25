/* =========================================================
   AERIOM — NÚCLEO DA MESA DIGITAL (js/campanha.js)
   Fase 5: Integração Premium, Motor de Dados e Sincronia
========================================================= */
    function parseCampaignTheme(desc) {
        if (!desc) return { cleanDesc: "", themeId: "default" };
        const marker = "=== TEMA ===";
        const index = desc.indexOf(marker);
        if (index !== -1) {
            const cleanDesc = desc.substring(0, index).trim();
            return { cleanDesc };
        }
        return { cleanDesc: desc };
    }

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) return;

    let currentUser = null;
    let currentCampaign = null;
    let userRole = null;
    
    // IDs de controle de estado
    let activeStateLinkId = null;
    let playerSheetLinkId = null;
    let playerSheetCharName = "";
    
    // Controle Tático
    let combatState = null;
    let currentRequestAttrValue = 0;
    let currentRequestAttrName = "";

    // Elementos Base
    const campaignId = localStorage.getItem("aeriom_active_campaign");
    const loadingEl = document.getElementById("loadingDash");
    const contentEl = document.getElementById("dashContent");
    const roleLabel = document.getElementById("campaignRoleLabel");
    
    const bannerNameSidebar = document.getElementById("bannerName");
    const bannerNameMobile = document.getElementById("bannerNameMobile");
    const bannerTitleDisplay = document.getElementById("bannerTitleDisplay");
    const masterPanel = document.getElementById("masterPanel");

    // Elementos de Combate
    const toggleCombatBtn = document.getElementById("toggleCombatBtn");
    const combatMasterPanel = document.getElementById("combatMasterPanel");
    const combatTrackerContainer = document.getElementById("combatTrackerContainer");
    const noCombatPlaceholder = document.getElementById("noCombatPlaceholder");
    const initiativeList = document.getElementById("initiativeList");
    const addCombatantForm = document.getElementById("addCombatantForm");

    // =========================================================
    // 1. UTILITÁRIOS E PARSERS
    // =========================================================
    function createSafeElement(tag, className, text = null) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== null && text !== undefined) el.textContent = text;
        return el;
    }

    function parseCampaignTheme(desc) {
        if (!desc) return { cleanDesc: "", themeId: "default" };
        const marker = "=== TEMA ===";
        const index = desc.indexOf(marker);
        if (index !== -1) {
            const block = desc.substring(index);
            const cleanDesc = desc.substring(0, index).trim();
            const match = block.match(/ID:\s*([a-zA-Z0-9_]+)/);
            const themeId = match ? match[1] : "default";
            return { cleanDesc, themeId };
        }
        return { cleanDesc: desc, themeId: "default" };
    }

    // =========================================================
    // 2. INICIALIZAÇÃO BLINDADA
    // =========================================================
    async function init() {
        if (!campaignId) { window.location.href = "campanhas.html"; return; }
        
        // Activa a UI imediatamente, não espera a rede
        setupTabs();
        setupThemeModal();

        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) { window.location.href = "index.html"; return; }
            currentUser = session.user;

            await loadCampaignData();
            setupRealtime();

            // Desperta os submódulos da mesa
            if (window.initTimelineSystem) window.initTimelineSystem(supabase, campaignId);
            if (window.initCookingSystem) window.initCookingSystem(supabase, campaignId);
            if (window.initSessionSystem) window.initSessionSystem(supabase, campaignId);
            if (window.initSecretsSystem) window.initSecretsSystem(supabase, campaignId, currentUser, userRole);
            if (window.initMapSystem) window.initMapSystem(supabase, campaignId, userRole);
            
        } catch (err) {
            console.error("[AERIOM] Falha na conjuração da Mesa:", err);
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div class="placeholder-icon" style="color: var(--color-danger);">⚠️</div>
                    <h3 style="color: var(--color-danger); margin-bottom: 8px;">A Magia Falhou</h3>
                    <p class="text-muted">Os tomos desta campanha não puderam ser abertos. Verifique a sua conexão.</p>
                `;
            }
        }
    }

    // =========================================================
    // 3. SINCRONIA EM TEMPO REAL (REALTIME)
    // =========================================================
    function setupRealtime() {
        supabase.channel('campaign-events')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` }, (payload) => {
                currentCampaign = payload.new;
                const parsed = parseCampaignTheme(currentCampaign.description);
                if (window.AeriomThemeManager) window.AeriomThemeManager.applyTheme(parsed.themeId, currentCampaign.cover_url);
                
                if (bannerNameSidebar) bannerNameSidebar.textContent = currentCampaign.name;
                if (bannerNameMobile) bannerNameMobile.textContent = currentCampaign.name;
                if (bannerTitleDisplay) bannerTitleDisplay.textContent = currentCampaign.name;
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_logs', filter: `campaign_id=eq.${campaignId}` }, async (payload) => {
                const newLog = payload.new;
                if (document.getElementById('tab-logs')?.classList.contains('active') && window.loadTimeline) window.loadTimeline(); 
                if (newLog.log_type === 'request_roll' && userRole !== 'master') showRollRequest(newLog.description);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_mural', filter: `campaign_id=eq.${campaignId}` }, () => {
                if (document.getElementById('tab-mural')?.classList.contains('active') && window.loadMural) window.loadMural(); 
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_combat', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    combatState = { is_active: false, round_number: 1, turn_index: 0, combatants: [] };
                } else if (payload.new && Object.keys(payload.new).length > 0) {
                    combatState = payload.new;
                }
                renderCombat();
            })
            .subscribe();
    }

    // =========================================================
    // 4. INTERFACE E NAVEGAÇÃO
    // =========================================================
    function setupTabs() {
        const tabs = document.querySelectorAll('.dash-tab, .nav-mob-btn');
        const tabContents = document.querySelectorAll('.dash-tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-tab');
                if (!targetId) return;

                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                document.querySelectorAll(`[data-tab="${targetId}"]`).forEach(btn => btn.classList.add('active'));
                
                const targetContent = document.getElementById(targetId);
                if (targetContent) targetContent.classList.add('active');

                // Dispara os carregamentos contextuais de outras abas
                if (targetId === 'tab-mural' && window.loadMural) window.loadMural();
                if (targetId === 'tab-logs' && window.loadTimeline) window.loadTimeline();
                if (targetId === 'tab-overview') loadCampaignCharacters();
                if (targetId === 'tab-combate') loadCombatState();
            });
        });
    }

    async function loadCampaignData() {
        const { data: memberData, error: memberErr } = await supabase.from('campaign_members').select('role').eq('campaign_id', campaignId).eq('user_id', currentUser.id).maybeSingle();
        if (memberErr) throw memberErr;
        userRole = memberData ? memberData.role : 'player';

        const { data: campData, error: campErr } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
        if (campErr) throw campErr;
        currentCampaign = campData;

        if (loadingEl) loadingEl.style.display = "none";
        if (contentEl) contentEl.style.display = "flex";
        
        if (roleLabel) {
            roleLabel.textContent = userRole === 'master' ? 'Mestre' : 'Aventureiro';
            roleLabel.style.color = userRole === 'master' ? 'var(--theme-accent)' : 'var(--theme-primary)';
        }
        
        if (bannerNameSidebar) bannerNameSidebar.textContent = currentCampaign.name;
        if (bannerNameMobile) bannerNameMobile.textContent = currentCampaign.name;
        if (bannerTitleDisplay) bannerTitleDisplay.textContent = currentCampaign.name;
        
        // Applica a Atmosfera da Campanha
        const parsedTheme = parseCampaignTheme(currentCampaign.description);
        if (window.AeriomThemeManager) {
            window.AeriomThemeManager.applyTheme(parsedTheme.themeId, currentCampaign.cover_url);
        }

        const masterThemeBtn = document.getElementById('openMasterThemeMobile');

        // Controlo de Acesso (Mestre vs Jogador)
        if (userRole === 'master') {
            if (masterPanel) masterPanel.style.display = 'block';
            document.querySelectorAll('.master-only').forEach(el => el.style.display = '');
            if (masterThemeBtn) masterThemeBtn.style.display = 'block';
        } else {
            if (masterPanel) masterPanel.style.display = 'none';
            document.querySelectorAll('.master-only').forEach(el => el.style.display = 'none');
            if (masterThemeBtn) masterThemeBtn.style.display = 'none';
        }
        
        await loadCampaignCharacters();
    }

    // =========================================================
    // 5. GESTÃO DE ATMOSFERA E TEMAS
    // =========================================================
    function setupThemeModal() {
        const themeModal = document.getElementById("themeConfigModal");
        const themeSelect = document.getElementById("themeSelectDropdown");
        const customUrlInput = document.getElementById("customThemeBgUrl");
        
        document.getElementById("openThemeConfigModalBtn")?.addEventListener('click', openModal);
        document.getElementById("openThemeModalBtn")?.addEventListener('click', openModal);
        document.getElementById("openMasterThemeMobile")?.addEventListener('click', openModal);
        document.getElementById("closeThemeModalBtn")?.addEventListener('click', () => themeModal?.classList.remove('active'));
        
        function openModal() {
            if (!window.AeriomThemeManager || !currentCampaign || !themeModal) return;
            
            themeSelect.innerHTML = '';
            const options = window.AeriomThemeManager.getThemeOptions();
            options.forEach(opt => {
                const el = document.createElement("option");
                el.value = opt.id;
                el.textContent = opt.name;
                themeSelect.appendChild(el);
            });

            const parsed = parseCampaignTheme(currentCampaign.description);
            themeSelect.value = parsed.themeId;
            customUrlInput.value = currentCampaign.cover_url || "";
            
            themeModal.classList.add('active');
        }

        document.getElementById("themeConfigForm")?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedTheme = themeSelect.value;
            const customUrl = customUrlInput.value.trim();
            const parsed = parseCampaignTheme(currentCampaign.description);
            const newDescription = `${parsed.cleanDesc}\n\n=== TEMA ===\nID: ${selectedTheme}`;

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = "A Sincronizar Atmosfera...";
            btn.disabled = true;

            await supabase.from('campaigns').update({ description: newDescription, cover_url: customUrl === "" ? null : customUrl }).eq('id', campaignId);
            
            btn.textContent = originalText;
            btn.disabled = false;
            if (themeModal) themeModal.classList.remove('active');
            
            if(window.generateLog) window.generateLog(`A atmosfera do ambiente mudou sutilmente...`, 'system');
        });
    }

    // =========================================================
    // 6. HUD DO GRUPO (CARTÕES DE HERÓI)
    // =========================================================
    async function loadCampaignCharacters() {
        const list = document.getElementById("campaignCharactersList");
        if (!list) return;
        const { data, error } = await supabase.from('campaign_characters').select(`id, user_id, character_id, current_hp, current_mana, conditions, characters(id, name, race, class, avatar_url)`).eq('campaign_id', campaignId);
        
        if (error) throw error;

        list.innerHTML = '';
        if (!data || data.length === 0) { 
            const empty = createSafeElement("p", "text-muted w-full text-center", "Nenhum aventureiro respondeu ao chamamento da mesa ainda.");
            empty.style.gridColumn = "1/-1";
            empty.style.padding = "var(--space-24)";
            list.appendChild(empty);
            return; 
        }

        data.forEach(link => {
            const char = link.characters;
            if (!char) return;
            const isOwnCharacter = link.user_id === currentUser.id;
            
            const card = document.createElement('div');
            card.className = `campaign-char-card ${isOwnCharacter ? 'own-character' : ''}`;
            
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
                infoDiv.appendChild(createSafeElement("div", "char-state-badge", "Condições"));
            }

            const actionDiv = document.createElement('div');
            if (userRole === 'master') {
                const btn = createSafeElement("button", "btn btn-secondary btn-sm", "Gerir");
                btn.addEventListener('click', () => {
                    activeStateLinkId = link.id;
                    document.getElementById("stateHp").value = link.current_hp;
                    document.getElementById("stateMana").value = link.current_mana;
                    document.getElementById("stateConditions").value = link.conditions;
                    document.getElementById("characterStateModal").classList.add('active');
                });
                actionDiv.appendChild(btn);
            } else if (isOwnCharacter) {
                const btn = createSafeElement("button", "btn btn-primary btn-sm", "Ficha");
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
            
            // INTEGRAÇÃO COM MOTOR VISUAL (DICE.JS)
            btn.addEventListener('click', async () => {
                document.getElementById("playerSheetModal").classList.remove('active'); 
                
                if (window.AeriomDice) {
                    const result = await window.AeriomDice.roll({
                        quantity: 1, 
                        sides: 20, 
                        modifier: val, 
                        label: `Teste de ${attr.label}`
                    });
                    
                    if (window.generateLog) {
                        const sinal = val >= 0 ? '+' : '';
                        window.generateLog(`${char.name} rolou ${attr.label}: 1d20 (${result.rolls[0]}) ${sinal} ${val} = **${result.total}**`, 'roll');
                    }
                }
            });
            attrGrid.appendChild(btn);
        });

        document.getElementById("psInventory").textContent = char.inventory || "Vazio";
        document.getElementById("psSkills").textContent = char.skills || "Nenhum registo.";
        
        document.getElementById("playerSheetModal").classList.add('active');
    }

    document.getElementById('psToggleEditStateBtn')?.addEventListener('click', () => {
        const form = document.getElementById('psStateForm');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    // =========================================================
    // 7. MICROINTERAÇÕES VITAI (DANO/CURA FLOATING)
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

        document.getElementById("psHpView").textContent = hp;
        document.getElementById("psManaView").textContent = mana;
        document.getElementById("psConditionsView").textContent = cond || "Nenhuma";
        document.getElementById('psStateForm').style.display = 'none';

        await supabase.from('campaign_characters').update({ current_hp: hp, current_mana: mana, conditions: cond }).eq('id', playerSheetLinkId);
        
        if (window.generateLog && (hpDiff !== 0 || manaDiff !== 0)) {
            window.generateLog(`${playerSheetCharName} alterou o seu estado vital (PV: ${hp}, Mana: ${mana}).`, 'system');
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
    // 8. TRACKER TÁTICO DE COMBATE
    // =========================================================
    async function loadCombatState() {
        const { data } = await supabase.from('campaign_combat').select('*').eq('campaign_id', campaignId).maybeSingle();
        combatState = data || { is_active: false, round_number: 1, turn_index: 0, combatants: [] };
        renderCombat();
    }

    function renderCombat() {
        if (!combatState || !combatState.is_active) {
            if (combatTrackerContainer) combatTrackerContainer.style.display = "none";
            if (noCombatPlaceholder) noCombatPlaceholder.style.display = "flex";
            
            if (userRole === 'master') { 
                if (toggleCombatBtn) { toggleCombatBtn.textContent = "Iniciar Combate"; toggleCombatBtn.className = "btn btn-primary master-only"; }
                if (combatMasterPanel) combatMasterPanel.style.display = "none";
                if (addCombatantForm) addCombatantForm.style.setProperty('display', 'none', 'important');
            }
        } else {
            if (noCombatPlaceholder) noCombatPlaceholder.style.display = "none";
            if (combatTrackerContainer) combatTrackerContainer.style.display = "block";
            if (document.getElementById("combatRoundDisplay")) document.getElementById("combatRoundDisplay").textContent = combatState.round_number;
            
            if (userRole === 'master') { 
                if (toggleCombatBtn) { toggleCombatBtn.textContent = "Encerrar Combate"; toggleCombatBtn.className = "btn btn-danger master-only"; }
                if (combatMasterPanel) combatMasterPanel.style.display = "block";
                if (addCombatantForm) addCombatantForm.style.setProperty('display', 'flex', 'important');
            } else {
                if (addCombatantForm) addCombatantForm.style.setProperty('display', 'none', 'important');
            }
            
            if (initiativeList) {
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
    }

    document.getElementById("toggleCombatBtn")?.addEventListener('click', async () => {
        combatState.is_active = !combatState.is_active;
        if (!combatState.is_active) { 
            combatState.combatants = []; 
            combatState.turn_index = 0; 
            combatState.round_number = 1; 
        }
        await supabase.from('campaign_combat').upsert({ campaign_id: campaignId, ...combatState });
        if (window.generateLog) window.generateLog(combatState.is_active ? "O Mestre conjurou o Tracker de Combate!" : "As lâminas foram guardadas. O combate terminou.", "combat");
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
    // 9. EVENTOS DO MESTRE E TESTES DE DADOS
    // =========================================================
    document.getElementById("sendRollRequestBtn")?.addEventListener('click', async () => {
        if (window.generateLog) await window.generateLog(`O Mestre exige um teste de: ${document.getElementById("requestRollSelect").value}`, 'request_roll');
    });

    function showRollRequest(requestStr) {
        currentRequestAttrName = requestStr.split(': ')[1]?.trim();
        if (!currentRequestAttrName) return;
        
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

    document.getElementById("requestToastRollBtn")?.addEventListener('click', async () => {
        document.getElementById("requestToast").classList.remove('active');
        const charName = playerSheetCharName || 'Um aventureiro';
        
        if (window.AeriomDice) {
            const result = await window.AeriomDice.roll({ 
                quantity: 1, 
                sides: 20, 
                modifier: currentRequestAttrValue, 
                label: `Teste de ${currentRequestAttrName}` 
            });
            
            if (window.generateLog) {
                const sinal = currentRequestAttrValue >= 0 ? '+' : '';
                window.generateLog(`${charName} respondeu ao teste de ${currentRequestAttrName}: 1d20 (${result.rolls[0]}) ${sinal} ${currentRequestAttrValue} = **${result.total}**`, 'roll');
            }
        }
    });
    
    document.getElementById("requestToastCloseBtn")?.addEventListener('click', () => document.getElementById("requestToast").classList.remove('active'));

    document.getElementById("closePlayerSheetModal")?.addEventListener("click", () => document.getElementById("playerSheetModal").classList.remove('active'));
    document.getElementById("closeCharacterStateModal")?.addEventListener("click", () => document.getElementById("characterStateModal").classList.remove('active'));
    document.getElementById("closeCreateSecretModal")?.addEventListener("click", () => document.getElementById("createSecretModal").classList.remove('active'));

    // Rolagens Públicas do Mestre (No Painel de Ferramentas)
    document.querySelectorAll('.master-dice-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const sides = parseInt(btn.getAttribute('data-dice'));
            if (window.AeriomDice) {
                const result = await window.AeriomDice.roll({ 
                    quantity: 1, 
                    sides: sides, 
                    modifier: 0, 
                    label: `Rolagem do Mestre (1D${sides})` 
                });
                if (window.generateLog) window.generateLog(`O Mestre jogou 1D${sides} no salão. Resultado: **${result.total}**`, 'roll');
            }
        });
    });

    // Iniciar
    init();
});
