document.addEventListener("DOMContentLoaded", async () => {

    const menuButton = document.getElementById("menuButton");
    const profileButton = document.getElementById("profileButton");
    const createAccountButton = document.getElementById("createAccountButton");
    const loginButton = document.getElementById("loginButton");


    // =========================
    // BUSCAR PERFIL
    // =========================

    async function loadUserProfile(user) {

        if (!user) {
            console.log("Nenhum usuário para carregar.");
            return;
        }

        console.log("Buscando perfil do usuário...");

        const { data, error } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();


        if (error) {

            console.error(
                "Erro ao buscar perfil:",
                error
            );

            return;
        }


        console.log("Perfil encontrado!");
        console.log("Nome:", data.display_name);
        console.log("Avatar:", data.avatar_url);

    }


    // =========================
    // VERIFICAR SESSÃO
    // =========================

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();


    if (session) {

        console.log("Usuário está logado!");

        console.log("ID:", session.user.id);
        console.log("E-mail:", session.user.email);

        await loadUserProfile(session.user);

    } else {

        console.log("Nenhum usuário logado.");

    }


    // =========================
    // ALTERAÇÕES DE AUTENTICAÇÃO
    // =========================

    supabaseClient.auth.onAuthStateChange(
        async (event, session) => {

            console.log(
                "Evento de autenticação:",
                event
            );


            if (session) {

                console.log(
                    "Usuário autenticado:",
                    session.user.email
                );

                await loadUserProfile(session.user);

            } else {

                console.log(
                    "Usuário saiu da conta."
                );

            }

        }
    );


    // =========================
    // MENU
    // =========================

    if (menuButton) {

        menuButton.addEventListener("click", () => {

            console.log("Menu do Aerion");

        });

    }


    // =========================
    // PERFIL
    // =========================

    if (profileButton) {

        profileButton.addEventListener("click", () => {

            console.log("Perfil do usuário");

        });

    }


    // =========================
    // CRIAR CONTA
    // =========================

    if (createAccountButton) {

        createAccountButton.addEventListener("click", () => {

            console.log(
                "A criação de conta será implementada em breve."
            );

        });

    }


    // =========================
    // LOGIN COM GOOGLE
    // =========================

    if (loginButton) {

        loginButton.addEventListener(
            "click",
            async () => {

                console.log(
                    "Iniciando login com Google..."
                );


                const { data, error } =
                    await supabaseClient.auth
                        .signInWithOAuth({

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

                    return;

                }


                console.log(
                    "Login Google iniciado:",
                    data
                );

            }
        );

    }

});