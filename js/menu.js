/* =========================================================
   AERIOM — MENU GLOBAL (js/menu.js)
   Fase 5: Unificação de Botões (Desktop/Mobile) e Z-Index
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // Previne a criação duplicada do menu caso o script carregue duas vezes
    if (document.getElementById("aeriomGlobalSidebar")) return;

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
            
            <a href="#" class="sidebar-link" id="compendioLink">
                <span class="sidebar-icon">📚</span> Compêndio
            </a>
        </nav>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);

    // Proteção Anti-XSS: Remoção do onclick inline do HTML
    document.getElementById("compendioLink")?.addEventListener("click", (e) => {
        e.preventDefault();
        alert('O Compêndio de Regras e Itens chegará numa atualização futura.');
    });

    // =========================================================
    // 2. CONTROLES E EVENTOS (Mobile + Desktop)
    // =========================================================
    const closeBtn = document.getElementById("closeSidebarBtn");
    
    // Captura ambos os gatilhos oficiais da plataforma
    const openBtnDesktop = document.getElementById("menuButton");
    const openBtnMobile = document.getElementById("menuButtonMobile");

    function openMenu() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Bloqueia o scroll do fundo
    }

    function closeMenu() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restaura o scroll do fundo
    }

    if (openBtnDesktop) {
        openBtnDesktop.addEventListener("click", openMenu);
    }
    
    if (openBtnMobile) {
        // Limpa obrigatoriamente a dependência inline que existia no HTML antigo
        openBtnMobile.removeAttribute("onclick");
        openBtnMobile.addEventListener("click", openMenu);
    }

    if (!openBtnDesktop && !openBtnMobile) {
        console.warn("[AERIOM] Aviso: Nenhum botão de menu (#menuButton ou #menuButtonMobile) encontrado nesta página.");
    }

    closeBtn?.addEventListener("click", closeMenu);
    
    // O clique no overlay agora funciona corretamente porque o Z-Index foi estabelecido
    // globalmente na arquitetura CSS (Sidebar > Overlay > Content).
    overlay.addEventListener("click", closeMenu);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && sidebar.classList.contains('active')) {
            closeMenu();
        }
    });
});
