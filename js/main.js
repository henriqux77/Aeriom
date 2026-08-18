document.addEventListener("DOMContentLoaded", async () => {

    // =====================================================
    // SUPABASE
    // =====================================================

    const client = window.supabaseClient;

    if (!client) {
        console.error(
            "Supabase não foi inicializado. Verifique o supabase.js."
        );
        return;
    }


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
    // MODAL DE AUTENTICAÇÃO
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
    // VERIFICAR ELEMENTOS IMPORTANTES
    // =====================================================

    console.log("Aerion main.js iniciado.");

    console.log("Supabase:", client ? "OK" : "ERRO");

    console.log(
        "Botão Criar Conta:",
        createAccountButton ? "OK" : "NÃO ENCONTRADO"
    );

    console.log(
        "Botão Entrar:",
        loginButton ? "OK" : "NÃO ENCONTRADO"
    );

    console.log(
        "Modal:",
        authModal ? "OK" : "NÃO ENCONTRADO"
    );


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
    // RECUPERAR SESSÃO
    // =====================================================

    try {

        const {
            data: { session },
            error
        } = await client.auth.getSession();


        if (error) {

            console.error(
                "Erro ao recuperar sessão:",
                error
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

    } catch (error) {

        console.error(
            "Erro inesperado ao recuperar sessão:",
            error
        );

    }


    // =====================================================
    // ABRIR MODAL
    // =====================================================

    function openAuth() {

        if (!authModal) {

            console.error(
                "Elemento #authModal não encontrado."
            );

            return;
        }

        authModal.style.display = "flex";

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
    // MENSAGEM DE AUTENTICAÇÃO
    // =====================================================

    function showAuthMessage(message) {

        if (authMessage) {
            authMessage.textContent = message;
        }

    }


    // =====================================================
    // MOSTRAR LOGIN
    // =====================================================

    function showLogin() {

        if (loginForm) {
            loginForm.style.display = "block";
        }

        if (registerForm) {
            registerForm.style.display = "none";
        }

        showAuthMessage("");

        openAuth();

    }


    // =====================================================
    // MOSTRAR CADASTRO
    // =====================================================

    function showRegister() {

        if (loginForm) {
            loginForm.style.display = "none";
        }

        if (registerForm) {
            registerForm.style.display = "block";
        }

        showAuthMessage("");

        openAuth();

    }


    // =====================================================
    // BOTÃO ENTRAR DA HOME
    // =====================================================

    if (loginButton) {

        loginButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                console.log(
                    "Botão Entrar clicado."
                );

                showLogin();

            }
        );

    } else {

        console.warn(
            "#loginButton não encontrado no HTML."
        );

    }


    // =====================================================
    // BOTÃO CRIAR CONTA DA HOME
    // =====================================================

    if (createAccountButton) {

        createAccountButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                console.log(
                    "Botão Criar Conta clicado."
                );

                showRegister();

            }
        );

    } else {

        console.warn(
            "#createAccountButton não encontrado no HTML."
        );

    }


    // =====================================================
    // FECHAR AUTENTICAÇÃO
    // =====================================================

    if (closeAuth) {

        closeAuth.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

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
            (event) => {

                event.preventDefault();

                showRegister();

            }
        );

    }


    // =====================================================
    // VOLTAR PARA LOGIN
    // =====================================================

    if (showLoginButton) {

        showLoginButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                showLogin();

            }
        );

    }


    // =====================================================
    // LOGIN COM DISCORD
    // =====================================================

    if (discordLoginButton) {

        discordLoginButton.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();

                showAuthMessage(
                    "Conectando ao Discord..."
                );


                try {

                    const {
                        error
                    } = await client.auth.signInWithOAuth({

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

                } catch (error) {

                    console.error(
                        "Erro inesperado no Discord:",
                        error
                    );

                    showAuthMessage(
                        "Erro ao conectar com o Discord."
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
            async (event) => {

                event.preventDefault();

                showAuthMessage(
                    "Conectando ao Discord..."
                );


                try {

                    const {
                        error
                    } = await client.auth.signInWithOAuth({

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

                } catch (error) {

                    console.error(
                        "Erro inesperado no Discord:",
                        error
                    );

                    showAuthMessage(
                        "Erro ao conectar com o Discord."
                    );

                }

            }
        );

    }


    // =====================================================
    // LOGIN COM E-MAIL
    // =====================================================

    if (emailLoginButton) {

        emailLoginButton.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();


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


                try {

                    const {
                        data,
                        error
                    } = await client.auth
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
                        data.user?.email
                    );


                    showAuthMessage(
                        "Login realizado com sucesso!"
                    );


                    setTimeout(() => {

                        closeAuthModal();

                    }, 500);


                } catch (error) {

                    console.error(
                        "Erro inesperado no login:",
                        error
                    );

                    showAuthMessage(
                        "Erro ao realizar login."
                    );

                }

            }
        );

    }


    // =====================================================
    // CADASTRO COM E-MAIL
    // =====================================================

    if (registerButton) {

        registerButton.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();


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
                // VALIDAR SENHAS
                // -----------------------------

                if (password !== confirmPassword) {

                    showAuthMessage(
                        "As senhas não são iguais."
                    );

                    return;

                }


                // -----------------------------
                // VALIDAR TAMANHO
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
                    } = await client.auth.signUp({

                        email: email,

                        password: password

                    });


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


                    console.log(
                        "Conta criada:",
                        data
                    );


                    // =================================================
                    // SE O SUPABASE CRIOU A SESSÃO
                    // =================================================

                    if (data.session) {

                        showAuthMessage(
                            "Conta criada com sucesso!"
                        );


                        setTimeout(() => {

                            closeAuthModal();

                        }, 500);


                    } else {

                        // =================================================
                        // CONFIRMAÇÃO DE E-MAIL ATIVADA
                        // =================================================

                        showAuthMessage(
                            "Conta criada. A confirmação de e-mail está ativada no Supabase."
                        );

                    }

                } catch (error) {

                    console.error(
                        "Erro inesperado ao criar conta:",
                        error
                    );

                    showAuthMessage(
                        "Erro ao criar a conta."
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


        let profile = null;


        try {

            const {
                data,
                error
            } = await client
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();


            if (error) {

                console.error(
                    "Erro ao buscar perfil:",
                    error
                );

            } else {

                profile = data;

            }

        } catch (error) {

            console.error(
                "Erro inesperado ao buscar perfil:",
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
    // ABRIR PERFIL
    // =====================================================

    if (profileButton) {

        profileButton.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();


                try {

                    const {
                        data: { session },
                        error
                    } = await client.auth.getSession();


                    if (error) {

                        console.error(
                            "Erro ao verificar sessão:",
                            error
                        );

                        return;

                    }


                    if (!session) {

                        showLogin();

                        showAuthMessage(
                            "Entre na sua conta para abrir o perfil."
                        );

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

                } catch (error) {

                    console.error(
                        "Erro ao abrir perfil:",
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
            (event) => {

                event.preventDefault();

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
            async (event) => {

                event.preventDefault();


                try {

                    const {
                        error
                    } = await client.auth.signOut();


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

                } catch (error) {

                    console.error(
                        "Erro inesperado ao sair:",
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
            (event) => {

                event.preventDefault();

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
            (event) => {

                event.preventDefault();

                console.log(
                    "Menu do Aerion."
                );

            }
        );

    }


    // =====================================================
    // ALTERAÇÃO DE AUTENTICAÇÃO
    // =====================================================

    client.auth.onAuthStateChange(
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