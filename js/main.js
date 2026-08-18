document.addEventListener("DOMContentLoaded", async () => {

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
    // PERFIL
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
    // ESCONDER PERFIL AO CARREGAR
    // =====================================================

    if (profilePanel) {
        profilePanel.style.display = "none";
    }


    // =====================================================
    // AUTENTICAÇÃO / MODAL
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
    // VERIFICAR SE O SUPABASE ESTÁ DISPONÍVEL
    // =====================================================

    if (!window.supabaseClient) {

        console.error(
            "supabaseClient não foi encontrado. Verifique o supabase.js."
        );

        return;
    }
const supabaseClient = window.supabaseClient;

    // =====================================================
    // RECUPERAR SESSÃO
    // =====================================================

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();


    if (sessionError) {

        console.error(
            "Erro ao recuperar sessão:",
            sessionError
        );

    } else if (session) {

        console.log(
            "Usuário já está logado:",
            session.user.email
        );

    } else {

        console.log(
            "Nenhum usuário logado."
        );

    }


    // =====================================================
    // ABRIR MODAL DE AUTENTICAÇÃO
    // =====================================================

    function openAuth() {

        if (!authModal) {

            console.error(
                "Elemento #authModal não encontrado no HTML."
            );

            return;
        }

        authModal.style.display = "flex";
    }


    // =====================================================
    // FECHAR MODAL DE AUTENTICAÇÃO
    // =====================================================

    function closeAuthModal() {

        if (authModal) {
            authModal.style.display = "none";
        }
    }


    // =====================================================
    // MOSTRAR MENSAGEM
    // =====================================================

    function showAuthMessage(message) {

        if (authMessage) {
            authMessage.textContent = message;
        }
    }


    // =====================================================
    // BOTÃO ENTRAR DA HOME
    // =====================================================

    if (loginButton) {

        loginButton.addEventListener(
            "click",
            () => {

                if (loginForm) {
                    loginForm.style.display = "block";
                }

                if (registerForm) {
                    registerForm.style.display = "none";
                }

                showAuthMessage("");

                openAuth();
            }
        );

    }


    // =====================================================
    // BOTÃO CRIAR CONTA DA HOME
    // =====================================================

    if (createAccountButton) {

        createAccountButton.addEventListener(
            "click",
            () => {

                if (loginForm) {
                    loginForm.style.display = "none";
                }

                if (registerForm) {
                    registerForm.style.display = "block";
                }

                showAuthMessage("");

                openAuth();
            }
        );

    }


    // =====================================================
    // FECHAR MODAL
    // =====================================================

    if (closeAuth) {

        closeAuth.addEventListener(
            "click",
            () => {

                closeAuthModal();

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

                if (loginForm) {
                    loginForm.style.display = "none";
                }

                if (registerForm) {
                    registerForm.style.display = "block";
                }

                showAuthMessage("");
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

                if (registerForm) {
                    registerForm.style.display = "none";
                }

                if (loginForm) {
                    loginForm.style.display = "block";
                }

                showAuthMessage("");
            }
        );

    }


    // =====================================================
    // LOGIN COM DISCORD
    // =====================================================

    if (discordLoginButton) {

        discordLoginButton.addEventListener(
            "click",
            async () => {

                showAuthMessage(
                    "Conectando ao Discord..."
                );


                const { error } =
                    await supabaseClient.auth.signInWithOAuth({

                        provider: "discord",

                        options: {

                            redirectTo:
                                window.location.origin

                        }

                    });


                if (error) {

                    console.error(
                        "Erro no login Discord:",
                        error
                    );

                    showAuthMessage(
                        "Não foi possível entrar com o Discord."
                    );

                }

            }
        );

    }


    // =====================================================
    // CADASTRO COM DISCORD
    // =====================================================

    if (discordRegisterButton) {

        discordRegisterButton.addEventListener(
            "click",
            async () => {

                showAuthMessage(
                    "Conectando ao Discord..."
                );


                const { error } =
                    await supabaseClient.auth.signInWithOAuth({

                        provider: "discord",

                        options: {

                            redirectTo:
                                window.location.origin

                        }

                    });


                if (error) {

                    console.error(
                        "Erro no cadastro Discord:",
                        error
                    );

                    showAuthMessage(
                        "Não foi possível criar a conta com o Discord."
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
                    document.getElementById("loginEmail");

                const passwordInput =
                    document.getElementById("loginPassword");


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


                const {
                    data,
                    error
                } = await supabaseClient.auth
                    .signInWithPassword({

                        email: email,

                        password: password

                    });


                if (error) {

                    console.error(
                        "Erro no login:",
                        error
                    );

                    showAuthMessage(
                        error.message
                    );

                    return;
                }


                console.log(
                    "Login realizado:",
                    data.user.email
                );


                showAuthMessage(
                    "Login realizado com sucesso!"
                );


                closeAuthModal();

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
                    document.getElementById("registerEmail");

                const passwordInput =
                    document.getElementById("registerPassword");

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

                if (password !== confirmPassword) {

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


                // -----------------------------
                // CRIAR USUÁRIO
                // -----------------------------

                const {
                    data,
                    error
                } = await supabaseClient.auth.signUp({

                    email: email,

                    password: password

                });


                // -----------------------------
                // ERRO
                // -----------------------------

                if (error) {

                    console.error(
                        "Erro ao criar conta:",
                        error
                    );

                    showAuthMessage(
                        error.message
                    );

                    return;
                }


                // -----------------------------
                // SUCESSO
                // -----------------------------

                console.log(
                    "Conta criada:",
                    data
                );


                if (data.session) {

                    showAuthMessage(
                        "Conta criada com sucesso!"
                    );

                    closeAuthModal();

                } else {

                    showAuthMessage(
                        "Conta criada! A confirmação de e-mail ainda está ativada no Supabase."
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


        const {
            data: profile,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();


        if (error) {

            console.error(
                "Erro ao buscar perfil:",
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

            name: name,

            email: user.email || "",

            avatar: avatar

        };

    }


    // =====================================================
    // BOTÃO DE PERFIL
    // =====================================================

    if (profileButton) {

        profileButton.addEventListener(
            "click",
            async () => {

                const {
                    data: { session },
                    error
                } = await supabaseClient.auth.getSession();


                if (error) {

                    console.error(
                        "Erro ao verificar sessão:",
                        error
                    );

                    return;
                }


                if (!session) {

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

                        // Evita imagem quebrada
                        profileAvatar.removeAttribute(
                            "src"
                        );

                        profileAvatar.style.display =
                            "none";

                    }

                }


                if (profilePanel) {

                    profilePanel.style.display =
                        "flex";

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
    // SAIR DA CONTA
    // =====================================================

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                const { error } =
                    await supabaseClient.auth.signOut();


                if (error) {

                    console.error(
                        "Erro ao sair da conta:",
                        error
                    );

                    return;
                }


                if (profilePanel) {

                    profilePanel.style.display =
                        "none";

                }


                console.log(
                    "Usuário saiu da conta."
                );

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
                    "Menu do Aerion"
                );

            }
        );

    }


    // =====================================================
    // ALTERAÇÃO DE AUTENTICAÇÃO
    // =====================================================

    supabaseClient.auth.onAuthStateChange(
        (event, session) => {

            console.log(
                "Evento de autenticação:",
                event
            );


            if (session) {

                console.log(
                    "Usuário autenticado:",
                    session.user.email
                );

            } else {

                console.log(
                    "Usuário não autenticado."
                );

            }

        }
    );


    // =====================================================
    // FINAL
    // =====================================================

    console.log(
        "Aerion main.js carregado corretamente."
    );

});