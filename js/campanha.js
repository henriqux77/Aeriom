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

            // Gera código alfanumérico de 8 dígitos
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

    init();
});
