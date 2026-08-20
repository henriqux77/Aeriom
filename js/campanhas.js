document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("Aeriom: supabaseClient não encontrado.");
        return;
    }

    let currentUser = null;
    let pendingCampaignId = null; // Armazena ID da campanha ao entrar por convite

    const listContainer = document.getElementById("campaignsList");
    const loadingEl = document.getElementById("loadingCampaigns");
    const emptyEl = document.getElementById("emptyCampaigns");
    const backBtn = document.getElementById("backButton");
    
    const createModal = document.getElementById("createCampaignModal");
    const btnOpenModal = document.getElementById("createCampaignBtn");
    const btnEmptyCreate = document.getElementById("emptyCreateCampaignBtn");
    const btnCloseModal = document.getElementById("closeCreateModal");
    const createForm = document.getElementById("createCampaignForm");
    const submitBtn = document.getElementById("submitCampaignBtn");

    const joinModal = document.getElementById("joinCampaignModal");
    const btnOpenJoinModal = document.getElementById("openJoinModalBtn");
    const btnCloseJoinModal = document.getElementById("closeJoinModal");
    const joinForm = document.getElementById("joinCampaignForm");
    const joinMessage = document.getElementById("joinMessage");

    const selectCharacterModal = document.getElementById("selectCharacterModal");
    const userCharactersList = document.getElementById("userCharactersList");

    if (backBtn) {
        backBtn.addEventListener("click", () => window.location.href = "index.html");
    }

    async function init() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = "index.html";
            return;
        }
        currentUser = session.user;
        await loadCampaigns();
    }

    function showState(state) {
        loadingEl.style.display = state === 'loading' ? 'block' : 'none';
        emptyEl.style.display = state === 'empty' ? 'block' : 'none';
        listContainer.style.display = state === 'list' ? 'grid' : 'none';
    }

    async function loadCampaigns() {
        showState('loading');
        try {
            const { data, error } = await supabase
                .from('campaign_members')
                .select(`role, campaigns (id, name, description, cover_url)`)
                .eq('user_id', currentUser.id)
                .order('joined_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                showState('empty');
                return;
            }

            listContainer.innerHTML = '';
            data.forEach(item => {
                if(item.campaigns) listContainer.appendChild(createCampaignCard(item.campaigns, item.role));
            });
            showState('list');
        } catch (error) {
            console.error("Erro ao carregar campanhas:", error);
            showState('empty');
        }
    }

    function createCampaignCard(campaign, role) {
        const card = document.createElement('article');
        card.className = 'campaign-card';
        const roleText = role === 'master' ? 'Mestre' : 'Jogador';
        const roleClass = role === 'master' ? 'master' : 'player';
        const name = campaign.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const desc = (campaign.description || "Sem descrição.").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const cover = campaign.cover_url || 'https://via.placeholder.com/300x140?text=Sem+Capa';

        card.innerHTML = `
            <div class="campaign-cover">
                <span class="campaign-role-badge ${roleClass}">${roleText}</span>
                <img src="${cover}" alt="Capa de ${name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x140?text=Erro+na+Imagem'">
            </div>
            <div class="campaign-info">
                <h3>${name}</h3>
                <p>${desc.length > 80 ? desc.substring(0, 80) + '...' : desc}</p>
                <button class="primary-button enter-campaign-btn" data-id="${campaign.id}">Entrar no Mundo</button>
            </div>
        `;

        card.querySelector('.enter-campaign-btn').addEventListener('click', () => {
            localStorage.setItem("aeriom_active_campaign", campaign.id);
            window.location.href = "campanha.html"; 
        });
        return card;
    }

    // MODAIS DE CRIAÇÃO E CONVITE
    function closeAllModals() {
        createModal.style.display = 'none';
        joinModal.style.display = 'none';
        selectCharacterModal.style.display = 'none';
        createForm.reset();
        joinForm.reset();
        joinMessage.textContent = "";
    }

    if(btnOpenModal) btnOpenModal.addEventListener('click', () => createModal.style.display = 'flex');
    if(btnEmptyCreate) btnEmptyCreate.addEventListener('click', () => createModal.style.display = 'flex');
    if(btnCloseModal) btnCloseModal.addEventListener('click', closeAllModals);
    
    if(btnOpenJoinModal) btnOpenJoinModal.addEventListener('click', () => joinModal.style.display = 'flex');
    if(btnCloseJoinModal) btnCloseJoinModal.addEventListener('click', closeAllModals);

    window.addEventListener('click', (e) => {
        if(e.target === createModal || e.target === joinModal) closeAllModals();
    });

    // =========================================================
    // CRIAR CAMPANHA
    // =========================================================
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById("campaignName").value.trim();
        const desc = document.getElementById("campaignDesc").value.trim();
        const file = document.getElementById("campaignCover").files[0];

        if (!name || !file) return alert("Nome e imagem são obrigatórios.");
        if (file.size > 3 * 1024 * 1024) return alert("Capa max 3MB.");

        submitBtn.disabled = true;
        submitBtn.textContent = "Forjando o mundo...";

        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('campaign_covers').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('campaign_covers').getPublicUrl(filePath);
            const { data: campData, error: campError } = await supabase.from('campaigns').insert({
                name, description: desc, cover_url: publicUrlData.publicUrl, master_id: currentUser.id
            }).select('id').single();
            if (campError) throw campError;

            await supabase.from('campaign_members').insert({ campaign_id: campData.id, user_id: currentUser.id, role: 'master' });
            
            closeAllModals();
            await loadCampaigns();
        } catch (error) {
            console.error(error);
            alert("Falha ao criar campanha.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Criar Mundo";
        }
    });

    // =========================================================
    // ENTRAR VIA CONVITE
    // =========================================================
    joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById("inviteCodeInput").value.trim().toUpperCase();
        if(!code) return;
        joinMessage.textContent = "Verificando código...";

        try {
            // Verifica o convite
            const { data: invite, error: inviteError } = await supabase
                .from('campaign_invites')
                .select('campaign_id')
                .eq('code', code)
                .eq('is_active', true)
                .maybeSingle();

            if (inviteError || !invite) {
                joinMessage.textContent = "Convite inválido ou expirado.";
                return;
            }

            pendingCampaignId = invite.campaign_id;

            // Insere o usuário como membro (ignora erro se já for membro via unique constraint)
            const { error: memberError } = await supabase
                .from('campaign_members')
                .insert({ campaign_id: pendingCampaignId, user_id: currentUser.id, role: 'player' });

            if (memberError && memberError.code !== '23505') throw memberError;

            // Passa para a seleção de ficha
            joinModal.style.display = 'none';
            openCharacterSelection();

        } catch (error) {
            console.error("Erro no convite:", error);
            joinMessage.textContent = "Erro ao processar o convite.";
        }
    });

    // =========================================================
    // ESCOLHER FICHA
    // =========================================================
    async function openCharacterSelection() {
        selectCharacterModal.style.display = 'flex';
        userCharactersList.innerHTML = '<p style="text-align: center;">Carregando suas fichas...</p>';

        try {
            const { data: characters, error } = await supabase
                .from('characters')
                .select('id, name, race, class, avatar_url')
                .eq('user_id', currentUser.id);

            if (error) throw error;

            if (!characters || characters.length === 0) {
                userCharactersList.innerHTML = `<p style="text-align: center; color: var(--cream-muted);">Você não possui nenhuma ficha criada. Crie uma ficha primeiro.</p>`;
                return;
            }

            userCharactersList.innerHTML = '';
            characters.forEach(char => {
                const charEl = document.createElement('div');
                charEl.style.display = 'flex';
                charEl.style.alignItems = 'center';
                charEl.style.gap = '15px';
                charEl.style.padding = '12px';
                charEl.style.border = '1px solid rgba(200, 100, 50, 0.3)';
                charEl.style.borderRadius = '10px';
                charEl.style.background = 'rgba(25, 17, 15, 0.6)';
                charEl.style.cursor = 'pointer';

                const avatar = char.avatar_url ? `<img src="${char.avatar_url}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : `<div style="width:40px; height:40px; border-radius:50%; background:#222; display:grid; place-items:center; color:var(--gold); border:1px solid var(--gold);">${char.name.charAt(0)}</div>`;

                charEl.innerHTML = `
                    ${avatar}
                    <div style="flex:1;">
                        <h4 style="margin:0; color:var(--cream); font-family:var(--display-font);">${char.name}</h4>
                        <span style="font-size:11px; color:var(--cream-muted);">${char.race || '?'} • ${char.class || '?'}</span>
                    </div>
                    <button class="secondary-button" style="min-height:30px; padding:5px 15px; font-size:10px;">Selecionar</button>
                `;

                charEl.addEventListener('click', () => selectCharacterForCampaign(char.id));
                userCharactersList.appendChild(charEl);
            });

        } catch (error) {
            console.error("Erro ao carregar fichas:", error);
            userCharactersList.innerHTML = '<p style="color:#d46a4a;">Erro ao carregar fichas.</p>';
        }
    }

    async function selectCharacterForCampaign(characterId) {
        if (!pendingCampaignId) return;
        
        try {
            const { error } = await supabase
                .from('campaign_characters')
                .insert({
                    campaign_id: pendingCampaignId,
                    user_id: currentUser.id,
                    character_id: characterId
                });

            if (error && error.code !== '23505') throw error; // 23505 = já vinculado

            localStorage.setItem("aeriom_active_campaign", pendingCampaignId);
            window.location.href = "campanha.html";
        } catch (error) {
            console.error("Erro ao vincular ficha:", error);
            alert("Não foi possível vincular sua ficha à campanha. Tente novamente.");
        }
    }

    init();
});
