document.addEventListener("DOMContentLoaded", () => {

    const menuButton = document.getElementById("menuButton");
    const profileButton = document.getElementById("profileButton");
    const createAccountButton = document.getElementById("createAccountButton");
    
document.addEventListener("DOMContentLoaded", () => {

    const loginButton = document.getElementById("loginButton");

    loginButton.addEventListener("click", async () => {

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) {
            console.error("Erro ao entrar com Google:", error);
            alert("Não foi possível entrar. Tente novamente.");
        }
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
