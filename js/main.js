/* =========================================================
   AERIOM — MAIN.JS (Controle da Home, Auth UI e Dashboard)
   Fase 3: Dashboard Real (Integração com Supabase)
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const AERION_URL = "https://henriqux77.github.io/Aeriom/";
    const supabaseClient = window.supabaseClient;

    if (!supabaseClient) {
        console.error("❌ supabaseClient não foi encontrado.");
        return;
    }

    // Elementos da Interface
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
    // 1. FUNÇÕES DE MODAL E UI BÁSICA
    // =========================================================
    function showAuthMessage(message) {
        if (authMessage) authMessage.textContent = message;
    }

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

    // Listeners de Abertura/Fechamento
    loginButton?.addEventListener("click", () => { showLoginForm(); openAuth(); });
    createAccountButton?.addEventListener("click", () => { showRegisterForm(); openAuth(); });
    closeAuth?.addEventListener("click", closeAuthModal);
    
    authModal?.addEventListener("click", (event) => {
        if (event.target === authModal) closeAuthModal();
    });

    document.getElementById("showRegisterButton")?.addEventListener("click", showRegisterForm);
    document.getElementById("showLoginButton")?.addEventListener("click", showLoginForm);

    // =========================================================
    // 2. AUTENTICAÇÃO (LOGIN E CADASTRO)
    // =========================================================
    
    // Discord OAuth
    document.getElementById("discordLoginButton")?.addEventListener("click", async () => {
        showAuthMessage("Conectando ao Discord...");
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: AERION_URL } });
        if (error) showAuthMessage("Não foi possível entrar com o Discord.");
    });

    document.getElementById("discordRegisterButton")?.addEventListener("click", async () => {
        showAuthMessage("Conectando ao Discord...");
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: AERION_URL } });
        if (error) showAuthMessage("Não foi possível criar a conta com o Discord.");
    });

    // Email/Senha
    document.getElementById("emailLoginButton")?.addEventListener("click", async () => {
        const email = document.getElementById("loginEmail")?.value.trim();
        const password = document.getElementById("loginPassword")?.value;

        if (!email || !password) return showAuthMessage("Preencha o e-mail e a senha.");
        showAuthMessage("Entrando...");
        
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) return showAuthMessage(error.message || "E-mail ou senha incorretos.");
        
        closeAuthModal();
    });

    document.getElementById("registerButton")?.addEventListener("click", async () => {
        const email = document.getElementById("registerEmail")?.value.trim();
        const password = document.getElementById("registerPassword")?.value;
        const confirmPassword = document.getElementById("registerPasswordConfirm")?.value;

        if (!email || !password || !confirmPassword) return showAuthMessage("Preencha todos os campos.");
        if (password !== confirmPassword) return showAuthMessage("As senhas não são iguais.");
        if (password.length < 6) return showAuthMessage("A senha precisa ter pelo menos 6 caracteres.");

        showAuthMessage("Criando sua conta...");
        const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: AERION_URL } });
        
        if (error) return showAuthMessage(error.message);
        if (data.session) {
            closeAuthModal();
        } else {
            showAuthMessage("Conta criada! Verifique seu e-mail para confirmar.");
        }
    });

    // =========================================================
    // 3. PERFIL DO USUÁRIO
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
            showAuthMessage("Você precisa entrar em uma conta primeiro.");
            openAuth();
            return;
        }

        const profile = await loadUserProfile(session.user);
        if (!profile) return;
        
        document.getElementById("profileName").textContent = profile.name;
        document.getElementById("profileEmail").textContent = profile.email;
        
        const avatarImg = document.getElementById("profileAvatar");
        const fallback = avatarImg.previousElementSibling;
        
        if (profile.avatar) {
            avatarImg.src = profile.avatar;
            avatarImg.style.display = "block";
            fallback.style.display = "none";
        } else {
            avatarImg.removeAttribute("src");
            avatarImg.style.display = "none";
            fallback.style.display = "grid";
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
    // 4. INTEGRAÇÃO DO DASHBOARD (HOME)
    // =========================================================
    const loggedOutActions = document.getElementById("loggedOutActions");
    const loggedInActions = document.getElementById("loggedInActions");

    async function loadDashboardData(user) {
        // 4.1 Saudação Personalizada
        const profile = await loadUserProfile(user);
        const welcomeText = document.getElementById("welcomeUserText");
        if (welcomeText && profile) {
            welcomeText.textContent = `Saudações, ${profile.name.split(' ')[0]}.`;
        }

        // 4.2 Localizar o container da "Sessão Recente" via querySelector (2º div dentro do loggedInActions)
        const recentCard = document.querySelector('#loggedInActions > div:nth-child(2)');
        if (!recentCard) return;

        try {
            // Busca a última mesa do usuário
            const { data: memberships, error } = await supabaseClient
                .from('campaign_members')
                .select('campaign_id, role, campaigns(id, name, cover_url)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (memberships && memberships.length > 0) {
                const camp = memberships[0].campaigns;
                const role = memberships[0].role === 'master' ? 'Mestre da Mesa' : 'Aventureiro';
                const initial = camp.name.charAt(0).toUpperCase();
                
                const bgStyle = camp.cover_url ? `background-image: url('${camp.cover_url}'); background-size: cover; background-position: center; border: none;` : `border: 2px solid var(--theme-primary-soft);`;

                recentCard.innerHTML = `
                    <div style="width: 64px; height: 64px; border-radius: 50%; background-color: var(--theme-surface-interactive); display: grid; place-items: center; font-size: 1.5rem; font-family: var(--font-heading); color: var(--theme-primary); ${bgStyle}">
                        ${camp.cover_url ? '' : initial}
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <p style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; margin-bottom: 4px;">Sua Última Aventura</p>
                        <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary); font-family: var(--font-heading);">${camp.name}</h3>
                        <div style="display: flex; gap: 8px;">
                            <span style="background: var(--theme-surface-elevated); color: var(--text-secondary); border: 1px solid var(--theme-border); display: inline-flex; align-items: center; gap: 8px; font-size: 0.8rem; padding: 4px 10px; border-radius: 20px;">
                                ${role === 'master' ? '👑' : '⚔️'} ${role}
                            </span>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="localStorage.setItem('aeriom_active_campaign', '${camp.id}'); window.location.href='campanha.html'" style="white-space: nowrap;">Continuar Aventura</button>
                `;
            } else {
                // Estado Vazio: O usuário ainda não tem campanhas
                recentCard.innerHTML = `
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--theme-surface-interactive); border: 2px dashed var(--theme-border-strong); display: grid; place-items: center; font-size: 1.5rem; color: var(--text-muted);">🏕️</div>
                    <div style="flex: 1; min-width: 200px;">
                        <p style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; margin-bottom: 4px;">O Início da Jornada</p>
                        <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary); font-family: var(--font-heading);">Nenhuma Mesa Ativa</h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">Você ainda não faz parte de nenhuma campanha.</p>
                    </div>
                    <button class="btn btn-primary" onclick="window.location.href='campanhas.html'" style="white-space: nowrap;">Encontrar uma Mesa</button>
                `;
            }
        } catch (err) {
            console.error("Erro ao carregar dashboard:", err);
        }
    }

    function updateHomeActions(session) {
        if (!loggedOutActions || !loggedInActions) return;
        if (session) {
            loggedOutActions.style.display = "none";
            loggedInActions.style.display = "block";
            loadDashboardData(session.user);
        } else {
            loggedOutActions.style.display = "block";
            loggedInActions.style.display = "none";
        }
    }

    supabaseClient.auth.onAuthStateChange((event, session) => updateHomeActions(session));

    // Carregamento Inicial
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        updateHomeActions(session);
    } catch (error) {
        updateHomeActions(null);
    }

});
