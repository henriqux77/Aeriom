document.addEventListener("DOMContentLoaded", async () => {

    // =====================================================
    // CONFIGURAÇÃO DO AERION
    // =====================================================

    const AERION_URL =
        "https://henriqux77.github.io/Aeriom/";


    // =====================================================
    // VERIFICAR SUPABASE
    // =====================================================

    const supabaseClient = window.supabaseClient;

    if (!supabaseClient) {

        console.error(
            "❌ supabaseClient não foi encontrado."
        );

        console.error(
            "Verifique se o supabase.js está sendo carregado antes do main.js."
        );

        return;
    }

    console.log(
        "✅ Supabase carregado corretamente."
    );


    // =====================================================
    // BOTÕES DA HOME
    // =====================================================

    const menuButton =
        document.getElementById("menuButton");

    const profileButton =
        document.getElementById("profileButton");

    const createAccountButton =
        document.getElementById("createAccountButton");

    const loginButton =
        document.getElementById("loginButton");


    // =====================================================
    // ELEMENTOS DO PERFIL
    // =====================================================

    const profilePanel =
        document.getElementById("profilePanel");

    const closeProfile =
        document.getElementById("closeProfile");

    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    const profileAvatar =
        document.getElementById("profileAvatar");

    const logoutButton =
        document.getElementById("logoutButton");

    const editProfileButton =
        document.getElementById("editProfileButton");


    // =====================================================
    // ELEMENTOS DE AUTENTICAÇÃO
    // =====================================================

    const authModal =
        document.getElementById("authModal");

    const closeAuth =
        document.getElementById("closeAuth");

    const loginForm =
        document.getElementById("loginForm");

    const registerForm =
        document.getElementById("registerForm");

    const discordLoginButton =
        document.getElementById("discordLoginButton");

    const discordRegisterButton =
        document.getElementById("discordRegisterButton");

    const emailLoginButton =
        document.getElementById("emailLoginButton");

    const registerButton =
        document.getElementById("registerButton");

    const showRegisterButton =
        document.getElementById("showRegisterButton");

    const showLoginButton =
        document.getElementById("showLoginButton");

    const authMessage =
        document.getElementById("authMessage");


    // =====================================================
    // ESCONDER ELEMENTOS AO CARREGAR
    // =====================================================

    if (profilePanel) {
        profilePanel.style.display = "none";
    }

    if (authModal) {
        authModal.style.display = "none";
    }


    // =====================================================
    // FUNÇÃO DE MENSAGEM
    // =====================================================

    function showAuthMessage(message) {

        if (authMessage) {
            authMessage.textContent = message;
        }

    }


    // =====================================================
    // ABRIR MODAL
    // =====================================================

    function openAuth() {

        if (!authModal) {

            console.error(
                "❌ #authModal não foi encontrado no HTML."
            );

            return;
        }

        authModal.style.display = "flex";

        console.log(
            "✅ Modal de autenticação aberto."
        );

    }


    // =====================================================
    // FECHAR MODAL
    // =====================================================

    function closeAuthModal() {

        if (authModal) {
            authModal.style.display = "none";
        }

    }


    // =====================================================
    // MOSTRAR LOGIN
    // =====================================================

    function showLoginForm() {

        if (loginForm) {
            loginForm.style.display = "block";
        }

        if (registerForm) {
            registerForm.style.display = "none";
        }

        showAuthMessage("");

    }


    // =====================================================
    // MOSTRAR CADASTRO
    // =====================================================

    function showRegisterForm() {

        if (loginForm) {
            loginForm.style.display = "none";
        }

        if (registerForm) {
            registerForm.style.display = "block";
        }

        showAuthMessage("");

    }


    // =====================================================
    // RECUPERAR SESSÃO
    // =====================================================

    try {

        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "❌ Erro ao recuperar sessão:",
                error
            );

        } else if (session) {

            console.log(
                "✅ Sessão recuperada:",
                session.user.email
            );

        } else {

            console.log(
                "ℹ️ Nenhuma sessão encontrada."
            );

        }

    } catch (error) {

        console.error(
            "❌ Erro inesperado ao recuperar sessão:",
            error
        );

    }


    // =====================================================
    // BOTÃO ENTRAR DA HOME
    // =====================================================

    if (loginButton) {

        loginButton.addEventListener(
            "click",
            () => {

                console.log(
                    "🔵 Botão Entrar clicado."
                );

                showLoginForm();

                openAuth();

            }
        );

    } else {

        console.warn(
            "⚠️ #loginButton não encontrado."
        );

    }


    // =====================================================
    // BOTÃO CRIAR CONTA DA HOME
    // =====================================================

    if (createAccountButton) {

        createAccountButton.addEventListener(
            "click",
            () => {

                console.log(
                    "🟢 Botão Criar Conta clicado."
                );

                showRegisterForm();

                openAuth();

            }
        );

    } else {

        console.warn(
            "⚠️ #createAccountButton não encontrado."
        );

    }


    // =====================================================
    // FECHAR AUTENTICAÇÃO
    // =====================================================

    if (closeAuth) {

        closeAuth.addEventListener(
            "click",
            () => {

                console.log(
                    "Fechando autenticação."
                );

                closeAuthModal();

            }
        );

    }


    // =====================================================
    // CLICAR FORA DO MODAL
    // =====================================================

    if (authModal) {

        authModal.addEventListener(
            "click",
            (event) => {

                if (event.target === authModal) {

                    closeAuthModal();

                }

            }
        );

    }


    // =====================================================
    // IR PARA CADASTRO
    // =====================================================

    if (showRegisterButton) {

        showRegisterButton.addEventListener(
            "click",
            () => {

                showRegisterForm();

            }
        );

    }


    // =====================================================
    // VOLTAR PARA LOGIN
    // =====================================================

    if (showLoginButton) {

        showLoginButton.addEventListener(
            "click",
            () => {

                showLoginForm();

            }
        );

    }


    // =====================================================
    // DISCORD — LOGIN
    // =====================================================

    if (discordLoginButton) {

        discordLoginButton.addEventListener(
            "click",
            async () => {

                console.log(
                    "🔵 Iniciando login com Discord..."
                );

                showAuthMessage(
                    "Conectando ao Discord..."
                );


                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient.auth
                            .signInWithOAuth({

                                provider: "discord",

                                options: {

                                    redirectTo:
                                        AERION_URL

                                }

                            });


                    if (error) {

                        console.error(
                            "❌ Erro no login Discord:",
                            error
                        );

                        showAuthMessage(
                            "Não foi possível entrar com o Discord."
                        );

                        return;
                    }


                    console.log(
                        "✅ OAuth Discord iniciado:",
                        data
                    );

                } catch (error) {

                    console.error(
                        "❌ Erro inesperado no Discord:",
                        error
                    );

                    showAuthMessage(
                        "Ocorreu um erro ao conectar ao Discord."
                    );

                }

            }
        );

    }


    // =====================================================
    // DISCORD — CADASTRO
    // =====================================================

    if (discordRegisterButton) {

        discordRegisterButton.addEventListener(
            "click",
            async () => {

                console.log(
                    "🟢 Iniciando cadastro com Discord..."
                );

                showAuthMessage(
                    "Conectando ao Discord..."
                );


                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient.auth
                            .signInWithOAuth({

                                provider: "discord",

                                options: {

                                    redirectTo:
                                        AERION_URL

                                }

                            });


                    if (error) {

                        console.error(
                            "❌ Erro no cadastro Discord:",
                            error
                        );

                        showAuthMessage(
                            "Não foi possível criar a conta com o Discord."
                        );

                        return;
                    }


                    console.log(
                        "✅ OAuth Discord iniciado:",
                        data
                    );

                } catch (error) {

                    console.error(
                        "❌ Erro inesperado no Discord:",
                        error
                    );

                    showAuthMessage(
                        "Ocorreu um erro ao conectar ao Discord."
                    );

                }

            }
        );

    }


    // =====================================================
    // LOGIN COM E-MAIL E SENHA
    // =====================================================

    if (emailLoginButton) {

        emailLoginButton.addEventListener(
            "click",
            async () => {

                const emailInput =
                    document.getElementById(
                        "loginEmail"
                    );

                const passwordInput =
                    document.getElementById(
                        "loginPassword"
                    );


                const email =
                    emailInput
                        ? emailInput.value.trim()
                        : "";

                const password =
                    passwordInput
                        ? passwordInput.value
                        : "";


                if (!email || !password) {

                    showAuthMessage(
                        "Preencha o e-mail e a senha."
                    );

                    return;

                }


                showAuthMessage(
                    "Entrando..."
                );


                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient.auth
                            .signInWithPassword({

                                email:
                                    email,

                                password:
                                    password

                            });


                    if (error) {

                        console.error(
                            "❌ Erro no login:",
                            error
                        );

                        showAuthMessage(
                            error.message ||
                            "E-mail ou senha incorretos."
                        );

                        return;

                    }


                    console.log(
                        "✅ Login realizado:",
                        data.user?.email
                    );


                    showAuthMessage(
                        "Login realizado com sucesso!"
                    );


                    closeAuthModal();


                } catch (error) {

                    console.error(
                        "❌ Erro inesperado no login:",
                        error
                    );

                    showAuthMessage(
                        "Ocorreu um erro ao entrar."
                    );

                }

            }
        );

    }


    // =====================================================
    // CRIAR CONTA COM E-MAIL E SENHA
    // =====================================================

    if (registerButton) {

        registerButton.addEventListener(
            "click",
            async () => {

                const emailInput =
                    document.getElementById(
                        "registerEmail"
                    );

                const passwordInput =
                    document.getElementById(
                        "registerPassword"
                    );

                const confirmPasswordInput =
                    document.getElementById(
                        "registerPasswordConfirm"
                    );


                const email =
                    emailInput
                        ? emailInput.value.trim()
                        : "";

                const password =
                    passwordInput
                        ? passwordInput.value
                        : "";

                const confirmPassword =
                    confirmPasswordInput
                        ? confirmPasswordInput.value
                        : "";


                // -----------------------------
                // VALIDAR CAMPOS
                // -----------------------------

                if (
                    !email ||
                    !password ||
                    !confirmPassword
                ) {

                    showAuthMessage(
                        "Preencha todos os campos."
                    );

                    return;

                }


                // -----------------------------
                // CONFIRMAR SENHA
                // -----------------------------

                if (
                    password !==
                    confirmPassword
                ) {

                    showAuthMessage(
                        "As senhas não são iguais."
                    );

                    return;

                }


                // -----------------------------
                // TAMANHO DA SENHA
                // -----------------------------

                if (password.length < 6) {

                    showAuthMessage(
                        "A senha precisa ter pelo menos 6 caracteres."
                    );

                    return;

                }


                showAuthMessage(
                    "Criando sua conta..."
                );


                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient.auth
                            .signUp({

                                email:
                                    email,

                                password:
                                    password,

                                options: {

                                    emailRedirectTo:
                                        AERION_URL

                                }

                            });


                    if (error) {

                        console.error(
                            "❌ Erro ao criar conta:",
                            error
                        );

                        showAuthMessage(
                            error.message
                        );

                        return;

                    }


                    console.log(
                        "✅ Conta criada:",
                        data
                    );


                    if (data.session) {

                        showAuthMessage(
                            "Conta criada com sucesso!"
                        );

                        closeAuthModal();

                    } else {

                        showAuthMessage(
                            "Conta criada! Verifique seu e-mail para confirmar a conta."
                        );

                    }

                } catch (error) {

                    console.error(
                        "❌ Erro inesperado ao criar conta:",
                        error
                    );

                    showAuthMessage(
                        "Ocorreu um erro ao criar sua conta."
                    );

                }

            }
        );

    }


    // =====================================================
    // CARREGAR PERFIL
    // =====================================================

    async function loadUserProfile(user) {

        if (!user) {
            return null;
        }


        try {

            const {
                data: profile,
                error
            } =
                await supabaseClient
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();


            if (error) {

                console.error(
                    "❌ Erro ao buscar perfil:",
                    error
                );

            }


            const name =
                profile?.display_name ||
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.user_metadata?.global_name ||
                "Aventureiro";


            const avatar =
                profile?.avatar_url ||
                user.user_metadata?.avatar_url ||
                user.user_metadata?.picture ||
                user.user_metadata?.avatar ||
                "";


            return {

                name:
                    name,

                email:
                    user.email || "",

                avatar:
                    avatar

            };

        } catch (error) {

            console.error(
                "❌ Erro ao carregar perfil:",
                error
            );

            return {

                name:
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    "Aventureiro",

                email:
                    user.email || "",

                avatar:
                    user.user_metadata?.avatar_url ||
                    user.user_metadata?.picture ||
                    ""

            };

        }

    }


    // =====================================================
    // BOTÃO DE PERFIL
    // =====================================================

    if (profileButton) {

        profileButton.addEventListener(
            "click",
            async () => {

                console.log(
                    "👤 Botão de perfil clicado."
                );


                try {

                    const {
                        data: { session },
                        error
                    } =
                        await supabaseClient.auth
                            .getSession();


                    if (error) {

                        console.error(
                            "❌ Erro ao verificar sessão:",
                            error
                        );

                        return;

                    }


                    if (!session) {

                        console.log(
                            "ℹ️ Usuário não está logado."
                        );

                        showLoginForm();

                        showAuthMessage(
                            "Você precisa entrar em uma conta primeiro."
                        );

                        openAuth();

                        return;

                    }


                    const profile =
                        await loadUserProfile(
                            session.user
                        );


                    if (!profile) {
                        return;
                    }


                    if (profileName) {

                        profileName.textContent =
                            profile.name;

                    }


                    if (profileEmail) {

                        profileEmail.textContent =
                            profile.email;

                    }


                    if (profileAvatar) {

                        if (profile.avatar) {

                            profileAvatar.src =
                                profile.avatar;

                            profileAvatar.style.display =
                                "block";

                        } else {

                            profileAvatar
                                .removeAttribute("src");

                            profileAvatar.style.display =
                                "none";

                        }

                    }


                    if (profilePanel) {

                        profilePanel.style.display =
                            "flex";

                    }

                } catch (error) {

                    console.error(
                        "❌ Erro ao abrir perfil:",
                        error
                    );

                }

            }
        );

    }


    // =====================================================
    // FECHAR PERFIL
    // =====================================================

    if (closeProfile) {

        closeProfile.addEventListener(
            "click",
            () => {

                if (profilePanel) {

                    profilePanel.style.display =
                        "none";

                }

            }
        );

    }


    // =====================================================
    // LOGOUT
    // =====================================================

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                try {

                    const {
                        error
                    } =
                        await supabaseClient.auth
                            .signOut();


                    if (error) {

                        console.error(
                            "❌ Erro ao sair:",
                            error
                        );

                        return;

                    }


                    if (profilePanel) {

                        profilePanel.style.display =
                            "none";

                    }


                    console.log(
                        "✅ Usuário saiu da conta."
                    );

                } catch (error) {

                    console.error(
                        "❌ Erro inesperado ao sair:",
                        error
                    );

                }

            }
        );

    }


    // =====================================================
    // EDITAR PERFIL
    // =====================================================

    if (editProfileButton) {

        editProfileButton.addEventListener(
            "click",
            () => {

                console.log(
                    "Editar perfil será implementado em breve."
                );

            }
        );

    }


    // =====================================================
    // MENU
    // =====================================================

    if (menuButton) {

        menuButton.addEventListener(
            "click",
            () => {

                console.log(
                    "☰ Menu do Aerion."
                );

            }
        );

    }


    // =====================================================
    // OBSERVAR ALTERAÇÕES DE AUTENTICAÇÃO
    // =====================================================

    supabaseClient.auth.onAuthStateChange(
        async (event, session) => {

            console.log(
                "🔐 Evento de autenticação:",
                event
            );


            if (session) {

                console.log(
                    "✅ Usuário autenticado:",
                    session.user.email
                );

            } else {

                console.log(
                    "ℹ️ Usuário não autenticado."
                );

            }
updateHomeActions(session);
        }
    );
// =====================================================
// AÇÕES DA HOME DE ACORDO COM O LOGIN
// =====================================================

const loggedOutActions =
    document.getElementById("loggedOutActions");

const loggedInActions =
    document.getElementById("loggedInActions");

const createCharacterButton =
    document.getElementById("createCharacterButton");

const campaignButton =
    document.getElementById("campaignButton");


// =====================================================
// ATUALIZAR BOTÕES DA HOME
// =====================================================

function updateHomeActions(session) {

    if (!loggedOutActions || !loggedInActions) {
        return;
    }


    if (session) {

        // Usuário LOGADO

        loggedOutActions.style.display = "none";
        loggedInActions.style.display = "flex";

        console.log(
            "🏠 Home atualizada para usuário logado."
        );

    } else {

        // Usuário NÃO LOGADO

        loggedOutActions.style.display = "flex";
        loggedInActions.style.display = "none";

        console.log(
            "🏠 Home atualizada para visitante."
        );

    }

}


// =====================================================
// VERIFICAR SESSÃO ATUAL
// =====================================================

try {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();


    if (error) {

        console.error(
            "❌ Erro ao verificar sessão para a Home:",
            error
        );

        updateHomeActions(null);

    } else {

        updateHomeActions(session);

    }

} catch (error) {

    console.error(
        "❌ Erro inesperado ao verificar sessão:",
        error
    );

    updateHomeActions(null);

}


// =====================================================
// CRIAR FICHA
// =====================================================

if (createCharacterButton) {

    createCharacterButton.addEventListener(
        "click",
        () => {

            console.log(
                "✦ Abrindo criação de ficha..."
            );

            window.location.href = "ficha.html";

        }
    );

}


// =====================================================
// ENTRAR EM CAMPANHA
// =====================================================

if (campaignButton) {

    campaignButton.addEventListener(
        "click",
        () => {

            console.log(
                "⚔ Sistema de campanhas ainda será implementado."
            );

        }
    );

}

    // =====================================================
    // FINAL
    // =====================================================

    console.log(
        "🚀 Aerion main.js carregado corretamente."
    );

});