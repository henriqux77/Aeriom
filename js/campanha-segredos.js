/* =========================================================
   AERIOM — MÓDULO DE SEGREDOS (js/campanha-segredos.js)
   Fase 5: Informação Privada Segura e Desacoplada
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;
    let currentUser = null;
    let userRole = null;
    let availableTargets = [];

    // Elementos UI
    const createSecretModal = document.getElementById('createSecretModal');
    const privateCardToast = document.getElementById('privateCardToast');
    const mySecretsList = document.getElementById('mySecretsList');
    
    // =========================================================
    // 1. UTILITÁRIOS SEGUROS (Anti-XSS)
    // =========================================================
    function createSafeElement(tag, className, text = null) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== null && text !== undefined) el.textContent = text;
        return el;
    }

    // =========================================================
    // 2. INICIALIZAÇÃO
    // =========================================================
    window.initSecretsSystem = async function(_supabase, _campaignId, _currentUser, _userRole) {
        supabase = _supabase;
        campaignId = _campaignId;
        currentUser = _currentUser;
        userRole = _userRole;

        await loadSecrets();
        
        if (userRole === 'master') {
            await loadPotentialTargets();
        }

        attachSecretsEvents();
        setupSecretsRealtime();
    };

    // =========================================================
    // 3. CARREGAMENTO E RENDERIZAÇÃO
    // =========================================================
    async function loadSecrets() {
        if (!mySecretsList) return;

        try {
            // Se for mestre, vê todos os segredos que enviou. Se for jogador, vê apenas os seus.
            let query = supabase.from('campaign_secrets').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
            
            if (userRole !== 'master') {
                query = query.contains('target_users', [currentUser.id]);
            }

            const { data, error } = await query;
            if (error) throw error;

            mySecretsList.innerHTML = '';

            if (!data || data.length === 0) {
                mySecretsList.appendChild(createSafeElement('p', 'text-muted', 'Não existem segredos revelados para ti.'));
                return;
            }

            data.forEach(secret => {
                const card = createSafeElement('div', 'secret-card');
                
                const header = createSafeElement('div', 'secret-header');
                header.appendChild(createSafeElement('span', '', '🔐'));
                header.appendChild(createSafeElement('span', '', secret.title));
                
                const body = createSafeElement('div', 'secret-body', secret.content);
                
                card.appendChild(header);
                card.appendChild(body);
                
                // Se for mestre, mostra para quem foi enviado de forma segura
                if (userRole === 'master' && secret.target_names) {
                    const targetsInfo = createSafeElement('div', 'text-muted mt-4');
                    targetsInfo.style.fontSize = '0.75rem';
                    targetsInfo.textContent = `Alvos: ${secret.target_names.join(', ')}`;
                    card.appendChild(targetsInfo);
                }

                mySecretsList.appendChild(card);
            });

        } catch (err) {
            console.error("Erro ao carregar segredos:", err);
            mySecretsList.innerHTML = '';
            mySecretsList.appendChild(createSafeElement('p', 'text-muted', 'Erro ao decifrar os segredos.'));
        }
    }

    async function loadPotentialTargets() {
        const container = document.getElementById('secretTargetsContainer');
        if (!container) return;

        try {
            const { data, error } = await supabase
                .from('campaign_characters')
                .select('user_id, characters(name)')
                .eq('campaign_id', campaignId);
            
            if (error) throw error;
            
            availableTargets = data || [];
            container.innerHTML = '';

            if (availableTargets.length === 0) {
                container.appendChild(createSafeElement('p', 'text-muted', 'Nenhum jogador disponível.'));
                return;
            }

            availableTargets.forEach(target => {
                const charName = target.characters?.name || 'Desconhecido';
                
                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.gap = '8px';
                label.style.marginBottom = '6px';
                label.style.cursor = 'pointer';
                label.style.color = 'var(--text-primary)';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = target.user_id;
                checkbox.dataset.name = charName;
                checkbox.className = 'secret-target-cb';

                const nameSpan = createSafeElement('span', '', charName);

                label.appendChild(checkbox);
                label.appendChild(nameSpan);
                container.appendChild(label);
            });

        } catch (err) {
            console.error("Erro ao carregar alvos:", err);
        }
    }

    // =========================================================
    // 4. EVENTOS E REALTIME
    // =========================================================
    function attachSecretsEvents() {
        // Mestre: Abrir Modal de Criação
        document.getElementById('openCreateSecretBtn')?.addEventListener('click', () => {
            if (createSecretModal) createSecretModal.classList.add('active');
        });

        // Formulário de Criação
        document.getElementById('createSecretForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('saveSecretBtn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'A Enviar...';
            }

            const title = document.getElementById('secretTitleInput').value.trim();
            const content = document.getElementById('secretContentInput').value.trim();
            
            const selectedCBs = Array.from(document.querySelectorAll('.secret-target-cb:checked'));
            const targetUsers = selectedCBs.map(cb => cb.value);
            const targetNames = selectedCBs.map(cb => cb.dataset.name);

            if (targetUsers.length === 0) {
                alert("Selecione pelo menos um aventureiro.");
                if (btn) { btn.disabled = false; btn.textContent = 'Enviar Segredo'; }
                return;
            }

            try {
                const { error } = await supabase.from('campaign_secrets').insert({
                    campaign_id: campaignId,
                    title: title,
                    content: content,
                    target_users: targetUsers,
                    target_names: targetNames
                });

                if (error) throw error;
                
                if (createSecretModal) createSecretModal.classList.remove('active');
                e.target.reset();
                await loadSecrets();
                
                if (window.generateLog) window.generateLog(`O Mestre partilhou um segredo com ${targetNames.join(', ')}.`, 'system');

            } catch (err) {
                console.error("Erro ao enviar segredo:", err);
                alert("Falha ao enviar segredo.");
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Enviar Segredo'; }
            }
        });

        // Jogador: Fechar Notificação (Toast) de Segredo Recebido
        document.getElementById('closePrivateCardBtn')?.addEventListener('click', () => {
            if (privateCardToast) privateCardToast.classList.remove('active');
        });
    }

    function setupSecretsRealtime() {
        supabase.channel('campaign-secrets')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_secrets', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                const newSecret = payload.new;
                
                // Se for Mestre, atualiza a lista dele.
                if (userRole === 'master') {
                    loadSecrets();
                    return;
                }
                
                // Se for Jogador, verifica se é um dos alvos
                if (newSecret.target_users && newSecret.target_users.includes(currentUser.id)) {
                    loadSecrets(); // Atualiza a lista na aba
                    showSecretToast(newSecret.title, newSecret.content); // Mostra o alerta imersivo
                }
            })
            .subscribe();
    }

    // Mostra o Toast Imersivo (Anti-XSS garantido via textContent)
    function showSecretToast(title, content) {
        if (!privateCardToast) return;
        
        const titleEl = document.getElementById('privateCardTitle');
        const contentEl = document.getElementById('privateCardContent');
        
        if (titleEl) titleEl.textContent = title;
        if (contentEl) contentEl.textContent = content;
        
        privateCardToast.classList.add('active');
    }

})();