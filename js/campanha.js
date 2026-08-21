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

    // CONFIGURAÇÕES
    const settingsForm = document.getElementById("campaignSettingsForm");
    const settingsName = document.getElementById("settingsName");
    const settingsDesc = document.getElementById("settingsDesc");
    const deleteCampaignBtn = document.getElementById("deleteCampaignBtn");

    // MODAL DE ESTADO
    const stateModal = document.getElementById("characterStateModal");
    const closeStateBtn = document.getElementById("closeCharacterStateModal");
    const stateForm = document.getElementById("characterStateForm");
    const stateNameEl = document.getElementById("stateModalName");
    const stateHpInput = document.getElementById("stateHp");
    const stateManaInput = document.getElementById("stateMana");
    const stateConditionsInput = document.getElementById("stateConditions");
    const saveStateBtn = document.getElementById("saveStateBtn");

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
    // ESTADO DO PERSONAGEM (FASE 6)
    // =========================================================
    async function loadCampaignCharacters() {
        if (!campaignCharactersList) return;
        try {
            // Seleciona agora também os campos temporários: current_hp, current_mana, conditions
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

                // Badge de Estado visual
                const conds = link.conditions ? `<div class="char-state-badge" style="border-color:var(--fire); color:#ff9d85;">⚠️ Condições</div>` : '';
                const statsInfo = `<div style="font-size: 0.75rem; color: var(--gold); margin-top: 4px;">PV: ${link.current_hp || 0} | Mana: ${link.current_mana || 0}</div>`;

                let actionHtml = '';
                if (userRole === 'master') {
                    actionHtml = `<button class="secondary-button" style="min-height:30px; padding:5px 12px; font-size:10px;">Gerenciar</button>`;
                } else if (isOwnCharacter) {
                    actionHtml = `<button class="primary-button" style="min-height:30px; padding:5px 12px; font-size:10px;">Acessar</button>`;
                }

                card.innerHTML = `
                    ${avatarHtml}
                    <div class="char-card-info">
                        <h4>${char.name}</h4>
                        <span>${char.race || '?'} • ${char.class || '?'}</span>
                        ${statsInfo}
                        ${conds}
                    </div>
                    <div class="char-card-actions">${actionHtml}</div>
                `;

                // Adiciona o evento de clique no botão (se existir)
                const btn = card.querySelector('button');
                if (btn) {
                    btn.addEventListener('click', () => {
                        openStateModal(link.id, char.name, link.current_hp, link.current_mana, link.conditions);
                    });
                }

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

                // 1. Atualiza a tabela temporária
                const { error: updateError } = await supabase
                    .from('campaign_characters')
                    .update({ current_hp: hp, current_mana: mana, conditions: cond })
                    .eq('id', activeStateLinkId);

                if (updateError) throw updateError;

                // 2. Registra o Log
                const actionUser = userRole === 'master' ? 'O Mestre' : activeStateCharName;
                await supabase.from('campaign_logs').insert({
                    campaign_id: campaignId,
                    description: `${actionUser} atualizou o estado de ${activeStateCharName} (PV: ${hp}, Mana: ${mana}).`,
                    log_type: 'combat'
                });

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

    // =========================================================
    // CONVITE
    // =========================================================
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
