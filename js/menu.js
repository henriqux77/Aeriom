/* =========================================================
   AERIOM — MENU GLOBAL (js/menu.js)
   Fase 2: Correção de Z-Index, Overlay e Links Ativos
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // Previne a criação duplicada do menu
    if (document.getElementById("aeriomGlobalSidebar")) return;

    // Identifica a página atual
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // =========================================================
    // 1. CRIAÇÃO DO OVERLAY E SIDEBAR
    // =========================================================
    const overlay = document.createElement('div');
    overlay.className = 'global-overlay';
    overlay.id = 'aeriomGlobalOverlay';
    
    const sidebar = document.createElement('aside');
    sidebar.className = 'global-sidebar';
    sidebar.id = 'aeriomGlobalSidebar';

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h2 style="font-family: var(--font-heading); color: var(--color-primary); margin: 0;">Aeriom</h2>
            <button class="modal-close" id="closeSidebarBtn" title="Fechar Menu">×</button>
        </div>
        <nav class="sidebar-nav">
            <div class="sidebar-category">Mundo de Aventura</div>
            
            <a href="index.html" class="sidebar-link ${currentPage === 'index.html' ? 'active' : ''}">
                <span class="sidebar-icon">🏠</span> Início
            </a>
            
            <a href="fichas.html" class="sidebar-link ${['fichas.html', 'ficha.html', 'ficha-view.html'].includes(currentPage) ? 'active' : ''}">
                <span class="sidebar-icon">📜</span> Fichas de Herói
            </a>
            
            <a href="campanhas.html" class="sidebar-link ${['campanhas.html', 'campanha.html'].includes(currentPage) ? 'active' : ''}">
                <span class="sidebar-icon">🗺️</span> Campanhas
            </a>

            <div class="sidebar-category">Sistema</div>
            
            <a href="#" class="sidebar-link" onclick="alert('O Compêndio de Regras e Itens chegará numa atualização futura.'); return false;">
                <span class="sidebar-icon">📚</span> Compêndio
            </a>
        </nav>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);

    // =========================================================
    // 2. CONTROLES E EVENTOS
    // =========================================================
    const closeBtn = document.getElementById("closeSidebarBtn");
    const openBtn = document.getElementById("menuButton");

    function openMenu() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; 
    }

    function closeMenu() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; 
    }

    if (openBtn) {
        openBtn.addEventListener("click", openMenu);
    } else {
        console.warn("Aviso Aeriom: Botão '#menuButton' não encontrado nesta página.");
    }

    closeBtn?.addEventListener("click", closeMenu);
    
    // O clique no overlay (que agora tem z-index inferior ao sidebar) fecha o menu
    overlay.addEventListener("click", closeMenu);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && sidebar.classList.contains('active')) {
            closeMenu();
        }
    });
});
