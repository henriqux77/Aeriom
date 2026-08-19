// ========================================
// AERIOM - AUTENTICAÇÃO
// ========================================

// Verifica qual usuário está conectado
async function getUsuarioLogado() {
    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("Erro ao verificar usuário:", error);
        return null;
    }

    return user;
}


// ========================================
// VERIFICAR SESSÃO
// ========================================

async function verificarSessao() {
    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Erro ao verificar sessão:", error);
        return null;
    }

    return session;
}


// ========================================
// PROTEGER PÁGINAS
// ========================================

// Use esta função nas páginas que precisam de login.
async function exigirLogin() {
    const session = await verificarSessao();

    if (!session) {
        window.location.href = "index.html";
        return null;
    }

    return session;
}


// ========================================
// LOGOUT
// ========================================

async function fazerLogout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Erro ao sair:", error);
        return false;
    }

    window.location.href = "index.html";
    return true;
}


// ========================================
// OBSERVAR LOGIN / LOGOUT
// ========================================

supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("Estado da autenticação:", event);

    if (session) {
        console.log("Usuário conectado:", session.user.email);
    } else {
        console.log("Nenhum usuário conectado.");
    }
});


// ========================================
// MOSTRAR E-MAIL DO USUÁRIO
// ========================================

async function mostrarUsuarioLogado() {
    const usuario = await getUsuarioLogado();

    if (!usuario) {
        return null;
    }

    // Procura elementos que tenham data-user-email
    const elementos = document.querySelectorAll("[data-user-email]");

    elementos.forEach((elemento) => {
        elemento.textContent = usuario.email;
    });

    return usuario;
}


// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener("DOMContentLoaded", async () => {
    const usuario = await getUsuarioLogado();

    if (usuario) {
        console.log("Aeriom conectado como:", usuario.email);
    } else {
        console.log("Nenhum usuário está logado.");
    }
});