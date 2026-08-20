document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("Aeriom: supabaseClient não encontrado.");
        return;
    }

    let currentUser = null;

    // Elementos da Interface
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

    // =========================================================
    // NAVEGAÇÃO
    // =========================================================
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }

    // =========================================================
    // AUTENTICAÇÃO E SESSÃO
    // =========================================================
    async function init() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = "index.html";
            return;
        }
        currentUser = session.user;
        await loadCampaigns();
    }

    // =========================================================
    // RENDERIZAR CAMPANHAS
    // =========================================================
    function showState(state) {
        loadingEl.style.display = state === 'loading' ? 'block' : 'none';
        emptyEl.style.display = state === 'empty' ? 'block' : 'none';
        listContainer.style.display = state === 'list' ? 'grid' : 'none';
    }

    async function loadCampaigns() {
        showState('loading');
        
        try {
            // Busca as campanhas onde o usuário é membro
            const { data, error } = await supabase
                .from('campaign_members')
                .select(`
                    role,
                    campaigns (
                        id,
                        name,
                        description,
                        cover_url
                    )
                `)
                .eq('user_id', currentUser.id)
                .order('joined_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                showState('empty');
                return;
            }

            listContainer.innerHTML = '';
            data.forEach(item => {
                if(item.campaigns) {
                    listContainer.appendChild(createCampaignCard(item.campaigns, item.role));
                }
            });
            showState('list');

        } catch (error) {
            console.error("Erro ao carregar campanhas:", error);
            alert("Ocorreu um erro ao buscar suas campanhas.");
            showState('empty');
        }
    }

    function createCampaignCard(campaign, role) {
        const card = document.createElement('article');
        card.className = 'campaign-card';

        const roleText = role === 'master' ? 'Mestre' : 'Jogador';
        const roleClass = role === 'master' ? 'master' : 'player';
        
        // Proteção XSS
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
            // FASE 6: Aqui salvaremos o ID da campanha no localStorage e redirecionaremos.
            // Por enquanto, apenas um alerta preparando o terreno.
            localStorage.setItem("aeriom_active_campaign", campaign.id);
            alert(`Acesso autorizado ao painel da campanha: ${name}\n\n(A interface do Painel será implementada na Fase 3)`);
            // window.location.href = "campanha.html"; 
        });

        return card;
    }

    // =========================================================
    // MODAL DE CRIAÇÃO
    // =========================================================
    function openModal() { createModal.style.display = 'flex'; }
    function closeModal() { 
        createModal.style.display = 'none'; 
        createForm.reset();
    }

    if(btnOpenModal) btnOpenModal.addEventListener('click', openModal);
    if(btnEmptyCreate) btnEmptyCreate.addEventListener('click', openModal);
    if(btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    createModal.addEventListener('click', (e) => { if(e.target === createModal) closeModal(); });

    // =========================================================
    // CRIAR CAMPANHA (STORAGE + DATABASE)
    // =========================================================
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("campaignName").value.trim();
        const desc = document.getElementById("campaignDesc").value.trim();
        const fileInput = document.getElementById("campaignCover");
        const file = fileInput.files[0];

        if (!name || !file) {
            alert("Nome e imagem de capa são obrigatórios.");
            return;
        }

        // Validação básica do arquivo (Tamanho: max 3MB)
        if (file.size > 3 * 1024 * 1024) {
            alert("A imagem da capa deve ter no máximo 3MB.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Forjando o mundo...";

        try {
            // 1. UPLOAD DA IMAGEM PARA O STORAGE
            const fileExt = file.name.split('.').pop();
            const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('campaign_covers')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            // 2. OBTER URL PÚBLICA
            const { data: publicUrlData } = supabase.storage
                .from('campaign_covers')
                .getPublicUrl(filePath);
            
            const coverUrl = publicUrlData.publicUrl;

            // 3. INSERIR NA TABELA CAMPAIGNS
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .insert({
                    name: name,
                    description: desc,
                    cover_url: coverUrl,
                    master_id: currentUser.id
                })
                .select('id')
                .single();

            if (campaignError) throw campaignError;

            // 4. INSERIR O USUÁRIO COMO MESTRE NA TABELA MEMBROS
            const { error: memberError } = await supabase
                .from('campaign_members')
                .insert({
                    campaign_id: campaignData.id,
                    user_id: currentUser.id,
                    role: 'master'
                });

            if (memberError) throw memberError;

            // Sucesso!
            closeModal();
            await loadCampaigns(); // Recarrega a lista

        } catch (error) {
            console.error("Erro na criação:", error);
            alert("Falha ao criar campanha. Verifique se configurou o Storage e o SQL corretamente.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Criar Mundo";
        }
    });

    // Iniciar tudo
    init();
});
