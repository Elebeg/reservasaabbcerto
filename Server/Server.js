const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const db = new sqlite3.Database(':memory:');

// Middleware para analisar o corpo das requisições
app.use(bodyParser.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Define uma rota GET para a API
app.get('/api/reservas', (req, res) => {
    db.all('SELECT * FROM reservas', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ reservas: rows });
    });
});

db.serialize(() => {
    db.run(`CREATE TABLE reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        instalacao TEXT,
        data TEXT,
        hora TEXT,
        horaFinal TEXT
    )`);
});

app.post('/reservar', (req, res) => {
    const { nome, instalacao, data, hora, horaFinal } = req.body;

    // Verifica se a reserva é para daqui a menos de duas horas
    const now = new Date();
    const reservaTime = new Date(data + 'T' + hora + ':00');
    const diffInHours = (reservaTime - now) / 1000 / 60 / 60;
    if (diffInHours < 2) {
        return res.json({ success: false, message: 'Não é possível reservar um horário com menos de duas horas de antecedência' });
    }

    // Verifica o número de reservas ativas do usuário
    const checkQuery = `SELECT COUNT(*) AS count FROM reservas WHERE nome = ? AND data >= ?`;
    db.get(checkQuery, [nome, new Date().toISOString().slice(0, 10)], (err, row) => {
        if (err) {
            return res.json({ success: false, message: 'Erro ao acessar o banco de dados' });
        }
        if (row.count >= 1) {
            return res.json({ success: false, message: 'Usuário já possui reserva ativa' });
        } else {
            // Verifica conflitos de horário na instalação
            const query = `SELECT COUNT(*) AS count FROM reservas WHERE instalacao = ? AND data = ? AND ((hora < ? AND horaFinal > ?) OR (hora < ? AND horaFinal >= ?) OR (hora >= ? AND hora < ?) OR (horaFinal > ? AND horaFinal <= ?))`;
            db.get(query, [instalacao, data, horaFinal, hora, horaFinal, hora, hora, horaFinal, hora, horaFinal], (err, row) => {
                if (err) {
                    return res.json({ success: false, message: 'Erro ao acessar o banco de dados' });
                }
                if (row.count > 0) {
                    return res.json({ success: false, message: 'Horário já reservado' });
                } else {
                    const insert = `INSERT INTO reservas (nome, instalacao, data, hora, horaFinal) VALUES (?, ?, ?, ?, ?)`;
                    db.run(insert, [nome, instalacao, data, hora, horaFinal], function (err) {
                        if (err) {
                            return res.json({ success: false, message: 'Erro ao inserir reserva' });
                        }
                        res.json({ success: true });
                    });
                }
            });
        }
    });
});

// Função para remover reservas passadas
function removePastReservas() {
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10);
    const currentTime = now.toTimeString().slice(0, 8);

    const query = `DELETE FROM reservas WHERE data < ? OR (data = ? AND horaFinal <= ?)`;
    db.run(query, [currentDate, currentDate, currentTime], function (err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`Reservas passadas removidas: ${this.changes}`);
    });
}

// Chama a função removePastReservas a cada 60 segundos (60000 milissegundos)
setInterval(removePastReservas, 60000);

// Inicia o servidor
app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor rodando`);
});
