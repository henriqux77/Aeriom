document.addEventListener("DOMContentLoaded", () => {

    const menuButton = document.getElementById("menuButton");
    const profileButton = document.getElementById("profileButton");
    const createAccountButton = document.getElementById("createAccountButton");
    const loginButton = document.getElementById("loginButton");


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
            console.log("Abrir tela de criação de conta");
        });
    }


    // =========================
    // LOGIN COM GOOGLE
    // =========================

    if (loginButton) {

        loginButton.addEventListener("click", async () => {

            console.log("Iniciando login com Google...");

            const { data, error } =
                await supabaseClient.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo: window.location.origin
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

        });

    }

});