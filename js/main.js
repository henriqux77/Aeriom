document.addEventListener("DOMContentLoaded", async () => {

    // =========================
    // BOTÕES EXISTENTES
    // =========================

    const menuButton = document.getElementById("menuButton");
    const profileButton = document.getElementById("profileButton");
    const createAccountButton = document.getElementById("createAccountButton");
    const loginButton = document.getElementById("loginButton");


    // =========================
    // ELEMENTOS DO PERFIL
    // =========================

    const profilePanel = document.getElementById("profilePanel");
    const closeProfile = document.getElementById("closeProfile");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileAvatar = document.getElementById("profileAvatar");
    const logoutButton = document.getElementById("logoutButton");
    const editProfileButton = document.getElementById("editProfileButton");


    // =========================
    // ESCONDER PERFIL AO ABRIR
    // =========================

    if (profilePanel) {
        profilePanel.style.display = "none";
    }


    // =========================
    // BUSCAR DADOS DO USUÁRIO
    // =========================

    async function loadUserProfile(user) {

        if (!user) {
            return null;
        }

        const { data: profile, error } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();


        if (error) {

            console.error(
                "Erro ao buscar perfil:",
                error
            );

            return null;
        }


        // Dados vindos do Google
        const googleName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "Aventureiro";

        const googleAvatar =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            "assets/aerion-logo.png";


        return {

            name:
                profile?.display_name ||
                googleName,

            email:
                user.email ||
                "",

            avatar:
                profile?.avatar_url ||
                googleAvatar

        };

    }


    // =========================
    // VERIFICAR USUÁRIO LOGADO
    // =========================

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();


    if (session) {

        console.log(
            "Usuário logado:",
            session.user.email
        );

    }


    // =========================
    // BOTÃO DE PERFIL
    // =========================

    if (profileButton) {

        profileButton.addEventListener("click", async () => {

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


            // Se não estiver logado
            if (!session) {

                console.log(
                    "Nenhum usuário está logado."
                );

                return;
            }


            // Buscar perfil
            const profile =
                await loadUserProfile(session.user);


            if (!profile) {
                return;
            }


            // Preencher informações
            if (profileName) {
                profileName.textContent =
                    profile.name;
            }


            if (profileEmail) {
                profileEmail.textContent =
                    profile.email;
            }


            if (profileAvatar) {
                profileAvatar.src =
                    profile.avatar;
            }


            // Abrir painel
            if (profilePanel) {

                profilePanel.style.display = "flex";

            }

        });

    }


    // =========================
    // FECHAR PERFIL
    // =========================

    if (closeProfile) {

        closeProfile.addEventListener("click", () => {

            if (profilePanel) {

                profilePanel.style.display = "none";

            }

        });

    }


    // =========================
    // SAIR DA CONTA
    // =========================

    if (logoutButton) {

        logoutButton.addEventListener("click", async () => {

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

                profilePanel.style.display = "none";

            }


            console.log(
                "Usuário saiu da conta."
            );

        });

    }


    // =========================
    // EDITAR PERFIL
    // =========================

    if (editProfileButton) {

        editProfileButton.addEventListener("click", () => {

            console.log(
                "Editar perfil será implementado em breve."
            );

        });

    }


    // =========================
    // LOGIN COM GOOGLE
    // =========================

    if (loginButton) {

        loginButton.addEventListener("click", async () => {

            console.log(
                "Iniciando login com Google..."
            );


            const { error } =
                await supabaseClient.auth.signInWithOAuth({

                    provider: "google",

                    options: {

                        redirectTo:
                            window.location.origin

                    }

                });


            if (error) {

                console.error(
                    "Erro no login Google:",
                    error
                );

            }

        });

    }


    // =========================
    // CRIAR CONTA
    // =========================

    if (createAccountButton) {

        createAccountButton.addEventListener("click", () => {

            console.log(
                "Criação de conta será implementada em breve."
            );

        });

    }


    // =========================
    // MENU
    // =========================

    if (menuButton) {

        menuButton.addEventListener("click", () => {

            console.log(
                "Menu do Aerion"
            );

        });

    }


    // =========================
    // ALTERAÇÕES DE LOGIN
    // =========================

    supabaseClient.auth.onAuthStateChange((event, session) => {

        console.log(
            "Evento de autenticação:",
            event
        );


        if (session) {

            console.log(
                "Usuário autenticado:",
                session.user.email
            );

        }

    });

});