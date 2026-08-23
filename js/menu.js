/* =========================================================
   AERIOM — MENU GLOBAL (js/menu.js)
   Fase 1: Fonte Única da Verdade (Injeção Dinâmica)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // 1. Limpeza de Menus Duplicados (Remove hardcoded dos HTMLs)
    const oldSidebars = document.querySelectorAll('.global-sidebar, .sidebar');
    const oldOverlays = document.querySelectorAll('.global-overlay, .sidebar-overlay');
    
    oldSidebars.forEach(el => el.remove());
    oldOverlays.forEach(el => el.remove());

    // 2. Identificar a página atual para destacar a navegação
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    const isHome = currentPath === 'index.html' || currentPath === '';
    const isFichas = currentPath.includes('ficha');
    const isCampanhas = currentPath.includes('campanha');

    // 3. Criar o Overlay Global
    const overlay = document.createElement('div');
    overlay.className = 'global-overlay';
    overlay.id = 'sidebarOverlay';
    document.body.appendChild(overlay);

    // 4. Criar a Sidebar Global
    const sidebar = document.createElement('aside');
    sidebar.className = 'global-sidebar';
    sidebar.id = 'globalSidebar';

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h2>Aeriom</h2>
            <button class="btn-ghost" id="closeSidebarBtn" style="font-size: 1.5rem; padding: 0 8px; line-height: 1;" title="Fechar Menu">&times;</button>
        </div>
        <nav class="sidebar-nav">
            <div class="sidebar-category">Aventura</div>
            <a href="index.html" class="sidebar-link ${isHome ? 'active current' : ''}">
                <span class="sidebar-icon">🏠</span> Início
            </a>
            <a href="fichas.html" class="sidebar-link ${isFichas ? 'active current' : ''}">
                <span class="sidebar-icon">📜</span> Fichas
            </a>
            <a href="campanhas.html" class="sidebar-link ${isCampanhas ? 'active current' : ''}">
                <span class="sidebar-icon">⚔️</span> Campanhas
            </a>
            
            <div class="sidebar-category">Ferramentas</div>
            <a href="#" class="sidebar-link" id="globalDiceRollerBtn">
                <span class="sidebar-icon">🎲</span> Rolador
            </a>
            <a href="#" class="sidebar-link" onclick="alert('Em breve!')">
                <span class="sidebar-icon">📚</span> Biblioteca
            </a>
            
            <div class="sidebar-category">Mestre</div>
            <a href="#" class="sidebar-link" onclick="alert('Em breve!')">
                <span class="sidebar-icon">🐉</span> Bestiário
            </a>
        </nav>
    `;
    document.body.appendChild(sidebar);

    // 5. Lógica de Interação (Abrir/Fechar)
    function toggleMenu() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    // Fechar ao clicar no X ou no fundo escuro
    const closeBtn = document.getElementById('closeSidebarBtn');
    if (closeBtn) closeBtn.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    // Abrir menu ao clicar em qualquer botão designado para isso na interface
    const menuOpenButtons = document.querySelectorAll('#menuButton, #menuButtonMob, .menu-btn');
    menuOpenButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });
    });

    // Feedback temporário para botões em desenvolvimento
    document.getElementById('globalDiceRollerBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert("O Rolador de Dados Físico chegará na Fase 6!");
    });
});
