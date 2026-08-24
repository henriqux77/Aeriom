/* =========================================================
   AERIOM — GERENCIADOR DE CAMPANHAS (js/campanhas.js)
   Fase 3: Diagnóstico, Fim do Loading Infinito e Integração
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("[AERIOM] ❌ Supabase não inicializado.");
        return;
    }

    let currentUser = null;

    // 1. Elementos de Estado da Interface
    const loadingCampaigns = document.getElementById("loadingCampaigns");
    const emptyCampaigns = document.getElementById("emptyCampaigns");
    const campaignsList = document.getElementById("campaignsList");
    const campaignsMessage = document.getElementById("campaignsMessage");

    // 2. Elementos de Criação e Modais
    const createCampaignBtn = document.getElementById("createCampaignBtn");
    const createCampaignModal = document.getElementById("createCampaignModal");
    const closeCreateModal = document.getElementById("closeCreateModal");
    const createCampaignForm = document.getElementById("createCampaignForm");
    const submitCampaignBtn = document.getElementById("submitCampaignBtn");

    // =========================================================
    // DIAGNÓSTICO E LOGS SUPABASE
    // =========================================================
    function logSupabaseError(arquivo, funcao, tabela, operacao, error) {
        console.error(`
[AERIOM][SUPABASE]
Arquivo: ${arquivo}
Função: ${funcao}
Tabela: ${tabela}
Operação: ${operacao}
Código: ${error.code || 'N/A'}
Mensagem: ${error.message || 'N/A'}
Detalhes: ${error.details || 'N/A'}
Hint: ${error.hint || 'N/A'}
        `);
    }

    // =========================================================
    // UTILITÁRIOS
    // =========================================================
    function showMessage(msg, isError = false) {
        if (!campaignsMessage) return;
        campaignsMessage.textContent = msg;
        campaignsMessage.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'} active`;
        setTimeout(() => { campaignsMessage.classList.remove('active'); }, 6000); // 6s para leitura em dev
    }

    function showState(state) {
        if (loadingCampaigns) loadingCampaigns.style.display = "none";
        if (emptyCampaigns) emptyCampaigns.style.display = "none";
        if (campaignsList) campaignsList.style.display = "none";

        if (state === 'loading' && loadingCampaigns) loadingCampaigns.style.display = "block";
        if (state === 'empty' && emptyCampaigns) emptyCampaigns.style.display = "block";
        if (state === 'list' && campaignsList) campaignsList.style.display = "grid"; 
    }

    // =========================================================
    // CARREGAMENTO DE CAMPANHAS
    // =========================================================
    async function loadCampaigns() {
        showState('loading');
        
        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            
            if (authError || !session) {
                window.location.href = "index.html";
                return;
            }
            
            currentUser = session.user;

            // Busca as mesas nas quais o jogador é membro.
            // Sem `.order('created_at')` pois a tabela 'campaign_members' não possui essa coluna no schema,
            // o que causaria o erro 42703 (Bad Request) e o infame "Loading Infinito".
            const { data: memberships, error: dbError } = await supabase
                .from('campaign_members')
                .select('role, campaigns(id, name, description, cover_url)')
                .eq('user_id', currentUser.id);

            if (dbError) {
                logSupabaseError('js/campanhas.js', 'loadCampaigns', 'campaign_members', 'SELECT', dbError);
                throw dbError;
            }

            if (!memberships || memberships.length === 0) {
                showState('empty');
                return;
            }

            renderCampaigns(memberships);
            showState('list');

        } catch (error) {
            showState('empty'); 
            showMessage(`Falha ao carregar campanhas: ${error.message || 'Erro de comunicação'}. Verifique o console.`, true);
        }
    }

    // =========================================================
    // RENDERIZAÇÃO BLINDADA CONTRA XSS
    // =========================================================
    function renderCampaigns(memberships) {
        if (!campaignsList) return;
        campaignsList.innerHTML = '';

        memberships.forEach(member => {
            const camp = member.campaigns;
            if (!camp) return;

            const card = document.createElement("div");
            card.className = "aeriom-card-interactive";
            card.style.padding = "0"; 
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.overflow = "hidden";

            // Capa da Campanha
            const cover = document.createElement("div");
            cover.style.height = "140px";
            cover.style.width = "100%";
            cover.style.borderBottom = "1px solid var(--color-border-strong)";
            cover.style.backgroundColor = "var(--color-bg-secondary)";
            
            if (camp.cover_url && camp.cover_url.trim() !== '') {
                cover.style.backgroundImage = `url('${camp.cover_url}')`;
                cover.style.backgroundSize = "cover";
                cover.style.backgroundPosition = "center";
            } else {
                cover.style.display = "grid";
                cover.style.placeItems = "center";
                const initial = document.createElement("span");
                initial.textContent = camp.name ? camp.name.charAt(0).toUpperCase() : "M";
                initial.style.fontSize = "3rem";
                initial.style.fontFamily = "var(--font-heading)";
                initial.style.color = "var(--color-primary-muted)";
                cover.appendChild(initial);
            }

            // Conteúdo Interno
            const content = document.createElement("div");
            content.style.padding = "var(--space-lg)";
            content.style.display = "flex";
            content.style.flexDirection = "column";
            content.style.gap = "var(--space-sm)";
            content.style.flex = "1";

            const title = document.createElement("h3");
            title.style.color = "var(--color-primary)";
            title.style.margin = "0";
            title.textContent = camp.name || "Mesa Sem Nome";

            const desc = document.createElement("p");
            desc.className = "text-muted";
            desc.style.fontSize = "0.9rem";
            desc.style.margin = "0";
            desc.style.flex = "1";
            desc.style.display = "-webkit-box";
            desc.style.webkitLineClamp = "3";
            desc.style.webkitBoxOrient = "vertical";
            desc.style.overflow = "hidden";
            desc.textContent = camp.description || "Sem descrição registada.";

            // Role Badge (Identifica quem é o Mestre)
            const roleBadge = document.createElement("div");
            roleBadge.style.marginTop = "var(--space-md)";
            roleBadge.style.fontSize = "0.75rem";
            roleBadge.style.fontWeight = "600";
            roleBadge.style.textTransform = "uppercase";
            roleBadge.style.letterSpacing = "0.05em";

            if (member.role === 'master') {
                roleBadge.style.color = "var(--color-accent)";
                roleBadge.textContent = "👑 Mestre da Mesa";
            } else {
                roleBadge.style.color = "var(--color-primary)";
                roleBadge.textContent = "⚔️ Aventureiro";
            }

            // Montagem
            content.appendChild(title);
            content.appendChild(desc);
            content.appendChild(roleBadge);
            card.appendChild(cover);
            card.appendChild(content);

            // Ação de Redirecionamento para a Mesa Virtual (VTT)
            card.addEventListener("click", () => {
                localStorage.setItem("aeriom_active_campaign", camp.id);
                window.location.href = "campanha.html";
            });

            campaignsList.appendChild(card);
        });
    }

    // =========================================================
    // CRIAÇÃO DE NOVA CAMPANHA
    // =========================================================
    createCampaignBtn?.addEventListener("click", () => {
        if (createCampaignModal) createCampaignModal.classList.add("active");
    });

    closeCreateModal?.addEventListener("click", () => {
        if (createCampaignModal) createCampaignModal.classList.remove("active");
    });

    createCampaignForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            showMessage("Precisa estar autenticado para fundar uma campanha.", true);
            return;
        }

        if (submitCampaignBtn) {
            submitCampaignBtn.disabled = true;
            submitCampaignBtn.textContent = "A Fundar Mesa...";
        }

        const name = document.getElementById("campaignName").value.trim();
        const desc = document.getElementById("campaignDesc").value.trim();
        const cover = document.getElementById("campaignCover").value.trim(); 

        try {
            // 1. Insere na tabela 'campaigns'
            const { data: newCampaign, error: campError } = await supabase
                .from('campaigns')
                .insert([{ name: name, description: desc, cover_url: cover }])
                .select()
                .single();

            if (campError) {
                logSupabaseError('js/campanhas.js', 'Submit', 'campaigns', 'INSERT', campError);
                throw campError;
            }

            // 2. Associa imediatamente o criador como 'master'
            const { error: memberError } = await supabase
                .from('campaign_members')
                .insert([{ campaign_id: newCampaign.id, user_id: currentUser.id, role: 'master' }]);

            if (memberError) {
                logSupabaseError('js/campanhas.js', 'Submit', 'campaign_members', 'INSERT', memberError);
                throw memberError;
            }

            showMessage("Mesa fundada com sucesso!");
            createCampaignForm.reset();
            if (createCampaignModal) createCampaignModal.classList.remove("active");
            
            await loadCampaigns();

        } catch (error) {
            showMessage(`Falha ao fundar mesa: ${error.message || 'Erro desconhecido'}. Verifique o console.`, true);
        } finally {
            if (submitCampaignBtn) {
                submitCampaignBtn.disabled = false;
                submitCampaignBtn.textContent = "Fundar Campanha";
            }
        }
    });

    // Gatilho Inicial
    loadCampaigns();
});
