/* =========================================================
   AERIOM — MAIN.JS (Controle da Home, Auth UI e Dashboard)
   Fase 2: Correção de Integração, Erro 42703 e Anti-XSS
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const AERION_URL = "https://henriqux77.github.io/Aeriom/";
    const supabaseClient = window.supabaseClient;

    if (!supabaseClient) {
        console.error("❌ supabaseClient não foi encontrado.");
        return;
    }

    // Elementos da Interface (Auth & Modals)
    const loginButton = document.getElementById("loginButton");
    const createAccountButton = document.getElementById("createAccountButton");
    const profileButton = document.getElementById("profileButton");

    const authModal = document.getElementById("authModal");
    const closeAuth = document.getElementById("closeAuth");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const authMessage = document.getElementById("authMessage");

    const profilePanel = document.getElementById("profilePanel");
    const closeProfile = document.getElementById("closeProfile");
    const logoutButton = document.getElementById("logoutButton");

    // =========================================================
    // 1. UTILITÁRIOS SEGUROS
    // =========================================================
    function createSafeElement(tag, className, text = null) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== null && text !== undefined) el.textContent = text;
        return el;
    }

    function showAuthMessage(message, isError = false) {
        if (!authMessage) return;
        if (!message) {
            authMessage.classList.remove('active');
            return;
        }
        authMessage.textContent = message;
        authMessage.className = `msg-box mb-4 ${isError ? 'msg-error' : 'msg-success'} active`;
    }

    // =========================================================
    // 2. CONTROLE DE MODAIS (LOGIN/REGISTER)
    // =========================================================
    function openAuth() {
        if (authModal) authModal.classList.add("active");
    }

    function closeAuthModal() {
        if (authModal) authModal.classList.remove("active");
        showAuthMessage("");
    }

    function showLoginForm() {
        if (loginForm) loginForm.style.display = "block";
        if (registerForm) registerForm.style.display = "none";
        showAuthMessage("");
    }

    function showRegisterForm() {
        if (loginForm) loginForm.style.display = "none";
        if (registerForm) registerForm.style.display = "block";
        showAuthMessage("");
    }

    loginButton?.addEventListener("click", () => { showLoginForm(); openAuth(); });
    createAccountButton?.addEventListener("click", () => { showRegisterForm(); openAuth(); });
    closeAuth?.addEventListener("click", closeAuthModal);
    
    // Fechar ao clicar fora do modal
    authModal?.addEventListener("click", (event) => {
        if (event.target === authModal) closeAuthModal();
    });

    document.getElementById("showRegisterButton")?.addEventListener("click", showRegisterForm);
    document.getElementById("showLoginButton")?.addEventListener("click", showLoginForm);

    // =========================================================
    // 3. AUTENTICAÇÃO
    // =========================================================
    const discordLoginAction = async () => {
        showAuthMessage("Conectando ao Discord...");
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: AERION_URL } });
        if (error) showAuthMessage("Não foi possível conectar com o Discord.", true);
    };

    document.getElementById("discordLoginButton")?.addEventListener("click", discordLoginAction);
    document.getElementById("discordRegisterButton")?.addEventListener("click", discordLoginAction);

    document.getElementById("emailLoginButton")?.addEventListener("click", async () => {
        const email = document.getElementById("loginEmail")?.value.trim();
        const password = document.getElementById("loginPassword")?.value;

        if (!email || !password) return showAuthMessage("Preencha o e-mail e a senha.", true);
        showAuthMessage("Autenticando...");
        
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) return showAuthMessage(error.message || "Credenciais inválidas.", true);
        
        closeAuthModal();
    });

    document.getElementById("registerButton")?.addEventListener("click", async () => {
        const email = document.getElementById("registerEmail")?.value.trim();
        const password = document.getElementById("registerPassword")?.value;
        const confirmPassword = document.getElementById("registerPasswordConfirm")?.value;

        if (!email || !password || !confirmPassword) return showAuthMessage("Preencha todos os campos.", true);
        if (password !== confirmPassword) return showAuthMessage("As senhas não coincidem.", true);
        if (password.length < 6) return showAuthMessage("A senha requer pelo menos 6 caracteres.", true);

        showAuthMessage("Forjando conta...");
        const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: AERION_URL } });
        
        if (error) return showAuthMessage(error.message, true);
        if (data.session) {
            closeAuthModal();
        } else {
            showAuthMessage("Conta criada! Verifique o seu e-mail.");
        }
    });

    // =========================================================
    // 4. PERFIL DO USUÁRIO
    // =========================================================
    async function loadUserProfile(user) {
        if (!user) return null;
        try {
            const { data: profile } = await supabaseClient.from("profiles").select("*").eq("id", user.id).maybeSingle();
            const name = profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || "Aventureiro";
            const avatar = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
            return { name, email: user.email || "", avatar };
        } catch (error) {
            return { name: user.user_metadata?.name || "Aventureiro", email: user.email || "", avatar: "" };
        }
    }

    profileButton?.addEventListener("click", async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            showLoginForm();
            showAuthMessage("Necessita estar autenticado primeiro.", true);
            openAuth();
            return;
        }

        const profile = await loadUserProfile(session.user);
        if (!profile) return;
        
        document.getElementById("profileName").textContent = profile.name;
        document.getElementById("profileEmail").textContent = profile.email;
        
        const avatarImg = document.getElementById("profileAvatar");
        const fallback = document.getElementById("profileFallback");
        
        if (profile.avatar) {
            avatarImg.src = profile.avatar;
            avatarImg.style.display = "block";
            fallback.style.display = "none";
        } else {
            avatarImg.src = "";
            avatarImg.style.display = "none";
            fallback.style.display = "block";
            fallback.textContent = profile.name.charAt(0).toUpperCase();
        }
        
        profilePanel?.classList.add("active");
    });

    closeProfile?.addEventListener("click", () => profilePanel?.classList.remove("active"));
    profilePanel?.addEventListener("click", (e) => { if (e.target === profilePanel) profilePanel.classList.remove("active"); });
    logoutButton?.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        profilePanel?.classList.remove("active");
    });

    // =========================================================
    // 5. DASHBOARD: SESSÃO RECENTE E AÇÕES LOGADAS
    // =========================================================
    const loggedOutActions = document.getElementById("loggedOutActions");
    const loggedInActions = document.getElementById("loggedInActions");
    const recentCampaignContainer = document.getElementById("recentCampaignContainer");

        async function loadDashboardData(user) {
        // ... (código anterior até a criação do card) ...

            if (memberships && memberships.length > 0 && memberships[0].campaigns) {
                const camp = memberships[0].campaigns;
                const roleText = memberships[0].role === 'master' ? '👑 Mestre' : '⚔️ Aventureiro';
                
                const card = document.createElement('div');
                card.className = "recent-campaign-card"; // Usa a nova classe CSS
                
                const avatar = document.createElement("div");
                avatar.style.width = "64px";
                avatar.style.height = "64px";
                avatar.style.borderRadius = "50%";
                avatar.style.flexShrink = "0";
                avatar.style.border = "2px solid var(--color-border-strong)";
                avatar.style.backgroundColor = "var(--color-bg-secondary)";
                avatar.style.display = "grid";
                avatar.style.placeItems = "center";
                avatar.style.overflow = "hidden";
                
                if (camp.cover_url) {
                    avatar.style.backgroundImage = `url('${camp.cover_url}')`;
                    avatar.style.backgroundSize = "cover";
                    avatar.style.backgroundPosition = "center";
                } else {
                    const initial = createSafeElement("span", "", camp.name.charAt(0).toUpperCase());
                    initial.style.fontFamily = "var(--font-heading)";
                    initial.style.fontSize = "1.5rem";
                    initial.style.color = "var(--color-primary)";
                    avatar.appendChild(initial);
                }

                const infoContainer = document.createElement("div");
                infoContainer.className = "recent-campaign-info"; // Usa a nova classe CSS

                const label = createSafeElement("p", "text-muted", "SUA ÚLTIMA AVENTURA");
                label.style.fontSize = "0.75rem";
                label.style.fontWeight = "600";
                label.style.letterSpacing = "0.05em";

                const title = createSafeElement("h3", "", camp.name);
                title.style.color = "var(--color-text)";

                // Correção do Crachá (Badge)
                const badge = createSafeElement("span", "", roleText);
                badge.style.fontSize = "0.75rem";
                badge.style.padding = "4px 8px";
                badge.style.borderRadius = "var(--radius-sm)";
                badge.style.fontWeight = "600";
                badge.style.display = "inline-block";
                badge.style.width = "fit-content"; // Impede que ocule a linha toda
                
                if (memberships[0].role === 'master') {
                    badge.style.background = "rgba(217, 119, 6, 0.2)"; // Fundo translúcido do accent
                    badge.style.color = "var(--color-accent)";
                    badge.style.border = "1px solid var(--color-accent)";
                } else {
                    badge.style.background = "var(--color-surface-hover)";
                    badge.style.color = "var(--color-primary)";
                    badge.style.border = "1px solid var(--color-border)";
                }

                infoContainer.appendChild(label);
                infoContainer.appendChild(title);
                infoContainer.appendChild(badge);

                const actionContainer = document.createElement("div");
                actionContainer.className = "recent-campaign-action"; // Usa a nova classe CSS
                const btn = createSafeElement("button", "btn btn-primary", "Continuar");
                actionContainer.appendChild(btn);
                
                card.appendChild(avatar);
                card.appendChild(infoContainer);
                card.appendChild(actionContainer);

                card.addEventListener("click", () => {
                    localStorage.setItem('aeriom_active_campaign', camp.id);
                    window.location.href = 'campanha.html';
                });

                recentCampaignContainer.appendChild(card);
            }
// ...
