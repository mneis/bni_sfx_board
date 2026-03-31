document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('soundboard-container');

    fetch('config.json')
        .then(response => response.json())
        .then(data => renderSoundboard(data))
        .catch(error => console.error('Erro ao carregar o config.json:', error));

    function renderSoundboard(data) {
        data.categorias.forEach(categoria => {
            const section = document.createElement('section');
            section.className = 'categoria';

            const titulo = document.createElement('h2');
            titulo.textContent = categoria.nome;
            section.appendChild(titulo);

            const grid = document.createElement('div');
            grid.className = 'grid-botoes';

            categoria.botoes.forEach(botaoConfigs => {
                const btn = document.createElement('button');
                btn.className = 'botao-som';
                btn.textContent = botaoConfigs.nome;
                btn.style.backgroundColor = botaoConfigs.cor || categoria.cor_padrao || '#555';

                const audio = new Audio(botaoConfigs.url);

                // Quando o áudio terminar de tocar naturalmente, remove a animação
                audio.addEventListener('ended', () => {
                    btn.classList.remove('botao-tocando');
                });

                btn.addEventListener('click', () => {
                    // Verifica se o áudio está tocando (não está pausado e já começou)
                    if (!audio.paused && audio.currentTime > 0) {
                        // Se está tocando: Pausa, zera o tempo e remove o efeito visual
                        audio.pause();
                        audio.currentTime = 0;
                        btn.classList.remove('botao-tocando');
                    } else {
                        // Se não está tocando: Zera o tempo, dá o play e adiciona o efeito visual
                        audio.currentTime = 0;
                        audio.play().catch(e => console.error("Erro ao reproduzir áudio:", e));
                        btn.classList.add('botao-tocando');
                    }
                });

                grid.appendChild(btn);
            });

            section.appendChild(grid);
            container.appendChild(section);
        });
    }
});