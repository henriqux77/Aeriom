/* =========================================================
   AERION — SEGREDOS E CARTÕES PRIVADOS (FASE D)
========================================================= */
(function() {
    "use strict";

    let supabase = null;
    let campaignId = null;
    let currentUser = null;
    let userRole = null;
    let mySecrets = [];

    window.initSecretsSystem = async function(_supabase, _campaignId, _currentUser, _userRole) {
        supabase = _supabase;
        campaignId = _campaignId;
        currentUser = _currentUser;
        userRole = _userRole;

        await loadSecrets();
        setupSecretsRealtime();
        
        if (userRole === 'master') {
            attachMasterSecretEvents();
        }
    };

    async function loadSecrets() {
        const { data, error } = await supabase.from('campaign_secrets').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
        if (!error && data) {
            mySecrets = data;
            renderSecretsList();
        }
    }

    function setupSecretsRealtime() {
        // Escuta inserções ou atualizações. O Supabase RLS já garante que o payload só chegará se o jogador tiver permissão.
        supabase.channel('secrets-events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_secrets', filter: `campaign_id=eq.${campaignId}` }, (payload) => {
                if (payload.eventType === 'INSERT' && userRole === 'player') {
                    showPrivateCardNotification(payload.new);
                }
                loadSecrets(); // Recarrega a lista para atualizar a UI
            })
            .subscribe();
    }

    function renderSecretsList() {
        const container = document.getElementById('mySecretsList');
        if (!container) return;
        
        container.innerHTML = '';
        if (mySecrets.length === 0) {
            container.innerHTML = '<p style="color: var(--cream-muted); font-size: 0.85rem; text-align: center;">Nenhum segredo revelado ainda.</p>';
            return;
        }

        mySecrets.forEach(secret => {
            const el = document.createElement('div');
            el.className = 'secret-card';
            
            let targetsInfo = '';
            if (userRole === 'master') {
                const count = secret.target_users ? secret.target_users.length : 0;
                targetsInfo = `<span style="font-size: 0.7rem; color: #9d5bb5; display: block; margin-top: 5px;">👁️ Revelado para ${count} jogador(es)</span>`;
            }

            el.innerHTML = `
                <div class="secret-header">
                    <span class="secret-icon">🔐</span>
                    <strong>${secret.title}</strong>
                </div>
                <div class="secret-body">${secret.content}</div>
                ${targetsInfo}
            `;
            container.appendChild(el);
        });
    }

    function showPrivateCardNotification(secret) {
        const toast = document.getElementById('privateCardToast');
        if (!toast) return;
        
        document.getElementById('privateCardTitle').textContent = secret.title;
        document.getElementById('privateCardContent').textContent = secret.content;
        
        toast.classList.add('active');
    }

    async function attachMasterSecretEvents() {
        const openBtn = document.getElementById('openCreateSecretBtn');
        const modal = document.getElementById('createSecretModal');
        const closeBtn = document.getElementById('closeCreateSecretModal');
        const form = document.getElementById('createSecretForm');
        
        if (openBtn) openBtn.addEventListener('click', async () => {
            await populateTargetUsers();
            modal.style.display = 'flex';
        });
        
        if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');

        if (form) form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('saveSecretBtn');
            btn.disabled = true;
            btn.textContent = "Criptografando...";

            const title = document.getElementById('secretTitleInput').value.trim() || 'Mensagem Privada';
            const content = document.getElementById('secretContentInput').value.trim();
            
            // Pega os IDs selecionados
            const checkboxes = document.querySelectorAll('.secret-target-cb:checked');
            const targetUsers = Array.from(checkboxes).map(cb => cb.value);

            try {
                await supabase.from('campaign_secrets').insert({
                    campaign_id: campaignId,
                    title: title,
                    content: content,
                    target_users: targetUsers
                });
                modal.style.display = 'none';
                form.reset();
            } catch (err) {
                console.error("Erro ao salvar segredo:", err);
            } finally {
                btn.disabled = false;
                btn.textContent = "Revelar Segredo";
            }
        });

        // Fechar notificação privada (Jogadores)
        document.getElementById('closePrivateCardBtn')?.addEventListener('click', () => {
            document.getElementById('privateCardToast').classList.remove('active');
        });
    }

    async function populateTargetUsers() {
        const container = document.getElementById('secretTargetsContainer');
        if (!container) return;
        
        container.innerHTML = '<p style="color:var(--cream-muted); font-size:10px;">Carregando membros...</p>';
        
        // Busca os personagens atrelados para pegar nome e o user_id do dono
        const { data } = await supabase.from('campaign_characters').select(`user_id, characters(name)`).eq('campaign_id', campaignId);
        
        container.innerHTML = '';
        if(!data || data.length === 0) {
            container.innerHTML = '<p style="color:var(--cream-muted); font-size:10px;">Nenhum jogador na mesa.</p>';
            return;
        }

        data.forEach(link => {
            const charName = link.characters ? link.characters.name : 'Desconhecido';
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '8px';
            label.style.fontSize = '0.85rem';
            label.style.color = 'var(--cream)';
            label.style.cursor = 'pointer';
            
            label.innerHTML = `
                <input type="checkbox" class="secret-target-cb" value="${link.user_id}" style="width: auto;">
                ${charName}
            `;
            container.appendChild(label);
        });
    }

    // Fecha o Toast de jogador
    document.getElementById('closePrivateCardBtn')?.addEventListener('click', () => {
        document.getElementById('privateCardToast').classList.remove('active');
    });

})();
