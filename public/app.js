// Função para carregar e exibir as reservas na página de reservas
function loadReservas() {
    console.log('Carregando reservas...');
    const reservasContainer = document.querySelector('#reservasContainer');
    if (!reservasContainer) {
        console.error('Elemento reservasContainer não encontrado.');
        return;
    }

    fetch('/api/reservas')
        .then(response => {
            console.log('Resposta recebida:', response);
            return response.json();
        })
        .then(data => {
            console.log('Dados recebidos:', data);
            reservasContainer.innerHTML = ''; // Limpa o conteúdo existente

            // Agrupa as reservas por instalação
            const reservasPorInstalacao = data.reservas.reduce((grupos, reserva) => {
                (grupos[reserva.instalacao] = grupos[reserva.instalacao] || []).push(reserva);
                return grupos;
            }, {});

            // Cria uma tabela para cada instalação
            Object.entries(reservasPorInstalacao).forEach(([instalacao, reservas]) => {
                const titulo = document.createElement('h2');
                titulo.textContent = instalacao;
                reservasContainer.appendChild(titulo);

                const table = document.createElement('table');
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Data</th>
                            <th>Horário</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reservas.map(reserva => {
                            const now = new Date();
                            const reservaDate = new Date(reserva.data + 'T' + reserva.horaFinal + ':00');
                            if (now.getTime() < reservaDate.getTime()) {
                                return `
                                    <tr>
                                        <td>${reserva.nome}</td>
                                        <td>${reserva.data}</td>
                                        <td>${reserva.hora} - ${reserva.horaFinal}</td>
                                    </tr>
                                `;
                            } else {
                                return '';
                            }
                        }).join('')}
                    </tbody>
                `;
                reservasContainer.appendChild(table);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar reservas:', error);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname === '/reservas.html') {
        loadReservas();
    }
});

// Event listener para o formulário de reserva
document.getElementById('reservaForm')?.addEventListener('submit', function (event) {
    event.preventDefault();

    const nome = document.getElementById('nome').value;
    const instalacao = document.getElementById('instalacao').value;
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;
    const horaFinal = document.getElementById('horaFinal').value;

    fetch('/reservar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nome, instalacao, data, hora, horaFinal })
    })
    .then(response => response.json())
    .then(responseData => {
        if (responseData.success) {
            alert(`Reserva realizada com sucesso!\n\nInstalação: ${instalacao}\nData: ${data}\nHorário: ${hora} - ${horaFinal}`);
            loadReservas();
        } else {
            alert('Erro na reserva: ' + responseData.message);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro na reserva');
    });
});

document.getElementById('hora').addEventListener('change', function () {
    const hora = this.value;
    if (hora) {
        const horaFinal = new Date(`1970-01-01T${hora}:00Z`);
        horaFinal.setHours(horaFinal.getHours() + 1);
        document.getElementById('horaFinal').value = horaFinal.toISOString().substr(11, 5);
    }
});

document.getElementById('year').textContent = new Date().getFullYear();
