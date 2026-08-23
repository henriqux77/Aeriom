/* =========================================================
   AERION — MENU GLOBAL (SIDEBAR)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // O HTML do Menu Global que será injetado na página
    const menuHTML = `
        <div id="globalSidebar" class="global-sidebar">
            <div class="sidebar-header">
                <h2>AERIOM</h2>
                <button id="closeSidebarBtn" class="close-sidebar-btn">&times;</button>
            </div>
            <nav class="sidebar-nav">
                <a href="index.html" class="sidebar-link" data-page="index">🏠 Início</a>
                <a href="fichas.html" class="sidebar-link" data-page="fichas">📜 Minhas Fichas</a>
                <a href="campanhas.html" class="sidebar-link" data-page="campanhas">⚔️ Campanhas</a>
                <a href="ficha.html" class="sidebar-link" data-page="criar-ficha">➕ Criar Ficha</a>
                <div class="sidebar-divider"></div>
                <a href="#" class="sidebar-link" style="opacity: 0.5; pointer-events: none;">⚙️ Configurações</a>
                <a href="#" id="sidebarLogoutBtn" class="sidebar-link" style="color: #d46a4a;">🚪 Sair</a>
            </nav>
        </div>
        <div id="sidebarOverlay" class="sidebar-overlay"></div>
    `;

    // Injeta o HTML no body
    document.body.insertAdjacentHTML('beforeend', menuHTML);

    const sidebar = document.getElementById('globalSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const logoutBtn = document.getElementById('sidebarLogoutBtn');

    // Identifica e destaca a página atual
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    document.querySelectorAll('.sidebar-link').forEach(link => {
        if (link.getAttribute('data-page') === currentPage || (currentPage === 'campanha' && link.getAttribute('data-page') === 'campanhas')) {
            link.classList.add('active');
        }
    });

    // Função para abrir e fechar o menu (exposta globalmente para os botões ☰)
    window.toggleGlobalMenu = function() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    };

    function closeMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }

    // Eventos
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Se houver botões de menu na página, atrela a função
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', window.toggleGlobalMenu);
    });

    // Função de Logout centralizada
    if (logoutBtn && window.supabaseClient) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await window.supabaseClient.auth.signOut();
            window.location.href = "login.html";
        });
    }
});
