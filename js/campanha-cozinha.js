/* =========================================================
   AERIOM — MÓDULO DE COZINHA E ALQUIMIA (js/campanha-cozinha.js)
   Gerenciamento de Ingredientes, Caldeirão e Receitas
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;
    let ingredientsList = [];
    let recipesList = [];
    let cauldronItems = [];

    window.initCookingSystem = async function(_supabase, _campaignId) {
        supabase = _supabase;
        campaignId = _campaignId;

        await loadCookingData();
        setupCookingUI();
    };

    async function loadCookingData() {
        const container = document.getElementById('tab-cozinha');
        if (!container) return;

        // Busca ingredientes e receitas da campanha
        const [ingRes, recRes, stateRes] = await Promise.all([
            supabase.from('campaign_ingredients').select('*').eq('campaign_id', campaignId),
            supabase.from('campaign_recipes').select('*').eq('campaign_id', campaignId),
            supabase.from('campaign_cooking_state').select('*').eq('campaign_id', campaignId).maybeSingle()
        ]);

        ingredientsList = ingRes.data || [];
        recipesList = recRes.data || [];
        const activeMeal = stateRes.data;

        renderCookingTab(activeMeal);
    }

    function renderCookingTab(activeMeal) {
        const container = document.getElementById('tab-cozinha');
        if (!container) return;

        let activeMealHtml = '';
        if (activeMeal && activeMeal.is_active) {
            activeMealHtml = `
                <div class="panel" style="border-color: var(--success); background: linear-gradient(145deg, rgba(34, 197, 94, 0.1), var(--theme-surface)); text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 0.75rem; color: var(--success); text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Refeição Ativa no Acampamento</span>
                    <h3 style="color: var(--text-primary); font-size: 1.5rem; margin: 0.5rem 0;">${activeMeal.meal_name}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">${activeMeal.effect_description}</p>
                </div>
            `;
        }

        container.innerHTML = `
            ${activeMealHtml}
            <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
                
                <!-- Coluna Esquerda: Ingredientes & Caldeirão -->
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div class="panel">
                        <div class="panel-header">
                            <div>
                                <h3>Caldeirão Alquímico</h3>
                                <p>Arraste ingredientes ou clique para misturar.</p>
                            </div>
                        </div>
                        
                        <div id="cauldronZone" style="border: 2px dashed var(--theme-border-strong); border-radius: var(--radius-md); background: radial-gradient(circle at center, rgba(0,0,0,0.4), var(--theme-bg)); padding: 2rem; min-height: 200px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center; position: relative;">
                            <span id="cauldronPlaceholder" style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">O caldeirão está vazio...</span>
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: 1.5rem;">
                            <button id="cookBtn" class="btn btn-primary w-full" disabled>Preparar Receita</button>
                            <button id="clearCauldronBtn" class="btn btn-secondary">Limpar</button>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="panel-header">
                            <h3>Bolsa de Ingredientes</h3>
                            <p>Itens coletados nas jornadas.</p>
                        </div>
                        <div id="ingredientsInventory" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; max-height: 250px; overflow-y: auto;">
                            <!-- Injetado via JS -->
                        </div>
                    </div>
                </div>

                <!-- Coluna Direita: Livro de Receitas -->
                <div class="panel">
                    <div class="panel-header">
                        <h3>Livro de Receitas</h3>
                        <p>Combinações conhecidas pelo grupo.</p>
                    </div>
                    <div id="recipesBook" style="display: flex; flex-direction: column; gap: 10px; max-height: 500px; overflow-y: auto;">
                        <!-- Injetado via JS -->
                    </div>
                </div>

            </div>
        `;

        populateIngredientsUI();
        populateRecipesUI();
        attachCookingInteractions();
    }

    function populateIngredientsUI() {
        const grid = document.getElementById('ingredientsInventory');
        if (!grid) return;
        grid.innerHTML = '';

        if (ingredientsList.length === 0) {
            grid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center; font-size: 0.85rem;">Nenhum ingrediente na bolsa.</p>';
            return;
        }

        ingredientsList.forEach(ing => {
            const card = document.createElement('div');
            card.className = 'ingredient-card';
            card.style.cssText = "background: var(--theme-surface-elevated); border: 1px solid var(--theme-border); padding: 0.75rem; border-radius: var(--radius-sm); text-align: center; cursor: pointer; transition: var(--transition-fast);";
            
            card.innerHTML = `
                <div style="font-size: 1.5rem; margin-bottom: 4px;">🌿</div>
                <strong style="font-size: 0.85rem; display: block; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ing.name}</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Qtd: ${ing.quantity}</span>
            `;

            card.addEventListener('click', () => {
                addToCauldron(ing);
            });

            grid.appendChild(card);
        });
    }

    function populateRecipesUI() {
        const book = document.getElementById('recipesBook');
        if (!book) return;
        book.innerHTML = '';

        if (recipesList.length === 0) {
            book.innerHTML = '<p class="text-muted text-center" style="font-size: 0.9rem; padding: 2rem;">Nenhuma receita descoberta ainda. Experimente combinar ingredientes no caldeirão!</p>';
            return;
        }

        recipesList.forEach(rec => {
            const item = document.createElement('div');
            item.style.cssText = "background: var(--theme-surface-elevated); border: 1px solid var(--theme-border); padding: 1rem; border-radius: var(--radius-sm);";
            item.innerHTML = `
                <h4 style="color: var(--theme-primary); font-size: 1rem; margin-bottom: 4px;">${rec.name}</h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">${rec.description}</p>
                <span style="font-size: 0.75rem; color: var(--success); font-weight: 500;">✨ Efeito: ${rec.effect}</span>
            `;
            book.appendChild(item);
        });
    }

    function addToCauldron(ing) {
        cauldronItems.push(ing);
        renderCauldron();
    }

    function renderCauldron() {
        const zone = document.getElementById('cauldronZone');
        const placeholder = document.getElementById('cauldronPlaceholder');
        const cookBtn = document.getElementById('cookBtn');
        if (!zone) return;

        // Remove itens antigos exceto o placeholder
        Array.from(zone.children).forEach(child => {
            if (child.id !== 'cauldronPlaceholder') child.remove();
        });

        if (cauldronItems.length > 0) {
            if (placeholder) placeholder.style.display = 'none';
            cookBtn.disabled = false;

            cauldronItems.forEach((item, idx) => {
                const tag = document.createElement('div');
                tag.style.cssText = "background: var(--theme-surface-interactive); border: 1px solid var(--theme-border-strong); padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; color: var(--text-primary);";
                tag.innerHTML = `<span>🌿 ${item.name}</span> <button style="color: var(--danger); cursor: pointer; font-size: 1rem;" title="Remover">×</button>`;
                
                tag.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    cauldronItems.splice(idx, 1);
                    renderCauldron();
                });

                zone.appendChild(tag);
            });
        } else {
            if (placeholder) placeholder.style.display = 'block';
            cookBtn.disabled = true;
        }
    }

    function attachCookingInteractions() {
        document.getElementById('clearCauldronBtn')?.addEventListener('click', () => {
            cauldronItems = [];
            renderCauldron();
        });

        document.getElementById('cookBtn')?.addEventListener('click', async () => {
            if (cauldronItems.length === 0) return;
            
            const btn = document.getElementById('cookBtn');
            btn.disabled = true;
            btn.textContent = "Borrachando o Caldeirão...";

            // Simula o preparo e registra no log
            setTimeout(async () => {
                const names = cauldronItems.map(i => i.name).join(' + ');
                if (window.generateLog) {
                    window.generateLog(`O grupo preparou uma mistura alquímica com: ${names}.`, 'cooking');
                }
                
                cauldronItems = [];
                renderCauldron();
                btn.textContent = "Preparar Receita";
                alert("Mistura concluída com sucesso! Verifique o diário da campanha.");
            }, 1000);
        });
    }

    function setupCookingUI() {
        // Lógica de tempo real ou recarga se necessário
    }

})();
