document.addEventListener("DOMContentLoaded", () => {

    const menuButton = document.getElementById("menuButton");
    const profileButton = document.getElementById("profileButton");
    const createAccountButton = document.getElementById("createAccountButton");
    const loginButton = document.getElementById("loginButton");


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
