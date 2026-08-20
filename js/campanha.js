document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) return;

    let currentUser = null;
    let currentCampaign = null;
    let userRole = null;

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

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            localStorage.removeItem("aeriom_active_campaign");
            window.location.href = "campanhas.html";
        });
    }

    async function init() {
        if (!campaignId) {
            alert("Nenhuma campanha selecionada.");
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
    }

    async function loadCampaignData() {
        try {
            // Verifica a role do usuário nesta campanha
            const { data: memberData, error: memberError } = await supabase
                .from('campaign_members')
                .select('role')
                .eq('campaign_id', campaignId)
                .eq('user_id', currentUser.id)
                .single();

            if (memberError || !memberData) throw new Error("Acesso negado.");
            userRole = memberData.role;

            // Busca os detalhes da campanha
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
            alert("Você não tem acesso a esta campanha.");
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

        // Se for mestre, mostra o painel de ferramentas
        if (userRole === 'master') {
            masterPanel.hidden = false;
        }
    }

    // Gerar Convite
    if (generateInviteBtn) {
        generateInviteBtn.addEventListener('click', async () => {
            generateInviteBtn.disabled = true;
            generateInviteBtn.textContent = "Gerando...";

            const code = 'AERION-' + Math.random().toString(36).substring(2, 8).toUpperCase();

            try {
                const { error } = await supabase
                    .from('campaign_invites')
                    .insert({
                        campaign_id: campaignId,
                        code: code,
                        created_by: currentUser.id
                    });

                if (error) throw error;

                inviteCodeDisplay.textContent = code;
                inviteCodeDisplay.hidden = false;
                generateInviteBtn.textContent = "Gerar Novo Convite";

            } catch (error) {
                console.error("Erro ao gerar convite:", error);
                alert("Falha ao gerar o código.");
                generateInviteBtn.textContent = "Gerar Convite";
            } finally {
                generateInviteBtn.disabled = false;
            }
        });
    }

    // =========================================================
    // BUSCAR E RENDERIZAR PERSONAGENS DA CAMPANHA
    // =========================================================
    async function loadCampaignCharacters() {
        if (!campaignCharactersList) return;

        try {
            // Faz um join entre campaign_characters e characters
            const { data, error } = await supabase
                .from('campaign_characters')
                .select(`
                    id,
                    user_id,
                    character_id,
                    characters (
                        id,
                        name,
                        race,
                        class,
                        avatar_url
                    )
                `)
                .eq('campaign_id', campaignId);

            if (error) throw error;

            if (!data || data.length === 0) {
                campaignCharactersList.innerHTML = '<p style="color: var(--cream-muted); font-size: 0.85rem;">Nenhum aventureiro entrou neste mundo ainda.</p>';
                return;
            }

            campaignCharactersList.innerHTML = '';

            data.forEach(link => {
                const char = link.characters;
                if (!char) return; // Proteção extra caso a ficha original tenha sido deletada

                const card = document.createElement('div');
                card.className = 'campaign-char-card';
                
                const isOwnCharacter = link.user_id === currentUser.id;
                
                if (isOwnCharacter) {
                    card.classList.add('own-character');
                }

                // Avatar fallback se não houver imagem ou se quebrar
                const avatarHtml = char.avatar_url 
                    ? `<img src="${char.avatar_url}" class="char-card-avatar" alt="${char.name}" onerror="this.outerHTML='<div class=\\'char-card-fallback\\'>${char.name.charAt(0)}</div>'">` 
                    : `<div class="char-card-fallback">${char.name.charAt(0)}</div>`;

                // Monta os botões dependendo da permissão
                let actionHtml = '';
                if (userRole === 'master') {
                    actionHtml = `<button class="secondary-button" style="min-height:30px; padding:5px 12px; font-size:10px; width:auto;" onclick="alert('Sistema de gerenciamento do Mestre virá na Fase 6')">Gerenciar</button>`;
                } else if (isOwnCharacter) {
                    actionHtml = `<button class="primary-button" style="min-height:30px; padding:5px 12px; font-size:10px; width:auto;" onclick="alert('Acesso ao Estado Temporário virá na Fase 7')">Acessar</button>`;
                }

                card.innerHTML = `
                    ${avatarHtml}
                    <div class="char-card-info">
                        <h4>${char.name}</h4>
                        <span>${char.race || '?'} • ${char.class || '?'}</span>
                    </div>
                    <div class="char-card-actions">
                        ${actionHtml}
                    </div>
                `;

                campaignCharactersList.appendChild(card);
            });

        } catch (error) {
            console.error("Erro ao buscar personagens:", error);
            campaignCharactersList.innerHTML = '<p style="color: #d46a4a; font-size: 0.85rem;">Erro ao carregar aventureiros.</p>';
        }
    }

    init();
});
