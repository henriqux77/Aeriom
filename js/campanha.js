document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) return;

    let currentUser = null;
    let currentCampaign = null;
    let userRole = null;
    let activeStateLinkId = null;
    let activeStateCharName = "";

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
    
    // TABS
    const tabs = document.querySelectorAll('.dash-tab');
    const tabContents = document.querySelectorAll('.dash-tab-content');

    // MURAL E LOGS
    const muralList = document.getElementById("muralList");
    const logsList = document.getElementById("logsList");

    // MODAL DE ESTADO
    const stateModal = document.getElementById("characterStateModal");
    const closeStateBtn = document.getElementById("closeCharacterStateModal");
    const stateForm = document.getElementById("characterStateForm");
    const stateNameEl = document.getElementById("stateModalName");
    const stateHpInput = document.getElementById("stateHp");
    const stateManaInput = document.getElementById("stateMana");
    const stateConditionsInput = document.getElementById("stateConditions");
    const saveStateBtn = document.getElementById("saveStateBtn");

    // MODAL DO MURAL
    const muralModal = document.getElementById("muralModal");
    const openMuralBtn = document.getElementById("openMuralModalBtn");
    const closeMuralBtn = document.getElementById("closeMuralModal");
    const muralForm = document.getElementById("muralForm");
    const muralTitleInput = document.getElementById("muralTitle");
    const muralContentInput = document.getElementById("muralContent");
    const saveMuralBtn = document.getElementById("saveMuralBtn");

    // ROLAGEM DE DADOS
    const diceBtns = document.querySelectorAll('.dice-btn');

    // CONFIGURAÇÕES
    const settingsForm = document.getElementById("campaignSettingsForm");
    const settingsName = document.getElementById("settingsName");
    const settingsDesc = document.getElementById("settingsDesc");
    const deleteCampaignBtn = document.getElementById("deleteCampaignBtn");

    // ESCOLHER FICHA IN-GAME (QoL FASE 8)
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
    }

    // =========================================================
    // TABS DE NAVEGAÇÃO
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

    // =========================================================
    // DADOS DA CAMPANHA
    // =========================================================
    async function loadCampaignData() {
        try {
            const { data: memberData, error: memberError } = await supabase
                .from('campaign_members')
                .select('role')
                .eq('campaign_id', campaignId)
                .eq('user_id', currentUser.id)
                .single();

            if (memberError || !memberData) throw new Error("Acesso negado.");
            userRole = memberData.role;

            const { data: campData, error: campError } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (campError) throw campError;
            currentCampaign = campData;

            renderDashboard();
            await loadCampaignCharacters();

        } catch (error) {
            console.error("Erro no painel:", error);
            window.location.href = "campanhas.html";
        }
    }

    function renderDashboard() {
        loadingEl.style.display = "none";
        contentEl.hidden = false;

        roleLabel.textContent = userRole === 'master' ? 'Mestre da Campanha' : 'Jogador';
        roleLabel.style.color = userRole === 'master' ? 'var(--fire)' : 'var(--orange)';
        bannerName.textContent = currentCampaign.name;
        
        if (currentCampaign.cover_url) {
            banner.style.backgroundImage = `url('${currentCampaign.cover_url}')`;
        }

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
    // VINCULAR FICHA (NOVO)
    // =========================================================
    if (addMyCharacterBtn) {
        addMyCharacterBtn.addEventListener('click', async () => {
            selectCharacterModal.style.display = 'flex';
            userCharactersList.innerHTML = '<p style="text-align: center; color: var(--cream-muted);">Carregando suas fichas...</p>';

            try {
                // 1. Busca TODAS as fichas do usuário
                const { data: allChars, error: charError } = await supabase
                    .from('characters')
                    .select('id, name, race, class, avatar_url')
                    .eq('user_id', currentUser.id);

                if (charError) throw charError;

                // 2. Busca quais fichas já estão na campanha
                const { data: linkedChars, error: linkedError } = await supabase
                    .from('campaign_characters')
                    .select('character_id')
                    .eq('campaign_id', campaignId);

                if (linkedError) throw linkedError;
                
                const linkedIds = linkedChars.map(lc => lc.character_id);

                if (!allChars || allChars.length === 0) {
                    userCharactersList.innerHTML = `<p style="text-align: center; color: var(--cream-muted);">Você não possui nenhuma ficha criada. Volte à página inicial para criar uma.</p>`;
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

                    const avatar = char.avatar_url 
                        ? `<img src="${char.avatar_url}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` 
                        : `<div style="width:40px; height:40px; border-radius:50%; background:#222; display:grid; place-items:center; color:var(--gold); border:1px solid var(--gold);">${char.name.charAt(0)}</div>`;

                    charEl.innerHTML = `
                        ${avatar}
                        <div style="flex:1;">
                            <h4 style="margin:0; color:var(--cream); font-family:var(--display-font);">${char.name}</h4>
                            <span style="font-size:11px; color:var(--cream-muted);">${char.race || '?'} • ${char.class || '?'}</span>
                        </div>
                        <button class="secondary-button" style="min-height:30px; padding:5px 15px; font-size:10px;" ${isLinked ? 'disabled' : ''}>${isLinked ? 'Já Adicionado' : 'Selecionar'}</button>
                    `;

                    if (!isLinked) {
                        charEl.addEventListener('click', async () => {
                            try {
                                const { error: insertError } = await supabase
                                    .from('campaign_characters')
                                    .insert({
                                        campaign_id: campaignId,
                                        user_id: currentUser.id,
                                        character_id: char.id
                                    });

                                if (insertError) throw insertError;
                                
                                await generateLog(`Um novo aventureiro entrou no mundo: ${char.name}.`, 'system');
                                
                                selectCharacterModal.style.display = 'none';
                                await loadCampaignCharacters();
                                alert(`${char.name} foi adicionado à campanha com sucesso!`);
                                
                            } catch (err) {
                                console.error("Erro ao vincular ficha:", err);
                                alert("Não foi possível adicionar o personagem.");
                            }
                        });
                    }

                    userCharactersList.appendChild(charEl);
                });

            } catch (error) {
                console.error("Erro ao carregar fichas:", error);
                userCharactersList.innerHTML = '<p style="color:#d46a4a;">Erro ao carregar fichas.</p>';
            }
        });
    }

    if (closeSelectCharacterModal) {
        closeSelectCharacterModal.addEventListener('click', () => { selectCharacterModal.style.display = 'none'; });
    }
    
    selectCharacterModal.addEventListener('click', (e) => { 
        if(e.target === selectCharacterModal) selectCharacterModal.style.display = 'none'; 
    });


    // =========================================================
    // ESTADO DO PERSONAGEM
    // =========================================================
    async function loadCampaignCharacters() {
        if (!campaignCharactersList) return;
        try {
            const { data, error } = await supabase
                .from('campaign_characters')
                .select(`id, user_id, current_hp, current_mana, conditions, characters(id, name, race, class, avatar_url)`)
                .eq('campaign_id', campaignId);

            if (error) throw error;
            if (!data || data.length === 0) {
                campaignCharactersList.innerHTML = '<p style="color: var(--cream-muted);">Nenhum aventureiro entrou neste mundo ainda.</p>';
                return;
            }

            campaignCharactersList.innerHTML = '';
            data.forEach(link => {
                const char = link.characters;
                if (!char) return;

                const isOwnCharacter = link.user_id === currentUser.id;
                const card = document.createElement('div');
                card.className = `campaign-char-card ${isOwnCharacter ? 'own-character' : ''}`;
                
                const avatarHtml = char.avatar_url 
                    ? `<img src="${char.avatar_url}" class="char-card-avatar" onerror="this.outerHTML='<div class=\\'char-card-fallback\\'>${char.name.charAt(0)}</div>'">` 
                    : `<div class="char-card-fallback">${char.name.charAt(0)}</div>`;

                const conds = link.conditions ? `<div class="char-state-badge" style="border-color:var(--fire); color:#ff9d85;">⚠️ Condições</div>` : '';
                const statsInfo = `<div style="font-size: 0.75rem; color: var(--gold); margin-top: 4px;">PV: ${link.current_hp || 0} | Mana: ${link.current_mana || 0}</div>`;

                let actionHtml = '';
                if (userRole === 'master') {
                    actionHtml = `<button class="secondary-button" style="min-height:30px; padding:5px 12px; font-size:10px;">Gerenciar</button>`;
                } else if (isOwnCharacter) {
                    actionHtml = `<button class="primary-button" style="min-height:30px; padding:5px 12px; font-size:10px;">Acessar</button>`;
                }

                card.innerHTML = `${avatarHtml}<div class="char-card-info"><h4>${char.name}</h4><span>${char.race || '?'} • ${char.class || '?'}</span>${statsInfo}${conds}</div><div class="char-card-actions">${actionHtml}</div>`;

                const btn = card.querySelector('button');
                if (btn) btn.addEventListener('click', () => openStateModal(link.id, char.name, link.current_hp, link.current_mana, link.conditions));

                campaignCharactersList.appendChild(card);
            });
        } catch (error) {
            campaignCharactersList.innerHTML = '<p style="color: #d46a4a;">Erro ao carregar aventureiros.</p>';
        }
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

    function closeStateModal() {
        stateModal.style.display = "none";
        activeStateLinkId = null;
        activeStateCharName = "";
    }

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
            } catch (error) {
                console.error("Erro ao salvar estado:", error);
                alert("Falha ao salvar. Verifique se você tem permissão.");
            } finally {
                saveStateBtn.disabled = false;
                saveStateBtn.textContent = "Salvar Estado";
            }
        });
    }

    // =========================================================
    // MURAL E LOGS
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
                div.innerHTML = `<h4>${item.title}</h4><p>${item.content}</p>`;
                muralList.appendChild(div);
            });
        } catch (e) {
            muralList.innerHTML = '<p style="color: #d46a4a;">Erro ao carregar o mural.</p>';
        }
    }

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
                div.className = 'log-item';
                div.innerHTML = `<span class="log-time">[${date}]</span> <span>${log.description}</span>`;
                logsList.appendChild(div);
            });
        } catch (e) {
            logsList.innerHTML = '<p style="color: #d46a4a;">Erro ao carregar histórico.</p>';
        }
    }

    async function generateLog(description, type = 'system') {
        try {
            await supabase.from('campaign_logs').insert({
                campaign_id: campaignId,
                description: description,
                log_type: type
            });
        } catch (e) {
            console.error("Falha ao salvar log", e);
        }
    }

    // =========================================================
    // CRIAR AVISO NO MURAL
    // =========================================================
    if (openMuralBtn) openMuralBtn.addEventListener('click', () => { muralForm.reset(); muralModal.style.display = 'flex'; });
    if (closeMuralBtn) closeMuralBtn.addEventListener('click', () => muralModal.style.display = 'none');
    muralModal.addEventListener('click', (e) => { if(e.target === muralModal) muralModal.style.display = 'none'; });

    if (muralForm) {
        muralForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            saveMuralBtn.disabled = true;
            saveMuralBtn.textContent = "Fixando cartaz...";

            try {
                const title = muralTitleInput.value.trim();
                const content = muralContentInput.value.trim();

                const { error } = await supabase.from('campaign_mural').insert({
                    campaign_id: campaignId,
                    title: title,
                    content: content,
                    type: 'cartaz'
                });

                if (error) throw error;

                await generateLog(`O Mestre fixou um novo cartaz no Mural: "${title}"`, 'system');
                
                muralModal.style.display = 'none';
                await loadMural(); 
                
            } catch (error) {
                console.error("Erro ao salvar mural", error);
                alert("Falha ao criar cartaz.");
            } finally {
                saveMuralBtn.disabled = false;
                saveMuralBtn.textContent = "Fixar no Mural";
            }
        });
    }

    // =========================================================
    // ROLAGEM DE DADOS DO MESTRE
    // =========================================================
    diceBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const sides = parseInt(btn.getAttribute('data-dice'));
            const result = Math.floor(Math.random() * sides) + 1;
            
            const originalText = btn.textContent;
            btn.textContent = `[ ${result} ]`;
            btn.style.borderColor = "var(--fire)";
            btn.style.color = "var(--cream)";
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.borderColor = "";
                btn.style.color = "";
            }, 1000);

            await generateLog(`O Mestre rolou 1d${sides}. Resultado: ${result}`, 'combat');
        });
    });

    // =========================================================
    // CONFIGURAÇÕES E CONVITE
    // =========================================================
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById("saveSettingsBtn");
            btn.disabled = true;
            btn.textContent = "Salvando...";

            try {
                const { error } = await supabase.from('campaigns').update({
                    name: settingsName.value,
                    description: settingsDesc.value
                }).eq('id', campaignId);
                
                if (error) throw error;
                bannerName.textContent = settingsName.value;
                alert("Configurações atualizadas!");
            } catch (err) {
                alert("Erro ao atualizar campanha.");
            } finally {
                btn.disabled = false;
                btn.textContent = "Salvar Alterações";
            }
        });
    }

    if (deleteCampaignBtn) {
        deleteCampaignBtn.addEventListener('click', async () => {
            const conf = confirm("ATENÇÃO: Deseja mesmo EXCLUIR a campanha? Todos os dados serão perdidos.");
            if (!conf) return;

            try {
                const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);
                if (error) throw error;
                localStorage.removeItem("aeriom_active_campaign");
                window.location.href = "campanhas.html";
            } catch (err) {
                alert("Erro ao excluir campanha.");
            }
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
            } catch (error) {
                alert("Falha ao gerar o código.");
                generateInviteBtn.textContent = "Gerar Convite";
            } finally {
                generateInviteBtn.disabled = false;
            }
        });
    }

    init();
});
