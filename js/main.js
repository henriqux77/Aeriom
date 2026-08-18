document.addEventListener("DOMContentLoaded", async () => {

    // =====================================================
    // SUPABASE
    // =====================================================

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error(
            "ERRO: window.supabaseClient não foi encontrado."
        );

        return;
    }

    console.log("Supabase carregado corretamente.");


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
    // AUTENTICAÇÃO
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
    // ESCONDER PERFIL
    // =====================================================

    if (profilePanel) {
        profilePanel.style.display = "none";
    }


    // =====================================================
    // FUNÇÕES DO MODAL
    // =====================================================

    function openAuth() {

        if (!authModal) {

            console.error(
                "ERRO: #authModal não encontrado no HTML."
            );

            return;
        }

        authModal.style.display = "flex";

        console.log("Modal de autenticação aberto.");
    }


    function closeAuthModal() {

        if (authModal) {
            authModal.style.display = "none";
        }
    }


    function showAuthMessage(message) {

        if (authMessage) {
            authMessage.textContent = message;
        }
    }


    // =====================================================
    // BOTÃO CRIAR CONTA DA HOME
    // =====================================================

    if (createAccountButton) {

        createAccountButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                console.log("Botão Criar Conta clicado.");

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

    } else {

        console.error(
            "ERRO: #createAccountButton não encontrado."
        );

    }


    // =====================================================
    // BOTÃO ENTRAR DA HOME
    // =====================================================

    if (loginButton) {

        loginButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                console.log("Botão Entrar clicado.");

                if (registerForm) {
                    registerForm.style.display = "none";
                }

                if (loginForm) {
                    loginForm.style.display = "block";
                }

                showAuthMessage("");

                openAuth();
            }
        );

    } else {

        console.error(
            "ERRO: #loginButton não encontrado."
        );

    }


    // =====================================================
    // FECHAR MODAL
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
    // IR PARA CADASTRO
    // =====================================================

    if (showRegisterButton) {

        showRegisterButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

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
            (event) => {

                event.preventDefault();

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
            async (event) => {

                event.preventDefault();

                showAuthMessage(
                    "Conectando ao Discord..."
                );

                const { error } =
                    await supabase.auth.signInWithOAuth({

                        provider: "discord",

                        options: {
                            redirectTo:
    "https://henriqux77.github.io/Aeriom/"
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
            async (event) => {

                event.preventDefault();

                showAuthMessage(
                    "Conectando ao Discord..."
                );

                const { error } =
                    await supabase.auth.signInWithOAuth({

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


                const {
                    data,
                    error
                } = await supabase.auth
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
    // CRIAR CONTA COM E-MAIL
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


                if (password !== confirmPassword) {

                    showAuthMessage(
                        "As senhas não são iguais."
                    );

                    return;
                }


                if (password.length < 6) {

                    showAuthMessage(
                        "A senha precisa ter pelo menos 6 caracteres."
                    );

                    return;
                }


                showAuthMessage(
                    "Criando sua conta..."
                );


                const {
                    data,
                    error
                } = await supabase.auth.signUp({

                    email: email,

                    password: password,

                    options: {

                        emailRedirectTo:
                            window.location.origin

                    }

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
        } = await supabase
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
            async (event) => {

                event.preventDefault();

                const {
                    data: { session },
                    error
                } = await supabase.auth.getSession();


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

                    if (loginForm) {
                        loginForm.style.display = "block";
                    }

                    if (registerForm) {
                        registerForm.style.display = "none";
                    }

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
    // SAIR
    // =====================================================

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();

                const { error } =
                    await supabase.auth.signOut();


                if (error) {

                    console.error(
                        "Erro ao sair:",
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
                    "Menu do Aerion"
                );

            }
        );

    }


    // =====================================================
    // AUTENTICAÇÃO
    // =====================================================

    supabase.auth.onAuthStateChange(
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
    // TESTAR SESSÃO INICIAL
    // =====================================================

    try {

        const {
            data: { session },
            error
        } = await supabase.auth.getSession();


        if (error) {

            console.error(
                "Erro ao recuperar sessão:",
                error
            );

        } else if (session) {

            console.log(
                "Sessão recuperada:",
                session.user.email
            );

        } else {

            console.log(
                "Nenhuma sessão encontrada."
            );

        }

    } catch (error) {

        console.error(
            "Erro ao verificar sessão:",
            error
        );

    }


    // =====================================================
    // FINAL
    // =====================================================

    console.log(
        "Aerion main.js carregado corretamente."
    );

});
const redirectUrl =
    window.location.origin + "https://henriqux77.github.io/Aeriom/";
options: {
    redirectTo: redirectUrl
}