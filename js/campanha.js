document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) return;

    let currentUser = null;
    let currentCampaign = null;
    let userRole = null;
    let activeStateLinkId = null;
    let activeStateCharName = "";
    let playerSheetLinkId = null;
    let playerSheetCharName = "";
    
    // Variável para armazenar o valor do atributo na hora da rolagem do Request
    let currentRequestAttrValue = 0;
    let currentRequestAttrName = "";

    const campaignId = localStorage.getItem("aeriom_active_campaign");

    const loadingEl = document.getElementById("loadingDash");
    const contentEl = document.getElementById("dashContent");
    const backBtn = document.getElementById("backToCampaignsBtn");
    const roleLabel = document.getElementById("campaignRoleLabel");
    
    const banner = document.getElementById("campaignBanner");
    const bannerName = document.getElementById("bannerName");
    const masterPanel = document.getElementById("masterPanel");
    
    const generateInviteBtn = document.getElementById("generateInviteBtn");
    const inviteCodeDisplay = document.getElementById("inviteCodeDisplay");
    const campaignCharactersList = document.getElementById("campaignCharactersList");
    
    const tabs = document.querySelectorAll('.dash-tab');
    const tabContents = document.querySelectorAll('.dash-tab-content');
    const muralList = document.getElementById("muralList");
    const logsList = document.getElementById("logsList");

    const stateModal = document.getElementById("characterStateModal");
    const closeStateBtn = document.getElementById("closeCharacterStateModal");
    const stateForm = document.getElementById("characterStateForm");
    const stateNameEl = document.getElementById("stateModalName");
    const stateHpInput = document.getElementById("stateHp");
    const stateManaInput = document.getElementById("stateMana");
    const stateConditionsInput = document.getElementById("stateConditions");
    const saveStateBtn = document.getElementById("saveStateBtn");

    const playerSheetModal = document.getElementById("playerSheetModal");
    const closePlayerSheetBtn = document.getElementById("closePlayerSheetModal");
    const psStateForm = document.getElementById("psStateForm");
    
    const muralModal = document.getElementById("muralModal");
    const openMuralBtn = document.getElementById("openMuralModalBtn");
    const closeMuralBtn = document.getElementById("closeMuralModal");
    const muralForm = document.getElementById("muralForm");
    const muralTitleInput = document.getElementById("muralTitle");
    const muralContentInput = document.getElementById("muralContent");
    const muralImageInput = document.getElementById("muralImage");
    const saveMuralBtn = document.getElementById("saveMuralBtn");

    const masterDiceBtns = document.querySelectorAll('.master-dice-btn');
    const requestRollSelect = document.getElementById("requestRollSelect");
    const sendRollRequestBtn = document.getElementById("sendRollRequestBtn");

    const requestToast = document.getElementById("requestToast");
    const requestToastMsg = document.getElementById("requestToastMsg");
    const requestToastRollBtn = document.getElementById("requestToastRollBtn");
    const requestToastCloseBtn = document.getElementById("requestToastCloseBtn");

    const settingsForm = document.getElementById("campaignSettingsForm");
    const settingsName = document.getElementById("settingsName");
    const settingsDesc = document.getElementById("settingsDesc");
    const deleteCampaignBtn = document.getElementById("deleteCampaignBtn");

    const addMyCharacterBtn = document.getElementById("addMyCharacterBtn");
    const selectCharacterModal = document.getElementById("selectCharacterModal");
    const closeSelectCharacterModal = document.getElementById("closeSelectCharacterModal");
    const userCharactersList = document.getElementById("userCharactersList");

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            localStorage.removeItem("aeriom_active_campaign");
            window.location.href = "campanhas.html";
        });
    }

    async function init() {
        if (!campaignId) {
            window.location.href = "campanhas.html";
            return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = "index.html";
            return;
        }
        currentUser = session.user;

        await loadCampaignData();
        setupTabs();
        setupRealtime();
    }

    // =========================================================
    // SUPABASE REALTIME (FASE 9)
    // =========================================================
    function setupRealtime() {
        supabase.channel('campaign-events')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_logs', filter: `campaign_id=eq.${campaignId}` }, async (payload) => {
                const newLog = payload.new;
                
                // Se estamos com a aba de histórico aberta, atualizamos a lista
                if (document.getElementById('tab-logs').classList.contains('active')) {
                    loadLogs(); 
                }

                // Se for um Request e quem está recebendo é um Jogador
                if (newLog.log_type === 'request_roll' && userRole !== 'master') {
                    showRollRequest(newLog.description);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_mural', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                if (document.getElementById('tab-mural').classList.contains('active')) {
                    loadMural(); 
                }
            })
            .subscribe();
    }

    // =========================================================
    // TABS & DADOS DA CAMPANHA
    // =========================================================
    function setupTabs() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const targetId = tab.getAttribute('data-tab');
                document.getElementById(targetId).classList.add('active');

                if (targetId === 'tab-mural') loadMural();
                if (targetId === 'tab-logs') loadLogs();
                if (targetId === 'tab-overview') loadCampaignCharacters();
            });
        });
    }

    async function loadCampaignData() {
        try {
            const { data: memberData, error: memberError } = await supabase.from('campaign_members').select('role').eq('campaign_id', campaignId).eq('user_id', currentUser.id).single();
            if (memberError || !memberData) throw new Error("Acesso negado.");
            userRole = memberData.role;

            const { data: campData, error: campError } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
            if (campError) throw campError;
            currentCampaign = campData;

            renderDashboard();
            await loadCampaignCharacters();
        } catch (error) {
            window.location.href = "campanhas.html";
        }
    }

    function renderDashboard() {
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
            settingsName.value = currentCampaign.name;
            settingsDesc.value = currentCampaign.description || "";
        }
    }

    // =========================================================
    // VINCULAR FICHA
    // =========================================================
    if (addMyCharacterBtn) {
        addMyCharacterBtn.addEventListener('click', async () => {
            selectCharacterModal.style.display = 'flex';
            userCharactersList.innerHTML = '<p style="text-align: center; color: var(--cream-muted);">Carregando suas fichas...</p>';
            try {
                const { data: allChars, error: charError } = await supabase.from('characters').select('id, name, race, class, avatar_url').eq('user_id', currentUser.id);
                if (charError) throw charError;

                const { data: linkedChars, error: linkedError } = await supabase.from('campaign_characters').select('character_id').eq('campaign_id', campaignId);
                if (linkedError) throw linkedError;
                
                const linkedIds = linkedChars.map(lc => lc.character_id);
                if (!allChars || allChars.length === 0) {
                    userCharactersList.innerHTML = `<p style="text-align: center; color: var(--cream-muted);">Você não possui nenhuma ficha criada.</p>`;
                    return;
                }

                userCharactersList.innerHTML = '';
                allChars.forEach(char => {
                    const isLinked = linkedIds.includes(char.id);
                    const charEl = document.createElement('div');
                    charEl.style.display = 'flex';
                    charEl.style.alignItems = 'center';
                    charEl.style.gap = '15px';
                    charEl.style.padding = '12px';
                    charEl.style.border = '1px solid rgba(200, 100, 50, 0.3)';
                    charEl.style.borderRadius = '10px';
                    charEl.style.background = isLinked ? 'rgba(5, 3, 3, 0.6)' : 'rgba(25, 17, 15, 0.6)';
                    charEl.style.opacity = isLinked ? '0.5' : '1';
                    charEl.style.cursor = isLinked ? 'not-allowed' : 'pointer';

                    const avatar = char.avatar_url ? `<img src="${char.avatar_url}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : `<div style="width:40px; height:40px; border-radius:50%; background:#222; display:grid; place-items:center; color:var(--gold); border:1px solid var(--gold);">${char.name.charAt(0)}</div>`;

                    charEl.innerHTML = `${avatar}<div style="flex:1;"><h4 style="margin:0; color:var(--cream); font-family:var(--display-font);">${char.name}</h4><span style="font-size:11px; color:var(--cream-muted);">${char.race || '?'} • ${char.class || '?'}</span></div><button class="secondary-button" style="min-height:30px; padding:5px 15px; font-size:10px;" ${isLinked ? 'disabled' : ''}>${isLinked ? 'Já Adicionado' : 'Selecionar'}</button>`;

                    if (!isLinked) {
                        charEl.addEventListener('click', async () => {
                            try {
                                const { error: insertError } = await supabase.from('campaign_characters').insert({ campaign_id: campaignId, user_id: currentUser.id, character_id: char.id });
                                if (insertError) throw insertError;
                                await generateLog(`Um novo aventureiro entrou no mundo: ${char.name}.`, 'system');
                                selectCharacterModal.style.display = 'none';
                                await loadCampaignCharacters();
                                alert(`${char.name} adicionado!`);
                            } catch (err) { alert("Falha ao vincular."); }
                        });
                    }
                    userCharactersList.appendChild(charEl);
                });
            } catch (error) { userCharactersList.innerHTML = '<p style="color:#d46a4a;">Erro.</p>'; }
        });
    }

    if (closeSelectCharacterModal) closeSelectCharacterModal.addEventListener('click', () => { selectCharacterModal.style.display = 'none'; });
    selectCharacterModal.addEventListener('click', (e) => { if(e.target === selectCharacterModal) selectCharacterModal.style.display = 'none'; });

    // =========================================================
    // AVENTUREIROS (OVERVIEW)
    // =========================================================
    async function loadCampaignCharacters() {
        if (!campaignCharactersList) return;
        try {
            const { data, error } = await supabase.from('campaign_characters').select(`id, user_id, character_id, current_hp, current_mana, conditions, characters(id, name, race, class, avatar_url)`).eq('campaign_id', campaignId);
            if (error) throw error;
            if (!data || data.length === 0) {
                campaignCharactersList.innerHTML = '<p style="color: var(--cream-muted);">Nenhum aventureiro.</p>';
                return;
            }

            campaignCharactersList.innerHTML = '';
            data.forEach(link => {
                const char = link.characters;
                if (!char) return;

                const isOwnCharacter = link.user_id === currentUser.id;
                const card = document.createElement('div');
                card.className = `campaign-char-card ${isOwnCharacter ? 'own-character' : ''}`;
                
                const avatarHtml = char.avatar_url ? `<img src="${char.avatar_url}" class="char-card-avatar" onerror="this.outerHTML='<div class=\\'char-card-fallback\\'>${char.name.charAt(0)}</div>'">` : `<div class="char-card-fallback">${char.name.charAt(0)}</div>`;
                const conds = link.conditions ? `<div class="char-state-badge" style="border-color:var(--fire); color:#ff9d85;">⚠️ Condições</div>` : '';
                const statsInfo = `<div style="font-size: 0.75rem; color: var(--gold); margin-top: 4px;">PV: ${link.current_hp || 0} | Mana: ${link.current_mana || 0}</div>`;

                let actionHtml = '';
                if (userRole === 'master') {
                    actionHtml = `<button class="secondary-button" style="min-height:30px; padding:5px 12px; font-size:10px;" data-action="gerenciar">Gerenciar</button>`;
                } else if (isOwnCharacter) {
                    actionHtml = `<button class="primary-button" style="min-height:30px; padding:5px 12px; font-size:10px;" data-action="acessar">Minha Ficha</button>`;
                }

                card.innerHTML = `${avatarHtml}<div class="char-card-info"><h4>${char.name}</h4><span>${char.race || '?'} • ${char.class || '?'}</span>${statsInfo}${conds}</div><div class="char-card-actions">${actionHtml}</div>`;

                const btn = card.querySelector('button');
                if (btn) {
                    btn.addEventListener('click', () => {
                        if (btn.getAttribute('data-action') === 'gerenciar') openStateModal(link.id, char.name, link.current_hp, link.current_mana, link.conditions);
                        else openPlayerSheet(link.character_id, link.id, link.current_hp, link.current_mana, link.conditions);
                    });
                }
                campaignCharactersList.appendChild(card);
            });
        } catch (error) { campaignCharactersList.innerHTML = '<p style="color: #d46a4a;">Erro.</p>'; }
    }

    function openStateModal(linkId, charName, hp, mana, conditions) {
        activeStateLinkId = linkId;
        activeStateCharName = charName;
        stateNameEl.textContent = charName;
        stateHpInput.value = hp || 0;
        stateManaInput.value = mana || 0;
        stateConditionsInput.value = conditions || "";
        stateModal.style.display = "flex";
    }

    function closeStateModal() { stateModal.style.display = "none"; }
    if (closeStateBtn) closeStateBtn.addEventListener("click", closeStateModal);
    stateModal.addEventListener('click', (e) => { if(e.target === stateModal) closeStateModal(); });

    if (stateForm) {
        stateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeStateLinkId) return;
            saveStateBtn.disabled = true;
            saveStateBtn.textContent = "Salvando...";
            try {
                const hp = parseInt(stateHpInput.value) || 0;
                const mana = parseInt(stateManaInput.value) || 0;
                const cond = stateConditionsInput.value.trim();
                const { error: updateError } = await supabase.from('campaign_characters').update({ current_hp: hp, current_mana: mana, conditions: cond }).eq('id', activeStateLinkId);
                if (updateError) throw updateError;
                const actionUser = userRole === 'master' ? 'O Mestre' : activeStateCharName;
                await generateLog(`${actionUser} atualizou o estado de ${activeStateCharName} (PV: ${hp}, Mana: ${mana}).`, 'combat');
                closeStateModal();
                await loadCampaignCharacters();
            } catch (error) { alert("Falha ao salvar."); } 
            finally { saveStateBtn.disabled = false; saveStateBtn.textContent = "Salvar Estado"; }
        });
    }

    async function openPlayerSheet(characterId, linkId, currentHp, currentMana, conditions) {
        playerSheetLinkId = linkId;
        try {
            const { data: char, error } = await supabase.from('characters').select('*').eq('id', characterId).single();
            if (error || !char) throw new Error("Ficha não encontrada.");
            playerSheetCharName = char.name;

            document.getElementById("psName").textContent = char.name || "Sem Nome";
            document.getElementById("psSubinfo").textContent = `${char.race || '?'} • ${char.class || '?'} • ${char.origin || '?'}`;
            
            const avatarContainer = document.getElementById("psAvatarContainer");
            avatarContainer.innerHTML = char.avatar_url ? `<img src="${char.avatar_url}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border: 2px solid var(--gold);">` : `<div style="width:70px; height:70px; border-radius:50%; background:#222; display:grid; place-items:center; color:var(--gold); border:2px solid var(--gold); font-size:24px; font-family:var(--display-font);">${char.name.charAt(0)}</div>`;

            document.getElementById("psHp").value = currentHp || 0;
            document.getElementById("psMana").value = currentMana || 0;
            document.getElementById("psConditions").value = conditions || "";

            const attrGrid = document.getElementById("psAttributesGrid");
            attrGrid.innerHTML = '';
            
            const standardAttributes = [
                { key: 'forca', label: 'Força' }, { key: 'agilidade', label: 'Agilidade' }, { key: 'vigor', label: 'Vigor' },
                { key: 'intelecto', label: 'Intelecto' }, { key: 'percepcao', label: 'Percepção' }, { key: 'presenca', label: 'Presença' },
                { key: 'precisao', label: 'Precisão' }, { key: 'controle', label: 'Controle' }
            ];

            let hasAttributes = false;
            standardAttributes.forEach(attr => {
                let val = 0;
                if (char[attr.key] !== undefined) val = parseInt(char[attr.key]) || 0;
                else if (char.attributes && char.attributes[attr.key] !== undefined) val = parseInt(char.attributes[attr.key]) || 0;
                
                const btn = document.createElement('button');
                btn.className = 'ps-roll-btn';
                btn.innerHTML = `${attr.label} <span class="attr-val">${val}</span>`;
                
                btn.addEventListener('click', async () => {
                    const d20 = Math.floor(Math.random() * 20) + 1;
                    const total = d20 + val;
                    btn.style.borderColor = "var(--fire)";
                    setTimeout(() => btn.style.borderColor = "", 400);
                    await generateLog(`${char.name} rolou ${attr.label}: 1d20 (${d20}) + ${val} = ${total}`, 'roll');
                    alert(`Rolagem enviada!`);
                });

                attrGrid.appendChild(btn);
                hasAttributes = true;
            });
            if (!hasAttributes) attrGrid.innerHTML = '<p style="color: var(--cream-muted); grid-column: 1/-1;">Sem atributos definidos.</p>';

            document.getElementById("psInventory").textContent = char.inventory || char.equipments || "Nenhum equipamento.";
            document.getElementById("psSkills").textContent = char.skills || char.techniques || char.abilities || "Nenhuma habilidade.";
            playerSheetModal.style.display = "flex";
        } catch (error) { alert("Não foi possível carregar a ficha."); }
    }

    if (closePlayerSheetBtn) closePlayerSheetBtn.addEventListener("click", () => { playerSheetModal.style.display = "none"; });
    playerSheetModal.addEventListener('click', (e) => { if(e.target === playerSheetModal) playerSheetModal.style.display = 'none'; });

    if (psStateForm) {
        psStateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!playerSheetLinkId) return;
            const btn = document.getElementById("psSaveStateBtn");
            btn.disabled = true;
            btn.textContent = "Atualizando...";
            try {
                const hp = parseInt(document.getElementById("psHp").value) || 0;
                const mana = parseInt(document.getElementById("psMana").value) || 0;
                const cond = document.getElementById("psConditions").value.trim();
                const { error: updateError } = await supabase.from('campaign_characters').update({ current_hp: hp, current_mana: mana, conditions: cond }).eq('id', playerSheetLinkId);
                if (updateError) throw updateError;
                await generateLog(`${playerSheetCharName} atualizou seu próprio estado (PV: ${hp}, Mana: ${mana}).`, 'system');
                await loadCampaignCharacters();
                alert("Estado atualizado!");
            } catch (error) { alert("Falha ao salvar estado."); } 
            finally { btn.disabled = false; btn.textContent = "Atualizar Estado"; }
        });
    }

    // =========================================================
    // MURAL (COM IMAGENS FASE 9)
    // =========================================================
    async function loadMural() {
        try {
            const { data, error } = await supabase.from('campaign_mural').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
            if (error) throw error;
            if (!data || data.length === 0) {
                muralList.innerHTML = '<p style="color: var(--cream-muted);">O mural está vazio.</p>';
                return;
            }
            muralList.innerHTML = '';
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'mural-card';
                let imgHtml = item.image_url ? `<img src="${item.image_url}" class="mural-image" loading="lazy">` : '';
                div.innerHTML = `${imgHtml}<div class="mural-content-box"><h4>${item.title}</h4><p>${item.content}</p></div>`;
                muralList.appendChild(div);
            });
        } catch (e) { muralList.innerHTML = '<p style="color: #d46a4a;">Erro ao carregar o mural.</p>'; }
    }

    if (openMuralBtn) openMuralBtn.addEventListener('click', () => { muralForm.reset(); muralModal.style.display = 'flex'; });
    if (closeMuralBtn) closeMuralBtn.addEventListener('click', () => muralModal.style.display = 'none');
    muralModal.addEventListener('click', (e) => { if(e.target === muralModal) muralModal.style.display = 'none'; });

    if (muralForm) {
        muralForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            saveMuralBtn.disabled = true;
            saveMuralBtn.textContent = "Fixando...";

            try {
                const title = muralTitleInput.value.trim();
                const content = muralContentInput.value.trim();
                const file = muralImageInput.files[0];
                let publicUrl = null;

                if (file) {
                    saveMuralBtn.textContent = "Enviando Imagem...";
                    const fileExt = file.name.split('.').pop();
                    const filePath = `${campaignId}/${Date.now()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from('campaign_mural').upload(filePath, file);
                    if (uploadError) throw uploadError;
                    const { data: urlData } = supabase.storage.from('campaign_mural').getPublicUrl(filePath);
                    publicUrl = urlData.publicUrl;
                }

                saveMuralBtn.textContent = "Salvando Banco...";
                const { error } = await supabase.from('campaign_mural').insert({ 
                    campaign_id: campaignId, title: title, content: content, type: 'cartaz', image_url: publicUrl 
                });
                if (error) throw error;
                await generateLog(`O Mestre fixou um novo cartaz no Mural: "${title}"`, 'system');
                muralModal.style.display = 'none';
                await loadMural(); 
            } catch (error) { alert("Falha ao criar cartaz."); } 
            finally { saveMuralBtn.disabled = false; saveMuralBtn.textContent = "Fixar no Mural"; }
        });
    }

    // =========================================================
    // LOGS & REQUESTS (FASE 9)
    // =========================================================
    async function loadLogs() {
        try {
            const { data, error } = await supabase.from('campaign_logs').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
            if (error) throw error;
            if (!data || data.length === 0) {
                logsList.innerHTML = '<p style="color: var(--cream-muted);">Nenhum registro encontrado.</p>';
                return;
            }
            logsList.innerHTML = '';
            data.forEach(log => {
                const date = new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const div = document.createElement('div');
                
                let extraClass = '';
                if(log.log_type === 'request_roll') extraClass = 'log-request';
                else if(log.log_type === 'roll') extraClass = 'log-roll';
                
                div.className = `log-item ${extraClass}`;
                div.innerHTML = `<span class="log-time">[${date}]</span> <span>${log.description}</span>`;
                logsList.appendChild(div);
            });
        } catch (e) { logsList.innerHTML = '<p style="color: #d46a4a;">Erro histórico.</p>'; }
    }

    async function generateLog(description, type = 'system') {
        try {
            await supabase.from('campaign_logs').insert({ campaign_id: campaignId, description: description, log_type: type });
        } catch (e) {}
    }

    // Enviar Solicitação de Teste (Mestre)
    if (sendRollRequestBtn) {
        sendRollRequestBtn.addEventListener('click', async () => {
            const attr = requestRollSelect.value;
            sendRollRequestBtn.disabled = true;
            try {
                await generateLog(`Teste Solicitado: ${attr}`, 'request_roll');
                alert("Teste solicitado aos jogadores!");
            } catch (error) { alert("Erro ao solicitar."); }
            finally { sendRollRequestBtn.disabled = false; }
        });
    }

    // Exibir Toast de Solicitação para o Jogador
    function showRollRequest(requestStr) {
        // requestStr esperado: "Teste Solicitado: Percepção"
        const parts = requestStr.split(': ');
        if(parts.length < 2) return;
        currentRequestAttrName = parts[1].trim();
        
        requestToastMsg.textContent = `Teste de ${currentRequestAttrName}`;
        requestToast.hidden = false;
        
        // Tenta buscar o valor do atributo na ficha ativa do jogador, se ele tiver uma
        currentRequestAttrValue = 0; // Default
        if (playerSheetCharName && currentRequestAttrName !== 'Puro (1d20)') {
            // Busca visualmente nos botões de rolagem se a ficha já foi carregada
            // Se a ficha não foi aberta ainda, o valor será 0, mas pelo menos ele roda o d20.
            const btns = document.querySelectorAll('.ps-roll-btn');
            btns.forEach(b => {
                if(b.textContent.includes(currentRequestAttrName)) {
                    const span = b.querySelector('.attr-val');
                    if(span) currentRequestAttrValue = parseInt(span.textContent) || 0;
                }
            });
        }
    }

    // Ação do botão do Toast
    if (requestToastRollBtn) {
        requestToastRollBtn.addEventListener('click', async () => {
            requestToast.hidden = true;
            const d20 = Math.floor(Math.random() * 20) + 1;
            
            if (currentRequestAttrName === 'Puro (1d20)') {
                await generateLog(`Rolagem solicitada (Puro): 1d20 = ${d20}`, 'roll');
            } else {
                const total = d20 + currentRequestAttrValue;
                const charName = playerSheetCharName || 'Um jogador';
                await generateLog(`${charName} respondeu ao teste de ${currentRequestAttrName}: 1d20 (${d20}) + ${currentRequestAttrValue} = ${total}`, 'roll');
            }
        });
    }

    if (requestToastCloseBtn) {
        requestToastCloseBtn.addEventListener('click', () => { requestToast.hidden = true; });
    }

    // Rolagens Manuais do Mestre
    masterDiceBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const sides = parseInt(btn.getAttribute('data-dice'));
            const result = Math.floor(Math.random() * sides) + 1;
            const originalText = btn.textContent;
            btn.textContent = `[ ${result} ]`;
            btn.style.borderColor = "var(--fire)";
            btn.style.color = "var(--cream)";
            setTimeout(() => { btn.textContent = originalText; btn.style.borderColor = ""; btn.style.color = ""; }, 1000);
            await generateLog(`O Mestre rolou 1d${sides}. Resultado: ${result}`, 'combat');
        });
    });

    // =========================================================
    // CONFIGURAÇÕES
    // =========================================================
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById("saveSettingsBtn");
            btn.disabled = true;
            btn.textContent = "Salvando...";
            try {
                const { error } = await supabase.from('campaigns').update({ name: settingsName.value, description: settingsDesc.value }).eq('id', campaignId);
                if (error) throw error;
                bannerName.textContent = settingsName.value;
                alert("Configurações atualizadas!");
            } catch (err) { alert("Erro ao atualizar campanha."); } 
            finally { btn.disabled = false; btn.textContent = "Salvar Alterações"; }
        });
    }

    if (deleteCampaignBtn) {
        deleteCampaignBtn.addEventListener('click', async () => {
            const conf = confirm("ATENÇÃO: Deseja mesmo EXCLUIR a campanha?");
            if (!conf) return;
            try {
                const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);
                if (error) throw error;
                localStorage.removeItem("aeriom_active_campaign");
                window.location.href = "campanhas.html";
            } catch (err) { alert("Erro ao excluir campanha."); }
        });
    }

    if (generateInviteBtn) {
        generateInviteBtn.addEventListener('click', async () => {
            generateInviteBtn.disabled = true;
            generateInviteBtn.textContent = "Gerando...";
            const code = 'AERION-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            try {
                const { error } = await supabase.from('campaign_invites').insert({ campaign_id: campaignId, code: code, created_by: currentUser.id });
                if (error) throw error;
                inviteCodeDisplay.textContent = code;
                inviteCodeDisplay.hidden = false;
                generateInviteBtn.textContent = "Gerar Novo Convite";
            } catch (error) { alert("Falha ao gerar o código."); } 
            finally { generateInviteBtn.disabled = false; }
        });
    }

    init();
});
