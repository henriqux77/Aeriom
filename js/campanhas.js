/* =========================================================
   AERIOM — GERENCIADOR DE CAMPANHAS (js/campanhas.js)
   Correção de Integração: Remoção do sort por created_at inexistente
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("❌ Supabase não inicializado.");
        return;
    }

    let currentUser = null;

    // Elementos de Estado da Interface
    const loadingCampaigns = document.getElementById("loadingCampaigns");
    const emptyCampaigns = document.getElementById("emptyCampaigns");
    const campaignsList = document.getElementById("campaignsList");
    const campaignsMessage = document.getElementById("campaignsMessage");

    // Elementos de Criação
    const createCampaignBtn = document.getElementById("createCampaignBtn");
    const createCampaignModal = document.getElementById("createCampaignModal");
    const closeCreateModal = document.getElementById("closeCreateModal");
    const createCampaignForm = document.getElementById("createCampaignForm");
    const submitCampaignBtn = document.getElementById("submitCampaignBtn");

    // =========================================================
    // 1. UTILITÁRIOS DE FEEDBACK E ESTADO
    // =========================================================
    function showMessage(msg, isError = false) {
        if (!campaignsMessage) return;
        campaignsMessage.textContent = msg;
        campaignsMessage.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'} active`;
        setTimeout(() => { campaignsMessage.classList.remove('active'); }, 4000);
    }

    function showState(state) {
        if (loadingCampaigns) loadingCampaigns.style.display = "none";
        if (emptyCampaigns) emptyCampaigns.style.display = "none";
        if (campaignsList) campaignsList.style.display = "none";

        if (state === 'loading' && loadingCampaigns) loadingCampaigns.style.display = "flex";
        if (state === 'empty' && emptyCampaigns) emptyCampaigns.style.display = "flex";
        if (state === 'list' && campaignsList) campaignsList.style.display = "grid"; 
    }

    // =========================================================
    // 2. CARREGAMENTO DE CAMPANHAS
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

            // Busca as mesas nas quais o jogador é membro (Removido o .order('created_at') para evitar o erro 42703)
            const { data: memberships, error: dbError } = await supabase
                .from('campaign_members')
                .select('role, campaigns(id, name, description, cover_url)')
                .eq('user_id', currentUser.id);

            if (dbError) throw dbError;

            if (!memberships || memberships.length === 0) {
                showState('empty');
                return;
            }

            renderCampaigns(memberships);
            showState('list');

        } catch (error) {
            console.error("Erro ao consultar campanhas:", error);
            showState('empty'); 
            showMessage("Erro de comunicação com os servidores. Tente atualizar a página.", true);
        }
    }

    // =========================================================
    // 3. RENDERIZAÇÃO SEGURA (Anti-XSS e Design System)
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
                initial.textContent = camp.name ? camp.name.charAt(0).toUpperCase() : "A";
                initial.style.fontSize = "3rem";
                initial.style.fontFamily = "var(--font-heading)";
                initial.style.color = "var(--color-primary-muted)";
                cover.appendChild(initial);
            }

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

            content.appendChild(title);
            content.appendChild(desc);
            content.appendChild(roleBadge);

            card.appendChild(cover);
            card.appendChild(content);

            card.addEventListener("click", () => {
                localStorage.setItem("aeriom_active_campaign", camp.id);
                window.location.href = "campanha.html";
            });

            campaignsList.appendChild(card);
        });
    }

    // =========================================================
    // 4. CRIAÇÃO DE NOVA CAMPANHA
    // =========================================================
    createCampaignBtn?.addEventListener("click", () => {
        if (createCampaignModal) createCampaignModal.classList.add("active");
    });

    closeCreateModal?.addEventListener("click", () => {
        if (createCampaignModal) createCampaignModal.classList.remove("active");
    });

    createCampaignForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (!currentUser) return showMessage("Precisa estar logado para criar uma campanha.", true);

        if (submitCampaignBtn) {
            submitCampaignBtn.disabled = true;
            submitCampaignBtn.textContent = "A Fundar Mesa...";
        }

        const name = document.getElementById("campaignName").value.trim();
        const desc = document.getElementById("campaignDesc").value.trim();
        const cover = document.getElementById("campaignCover").value.trim(); 

        try {
            const { data: newCampaign, error: campError } = await supabase
                .from('campaigns')
                .insert([{ name: name, description: desc, cover_url: cover }])
                .select()
                .single();

            if (campError) throw campError;

            const { error: memberError } = await supabase
                .from('campaign_members')
                .insert([{ campaign_id: newCampaign.id, user_id: currentUser.id, role: 'master' }]);

            if (memberError) throw memberError;

            showMessage("Mesa fundada com sucesso!");
            createCampaignForm.reset();
            if (createCampaignModal) createCampaignModal.classList.remove("active");
            
            await loadCampaigns();

        } catch (error) {
            console.error("Erro ao fundar campanha:", error);
            showMessage("Uma falha impediu a fundação da mesa.", true);
        } finally {
            if (submitCampaignBtn) {
                submitCampaignBtn.disabled = false;
                submitCampaignBtn.textContent = "Fundar Campanha";
            }
        }
    });

    loadCampaigns();
});
