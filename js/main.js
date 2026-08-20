document.addEventListener("DOMContentLoaded", async () => {

    const AERION_URL = "https://henriqux77.github.io/Aeriom/";
    const supabaseClient = window.supabaseClient;

    if (!supabaseClient) {
        console.error("❌ supabaseClient não foi encontrado.");
        return;
    }

    const menuButton = document.getElementById("menuButton");
    const profileButton = document.getElementById("profileButton");
    const createAccountButton = document.getElementById("createAccountButton");
    const loginButton = document.getElementById("loginButton");

    const profilePanel = document.getElementById("profilePanel");
    const closeProfile = document.getElementById("closeProfile");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileAvatar = document.getElementById("profileAvatar");
    const logoutButton = document.getElementById("logoutButton");
    const editProfileButton = document.getElementById("editProfileButton");

    const authModal = document.getElementById("authModal");
    const closeAuth = document.getElementById("closeAuth");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const discordLoginButton = document.getElementById("discordLoginButton");
    const discordRegisterButton = document.getElementById("discordRegisterButton");
    const emailLoginButton = document.getElementById("emailLoginButton");
    const registerButton = document.getElementById("registerButton");
    const showRegisterButton = document.getElementById("showRegisterButton");
    const showLoginButton = document.getElementById("showLoginButton");
    const authMessage = document.getElementById("authMessage");

    if (profilePanel) profilePanel.style.display = "none";
    if (authModal) authModal.style.display = "none";

    function showAuthMessage(message) {
        if (authMessage) authMessage.textContent = message;
    }

    function openAuth() {
        if (authModal) authModal.style.display = "flex";
    }

    function closeAuthModal() {
        if (authModal) authModal.style.display = "none";
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

    if (loginButton) {
        loginButton.addEventListener("click", () => {
            showLoginForm();
            openAuth();
        });
    }

    if (createAccountButton) {
        createAccountButton.addEventListener("click", () => {
            showRegisterForm();
            openAuth();
        });
    }

    if (closeAuth) {
        closeAuth.addEventListener("click", closeAuthModal);
    }

    if (authModal) {
        authModal.addEventListener("click", (event) => {
            if (event.target === authModal) closeAuthModal();
        });
    }

    if (showRegisterButton) {
        showRegisterButton.addEventListener("click", showRegisterForm);
    }

    if (showLoginButton) {
        showLoginButton.addEventListener("click", showLoginForm);
    }

    // DISCORD LOGIN/REGISTER (Omitidos para encurtar a visualização, MAS NO ARQUIVO COMPLETO DEVEM SER MANTIDOS IGUAIS AO ORIGINAL. Para facilitar sua cópia direta e não quebrar a regra de arquivo completo, eis a versão sem cortes:)
    
    if (discordLoginButton) {
        discordLoginButton.addEventListener("click", async () => {
            showAuthMessage("Conectando ao Discord...");
            try {
                const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: AERION_URL } });
                if (error) showAuthMessage("Não foi possível entrar com o Discord.");
            } catch (error) {
                showAuthMessage("Ocorreu um erro ao conectar ao Discord.");
            }
        });
    }

    if (discordRegisterButton) {
        discordRegisterButton.addEventListener("click", async () => {
            showAuthMessage("Conectando ao Discord...");
            try {
                const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: AERION_URL } });
                if (error) showAuthMessage("Não foi possível criar a conta com o Discord.");
            } catch (error) {
                showAuthMessage("Ocorreu um erro ao conectar ao Discord.");
            }
        });
    }

    if (emailLoginButton) {
        emailLoginButton.addEventListener("click", async () => {
            const emailInput = document.getElementById("loginEmail");
            const passwordInput = document.getElementById("loginPassword");
            const email = emailInput ? emailInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";

            if (!email || !password) return showAuthMessage("Preencha o e-mail e a senha.");
            showAuthMessage("Entrando...");
            try {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) return showAuthMessage(error.message || "E-mail ou senha incorretos.");
                showAuthMessage("Login realizado com sucesso!");
                closeAuthModal();
            } catch (error) {
                showAuthMessage("Ocorreu um erro ao entrar.");
            }
        });
    }

    if (registerButton) {
        registerButton.addEventListener("click", async () => {
            const emailInput = document.getElementById("registerEmail");
            const passwordInput = document.getElementById("registerPassword");
            const confirmPasswordInput = document.getElementById("registerPasswordConfirm");
            const email = emailInput ? emailInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";

            if (!email || !password || !confirmPassword) return showAuthMessage("Preencha todos os campos.");
            if (password !== confirmPassword) return showAuthMessage("As senhas não são iguais.");
            if (password.length < 6) return showAuthMessage("A senha precisa ter pelo menos 6 caracteres.");

            showAuthMessage("Criando sua conta...");
            try {
                const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: AERION_URL } });
                if (error) return showAuthMessage(error.message);
                if (data.session) {
                    showAuthMessage("Conta criada com sucesso!");
                    closeAuthModal();
                } else {
                    showAuthMessage("Conta criada! Verifique seu e-mail para confirmar a conta.");
                }
            } catch (error) {
                showAuthMessage("Ocorreu um erro ao criar sua conta.");
            }
        });
    }

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

    if (profileButton) {
        profileButton.addEventListener("click", async () => {
            try {
                const { data: { session }, error } = await supabaseClient.auth.getSession();
                if (error || !session) {
                    showLoginForm();
                    showAuthMessage("Você precisa entrar em uma conta primeiro.");
                    openAuth();
                    return;
                }
                const profile = await loadUserProfile(session.user);
                if (!profile) return;
                if (profileName) profileName.textContent = profile.name;
                if (profileEmail) profileEmail.textContent = profile.email;
                if (profileAvatar) {
                    if (profile.avatar) {
                        profileAvatar.src = profile.avatar;
                        profileAvatar.style.display = "block";
                    } else {
                        profileAvatar.removeAttribute("src");
                        profileAvatar.style.display = "none";
                    }
                }
                if (profilePanel) profilePanel.style.display = "flex";
            } catch (error) {
                console.error("Erro ao abrir perfil:", error);
            }
        });
    }

    if (closeProfile) {
        closeProfile.addEventListener("click", () => {
            if (profilePanel) profilePanel.style.display = "none";
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                await supabaseClient.auth.signOut();
                if (profilePanel) profilePanel.style.display = "none";
            } catch (error) {
                console.error("Erro ao sair:", error);
            }
        });
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        updateHomeActions(session);
    });

    const loggedOutActions = document.getElementById("loggedOutActions");
    const loggedInActions = document.getElementById("loggedInActions");
    const createCharacterButton = document.getElementById("createCharacterButton");
    const campaignButton = document.getElementById("campaignButton");

    function updateHomeActions(session) {
        if (!loggedOutActions || !loggedInActions) return;
        if (session) {
            loggedOutActions.style.display = "none";
            loggedInActions.style.display = "flex";
        } else {
            loggedOutActions.style.display = "flex";
            loggedInActions.style.display = "none";
        }
    }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        updateHomeActions(session);
    } catch (error) {
        updateHomeActions(null);
    }

    if (createCharacterButton) {
        createCharacterButton.addEventListener("click", () => {
            localStorage.removeItem("aerion_character_id");
            localStorage.removeItem("aerion_character_draft");
            window.location.href = "ficha.html";
        });
    }

    // A ÚNICA ALTERAÇÃO REAL DAQUI:
    if (campaignButton) {
        campaignButton.addEventListener("click", () => {
            console.log("⚔ Redirecionando para as Campanhas...");
            window.location.href = "campanhas.html";
        });
    }

});
