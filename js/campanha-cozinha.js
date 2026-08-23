/* =========================================================
   AERION — SISTEMA DE COZINHA (MÓDULO ISOLADO)
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;
    let availableIngredients = [];
    let cauldronIngredients = [];
    let knownRecipes = [];

    // ==================================================
    // IMAGENS DOS INGREDIENTES (Fácil customização)
    // ==================================================
    const INGREDIENT_IMAGES = {
        "Erva Verde": "https://i.ibb.co/FqdStCX7/b108ec9f-9538-451d-8803-f0dff6f73cca-20260822-211244-0000.png",
        "Broto de Primavera": "https://i.ibb.co/3YFh0h0k/2c1c647e-0fc7-400e-ab8a-09d49d9e4336-20260822-211153-0000.png",
        "Raiz Branca": "https://i.ibb.co/r2Fbbq97/19342e42-55e9-493d-a99f-0e0f28d37c58-20260822-211336-0000.png",
        "Cogumelo Cinzento": "https://i.ibb.co/zTfPr8YT/771be43f-721d-4990-ad8b-600ac20528fb-20260822-211449-0000.png",
        "Fruta Silvestre": "https://i.ibb.co/hFmSBWPR/4a94b6a5-f9ec-45ae-ba05-1ad0e6664a72-20260822-211358-0000.png",
        "Bagas Vermelhas": "https://i.ibb.co/ZzDckx1d/29284bcf-869f-4303-82b5-8b3097f891b3-20260822-211616-0000.png",
        "Carne de Coelho Selvagem": "https://i.ibb.co/B8DtKgW/ed1cd009-3a71-4f59-9477-ffd996aec1d7-20260822-211420-0000.png",
        "Ovo de Ave Selvagem": "https://i.ibb.co/vxkWjJ0f/af9cf103-db25-48d0-9785-cb3c84f44b01-20260822-211642-0000.png",
        "Mel Silvestre": "https://i.ibb.co/rRjsBzR7/6d76b5c3-756b-4183-b486-40d45e4154d8-20260822-211708-0000.png",
        "Sal de Rocha": "https://i.ibb.co/391QH5Yj/96c690f1-aab8-45f6-b9b0-679f1718d16c-20260822-211731-0000.png"
    };

    // ==================================================
    // IMAGENS DAS RECEITAS (Fácil customização)
    // ==================================================
    const RECIPE_IMAGES = {
        "Sopa de Ervas": "https://i.ibb.co/s935G49f/225120ae-3307-454c-baf6-bf2209072cfc-20260822-212246-0000.png",
        "Ensopado Silvestre": "https://i.ibb.co/LdXtZ6kc/231f69fa-777c-4fe9-bc3d-bdf9e1c86387-20260822-212303-0000.png",
        "Frutas ao Mel": "https://i.ibb.co/Mkvb1X6B/34cf5093-8fec-4bce-aa6a-8e875d6fd588-20260822-212218-0000.png"
    };

    const DEFAULT_TEST_INGREDIENTS = [
        { name: "Erva Verde", quantity: 5, category: "Vegetal", rarity: "Comum", desc: "Erva comum com leves propriedades revigorantes." },
        { name: "Broto de Primavera", quantity: 4, category: "Vegetal", rarity: "Comum", desc: "Broto fresco colhido em matas temperadas." },
        { name: "Raiz Branca", quantity: 3, category: "Raiz", rarity: "Comum", desc: "Raiz nutritiva usada para engrossar caldos." },
        { name: "Cogumelo Cinzento", quantity: 4, category F: "Fungo", rarity: "Comum", desc: "Fungo subterrâneo de sabor terroso." },
        { name: "Fruta Silvestre", quantity: 3, category: "Fruta", rarity: "Comum", desc: "Fruta doce encontrada em arbustos silvestres." },
        { name: "Bagas Vermelhas", quantity: 6, category: "Fruta", rarity: "Comum", desc: "Pequenas bagas ácidas e suculentas." },
        { name: "Carne de Coelho Selvagem", quantity: 2, category: "Carne", rarity: "Incomum", desc: "Carne magra de caça." },
        { name: "Ovo de Ave Selvagem", quantity: 2, category: "Ovo", rarity: "Comum", desc: "Ovo fresco de ninho silvestre." },
        { name: "Mel Silvestre", quantity: 2, category: "Doce", rarity: "Incomum", desc: "Mel dourado produzido por abelhas bravas." },
        { name: "Sal de Rocha", quantity: 5, category: "Tempero", rarity: "Comum", desc: "Cristais de sal mineral essencial para temperar." }
    ];

    const DEFAULT_TEST_RECIPES = [
        {
            key: "sopa_de_ervas",
            name: "Sopa de Ervas",
            ingredients: { "Erva Verde": 1, "Broto de Primavera": 1, "Raiz Branca": 1, "Cogumelo Cinzento": 1, "Sal de Rocha": 1 },
            prep_time: "20 minutos",
            desc: "Uma sopa simples e reconfortante preparada durante uma viagem ou descanso.",
            effect: "+5 PV temporários."
        },
        {
            key: "ensopado_silvestre",
            name: "Ensopado Silvestre",
            ingredients: { "Carne de Coelho Selvagem": 1, "Raiz Branca": 1, "Cogumelo Cinzento": 1, "Bagas Vermelhas": 1, "Sal de Rocha": 1 },
            prep_time: "45 minutos",
            desc: "Ensopado consistente preparado com carne e ingredientes encontrados durante a exploração.",
            effect: "+10 PV temporários."
        },
        {
            key: "frutas_ao_mel",
            name: "Frutas ao Mel",
            ingredients: { "Fruta Silvestre": 1, "Bagas Vermelhas": 1, "Mel Silvestre": 1 },
            prep_time: "15 minutos",
            desc: "Frutas frescas cobertas com mel silvestre.",
            effect: "+5 Mana temporários."
        }
    ];

    window.initCookingSystem = async function(_supabase, _campaignId) {
        supabase = _supabase;
        campaignId = _campaignId;

        await ensureDatabaseSetup();
        await loadIngredients();
        await loadRecipes();
        await loadActiveMeal();
        renderCookingUI();
    };

    async function ensureDatabaseSetup() {
        try {
            const { count } = await supabase.from('campaign_ingredients').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId);
            if (count === 0) {
                const rows = DEFAULT_TEST_INGREDIENTS.map(i => ({
                    campaign_id: campaignId,
                    item_key: i.name.toLowerCase().replace(/ /g, '_'),
                    name: i.name,
                    quantity: i.quantity,
                    category: i.category,
                    rarity: i.rarity,
                    description: i.desc,
                    image_url: INGREDIENT_IMAGES[i.name] || "COLOCAR_URL_DA_IMAGEM_AQUI"
                }));
                await supabase.from('campaign_ingredients').insert(rows);
            }

            const { count: recCount } = await supabase.from('campaign_recipes').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId);
            if (recCount === 0) {
                const recRows = DEFAULT_TEST_RECIPES.map(r => ({
                    campaign_id: campaignId,
                    recipe_key: r.key,
                    name: r.name,
                    ingredients_json: r.ingredients,
                    prep_time: r.prep_time,
                    description: r.desc,
                    effect_summary: r.effect,
                    image_url: RECIPE_IMAGES[r.name] || "COLOCAR_URL_DA_IMAGEM_AQUI",
                    is_discovered: true
                }));
                await supabase.from('campaign_recipes').insert(recRows);
            }
        } catch (e) {
            console.error("Erro na inicialização da cozinha:", e);
        }
    }

    async function loadIngredients() {
        const { data } = await supabase.from('campaign_ingredients').select('*').eq('campaign_id', campaignId);
        availableIngredients = data || [];
    }

    async function loadRecipes() {
        const { data } = await supabase.from('campaign_recipes').select('*').eq('campaign_id', campaignId);
        knownRecipes = data || [];
    }

    async function loadActiveMeal() {
        const { data } = await supabase.from('campaign_cooking_state').select('*').eq('campaign_id', campaignId).maybeSingle();
        const mealBox = document.querySelector('.cooking-active-meal');
        if (mealBox && data) {
            mealBox.innerHTML = `
                <h4>🍲 Refeição Ativa: ${data.active_meal_name || 'Nenhuma'}</h4>
                <p>${data.active_bonus}</p>
                <div class="meal-bonus-box"><span>Status:</span> Pronto para Aventura</div>
            `;
        }
    }

    function renderCookingUI() {
        const tabCozinha = document.getElementById('tab-cozinha');
        if (!tabCozinha) return;

        tabCozinha.innerHTML = `
            <div class="section-header">
                <h3>Acampamento & Culinária</h3>
                <p>Cozinhe ingredientes raros para obter bônus e recuperar energias.</p>
            </div>

            <div class="cooking-active-meal">
                <h4>🍲 Refeição Ativa</h4>
                <p>Nenhum efeito alimentar ativo no momento.</p>
                <div class="meal-bonus-box"><span>Bônus:</span> N/A</div>
            </div>

            <div class="cooking-layout">
                <!-- INVENTÁRIO & CALDEIRÃO -->
                <div class="dash-panel" style="margin-bottom:0;">
                    <h3>Bolsa de Ingredientes</h3>
                    <p style="font-size: 0.8rem; color: var(--cream-muted); margin-bottom: 10px;">Toque para adicionar ao caldeirão.</p>
                    <div id="cookingBagGrid" class="cooking-bag-grid"></div>
                </div>

                <div class="dash-panel" style="margin-bottom:0; display:flex; flex-direction:column;">
                    <h3>🔥 O Caldeirão</h3>
                    <p style="font-size: 0.8rem; color: var(--cream-muted); margin-bottom: 10px;">Misture os ingredientes e inicie o preparo.</p>
                    
                    <div class="cauldron-container">
                        <div id="cauldronDropZone" class="cauldron-drop-zone">
                            <span class="cauldron-placeholder">O caldeirão está vazio...</span>
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            <button id="clearCauldronBtn" class="secondary-button" style="flex: 1; min-height: 38px;">Limpar</button>
                            <button id="startCookingBtn" class="primary-button" style="flex: 2; min-height: 38px;">Iniciar Preparo</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- LIVRO DE RECEITAS -->
            <div class="dash-panel" style="margin-top: 25px;">
                <h3>📖 Livro de Receitas Conhecidas</h3>
                <p style="font-size: 0.8rem; color: var(--cream-muted); margin-bottom: 15px;">Combinações descobertas pelo grupo.</p>
                <div id="recipeBookGrid" class="recipe-book-grid"></div>
            </div>
        `;

        loadActiveMeal();
        renderBag();
        renderCauldron();
        renderRecipeBook();
        attachCookingEvents();
    }

    function renderBag() {
        const bagGrid = document.getElementById('cookingBagGrid');
        if (!bagGrid) return;
        bagGrid.innerHTML = '';

        availableIngredients.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ingredient-card';
            card.innerHTML = `
                <img src="${item.image_url !== 'COLOCAR_URL_DA_IMAGEM_AQUI' ? item.image_url : ''}" class="ingredient-img" onerror="this.style.display='none'">
                <h5>${item.name}</h5>
                <span>Qtd: ${item.quantity}</span>
            `;
            card.addEventListener('click', () => addToCauldron(item));
            bagGrid.appendChild(card);
        });
    }

    function addToCauldron(item) {
        const existing = availableIngredients.find(i => i.name === item.name);
        if (!existing || existing.quantity <= 0) {
            alert("Você não possui mais unidades deste ingrediente.");
            return;
        }
        existing.quantity--;

        const inCauldron = cauldronIngredients.find(c => c.name === item.name);
        if (inCauldron) {
            inCauldron.count++;
        } else {
            cauldronIngredients.push({ name: item.name, count: 1 });
        }

        renderBag();
        renderCauldron();
    }

    function removeFromCauldron(index) {
        const item = cauldronIngredients[index];
        const original = availableIngredients.find(i => i.name === item.name);
        if (original) original.quantity += item.count;

        cauldronIngredients.splice(index, 1);
        renderBag();
        renderCauldron();
    }

    function renderCauldron() {
        const zone = document.getElementById('cauldronDropZone');
        if (!zone) return;

        if (cauldronIngredients.length === 0) {
            zone.innerHTML = `<span class="cauldron-placeholder">O caldeirão está vazio...</span>`;
            return;
        }

        zone.innerHTML = '';
        cauldronIngredients.forEach((c, idx) => {
            const el = document.createElement('div');
            el.className = 'cauldron-item';
            el.innerHTML = `<span>${c.name} (x${c.count})</span> <button title="Remover">×</button>`;
            el.querySelector('button').addEventListener('click', () => removeFromCauldron(idx));
            zone.appendChild(el);
        });
    }

    function renderRecipeBook() {
        const bookGrid = document.getElementById('recipeBookGrid');
        if (!bookGrid) return;
        bookGrid.innerHTML = '';

        knownRecipes.forEach(rec => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            const ingsText = Object.entries(rec.ingredients_json).map(([k, v]) => `${v}x ${k}`).join(', ');

            card.innerHTML = `
                <img src="${rec.image_url !== 'COLOCAR_URL_DA_IMAGEM_AQUI' ? rec.image_url : ''}" class="recipe-img" onerror="this.style.display='none'">
                <div class="recipe-info">
                    <h5>${rec.name}</h5>
                    <p><b>Ingredientes:</b> ${ingsText}</p>
                    <p><b>Efeito:</b> ${rec.effect_summary}</p>
                    <p style="color:var(--gold); font-size: 0.7rem; margin-top:2px;">⏱️ ${rec.prep_time}</p>
                </div>
            `;
            bookGrid.appendChild(card);
        });
    }

    function attachCookingEvents() {
        document.getElementById('clearCauldronBtn')?.addEventListener('click', () => {
            cauldronIngredients.forEach(c => {
                const orig = availableIngredients.find(i => i.name === c.name);
                if (orig) orig.quantity += c.count;
            });
            cauldronIngredients = [];
            renderBag();
            renderCauldron();
        });

        document.getElementById('startCookingBtn')?.addEventListener('click', async () => {
            if (cauldronIngredients.length === 0) {
                alert("O caldeirão está vazio!");
                return;
            }

            // Transforma o caldeirão em um mapa de contagem
            const currentMix = {};
            cauldronIngredients.forEach(c => currentMix[c.name] = c.count);

            // Verifica se bate com alguma receita conhecida
            let matchedRecipe = null;
            for (const rec of knownRecipes) {
                const reqs = rec.ingredients_json;
                const reqKeys = Object.keys(reqs);
                const mixKeys = Object.keys(currentMix);

                if (reqKeys.length === mixKeys.length && reqKeys.every(k => currentMix[k] === reqs[k])) {
                    matchedRecipe = rec;
                    break;
                }
            }

            let resultName = "Preparo Experimental";
            let resultEffect = "Efeito desconhecido ou mistureba consumida com cautela.";
            let prepTime = "15 minutos";

            if (matchedRecipe) {
                resultName = matchedRecipe.name;
                resultEffect = matchedRecipe.effect_summary;
                prepTime = matchedRecipe.prep_time;
            }

            // Atualiza os ingredientes no banco de dados (consome definitivamente)
            for (const item of availableIngredients) {
                await supabase.from('campaign_ingredients').update({ quantity: item.quantity }).eq('campaign_id', campaignId).eq('name', item.name);
            }

            // Atualiza Refeição Ativa no banco
            await supabase.from('campaign_cooking_state').upsert({
                campaign_id: campaignId,
                active_meal_name: resultName,
                active_bonus: resultEffect,
                updated_at: new Date().toISOString()
            });

            // Registra Log no Histórico
            await supabase.from('campaign_logs').insert({
                campaign_id: campaignId,
                description: `Grupo preparou "${resultName}" (${prepTime} de tempo narrativo). Efeito: ${resultEffect}`,
                log_type: 'system'
            });

            alert(`Preparo concluído! Resultado: ${resultName}\nEfeito: ${resultEffect}\nTempo narrativo: ${prepTime}`);
            
            cauldronIngredients = [];
            await loadActiveMeal();
            renderBag();
            renderCauldron();
        });
    }
})();
