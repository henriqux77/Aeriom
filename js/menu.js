/* =========================================================
   AERIOM — MENU GLOBAL (js/menu.js)
   Correção de Integração: Z-Index, Overlay, Lock Scroll e Links Ativos
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // Previne a criação duplicada do menu caso o script seja chamado mais de uma vez
    if (document.getElementById("aeriomGlobalSidebar")) return;

    // Identifica a página atual para destacar o link ativo de forma automática
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

    // A estrutura do menu é puramente estática e de navegação (seguro usar innerHTML aqui)
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h2>Aeriom</h2>
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

    // A ordem de injeção no DOM garante o comportamento estrutural
    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);

    // =========================================================
    // 2. SELEÇÃO DE ELEMENTOS INTERNOS E EVENTOS
    // =========================================================
    const closeBtn = document.getElementById("closeSidebarBtn");
    const openBtn = document.getElementById("menuButton"); // Botão localizado na topbar do HTML

    function openMenu() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Bloqueia o scroll do fundo no mobile/desktop
    }

    function closeMenu() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restaura o scroll do fundo
    }

    // Liga os Eventos
    if (openBtn) {
        openBtn.addEventListener("click", openMenu);
    } else {
        console.warn("Aviso Aeriom: Botão '#menuButton' não encontrado no DOM desta página.");
    }

    closeBtn?.addEventListener("click", closeMenu);
    
    // O clique fora do menu (no overlay) fecha a navegação, respeitando a nova hierarquia do z-index
    overlay.addEventListener("click", closeMenu);

    // Fechamento via Teclado (Acessibilidade)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && sidebar.classList.contains('active')) {
            closeMenu();
        }
    });
});
