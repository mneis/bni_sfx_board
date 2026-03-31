document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('soundboard-container');

    // Busca o arquivo JSON com as configurações
    fetch('config.json')
        .then(response => response.json())
        .then(data => renderSoundboard(data))
        .catch(error => console.error('Erro ao carregar o config.json:', error));

    function renderSoundboard(data) {
        data.categorias.forEach(categoria => {
            // Cria a seção da categoria
            const section = document.createElement('section');
            section.className = 'categoria';

            const titulo = document.createElement('h2');
            titulo.textContent = categoria.nome;
            section.appendChild(titulo);

            const grid = document.createElement('div');
            grid.className = 'grid-botoes';

            // Cria os botões para cada som
            categoria.botoes.forEach(botaoConfigs => {
                const btn = document.createElement('button');
                btn.className = 'botao-som';
                btn.textContent = botaoConfigs.nome;
                
                // Usa a cor específica do botão ou a cor padrão da categoria
                btn.style.backgroundColor = botaoConfigs.cor || categoria.cor_padrao || '#555';

                // Prepara o áudio
                const audio = new Audio(botaoConfigs.url);

                btn.addEventListener('click', () => {
                    // Zera o tempo para poder tocar de novo mesmo se já estiver tocando
                    audio.currentTime = 0; 
                    audio.play().catch(e => console.error("Erro ao reproduzir áudio:", e));
                });

                grid.appendChild(btn);
            });

            section.appendChild(grid);
            container.appendChild(section);
        });
    }
});