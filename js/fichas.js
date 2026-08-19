document.addEventListener("DOMContentLoaded", async () => {
    const lista = document.getElementById("characterList");
    const novo = document.getElementById("newCharacterButton");

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "index.html";
        return;
    }

    async function carregarFichas() {
        lista.innerHTML = "<p>Carregando...</p>";

        const { data, error } = await supabaseClient
            .from("characters")
            .select("id,name,race,class,updated_at")
            .eq("user_id", session.user.id)
            .order("updated_at", { ascending: false });

        if (error) {
            lista.innerHTML = "<p>Erro ao carregar fichas.</p>";
            return;
        }

        if (!data.length) {
            lista.innerHTML = "<p>Nenhuma ficha criada.</p>";
            return;
        }

        lista.innerHTML = "";

        data.forEach(ficha => {
            const card = document.createElement("div");
            card.className = "character-card";

            card.innerHTML = `
                <h3>${ficha.name || "Sem nome"}</h3>
                <p>${ficha.race || "Sem raça"} • ${ficha.class || "Sem classe"}</p>
                <small>${new Date(ficha.updated_at).toLocaleDateString("pt-BR")}</small>
            `;

            card.addEventListener("click", () => {
                localStorage.setItem("aerion_character_id", ficha.id);
                window.location.href = "ficha.html";
            });

            lista.appendChild(card);
        });
    }

    novo.addEventListener("click", () => {
        localStorage.removeItem("aerion_character_id");
        localStorage.removeItem("aerion_character_draft");
        window.location.href = "ficha.html";
    });

    carregarFichas();
});