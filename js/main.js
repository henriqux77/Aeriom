document.addEventListener("DOMContentLoaded", () => {

    const menuButton = document.getElementById("menuButton");
    const profileButton = document.getElementById("profileButton");
    const createAccountButton = document.getElementById("createAccountButton");
    

document.addEventListener("DOMContentLoaded", () => {

    const loginButton = document.getElementById("loginButton");

    loginButton.addEventListener("click", async () => {

        const { data, error } =
            await supabaseClient.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: window.location.origin
                }
            });

        if (error) {
            console.error("Erro no login Google:", error);
            return;
        }

        console.log("Login iniciado:", data);
    });

});

    // Menu
    menuButton.addEventListener("click", () => {
        console.log("Menu do Aerion");
    });


    // Perfil
    profileButton.addEventListener("click", () => {
        console.log("Perfil do usuário");
    });


    // Criar conta
    createAccountButton.addEventListener("click", () => {
        console.log("Abrir tela de criação de conta");
    });


    // Entrar
    loginButton.addEventListener("click", () => {
        console.log("Abrir tela de login");
    });

});
