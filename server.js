// server.js — envia server-info automaticamente ao apresentador
const express = require('express');
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// pega IP local (primeiro IPv4 não-interno)
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// ------- suas questões (mantive as mesmas) -------
const questions = [
  { id: 1, question: "Qual dos elementos abaixo pertence ao grupo dos metais alcalinos?", options: ["Hidrogênio", "Sódio", "Carbono", "Oxigênio"], answer: 1 },
  { id: 2, question: "Qual elemento pertence à família dos halogênios?", options: ["Flúor", "Ferro", "Neônio", "Lítio"], answer: 0 },
  { id: 3, question: "Qual elemento possui 1 elétron na camada de valência?", options: ["Hélio", "Lítio", "Oxigênio", "Cálcio"], answer: 1 },
  { id: 4, question: "Os gases nobres possuem qual característica principal?", options: ["São altamente reativos", "Possuem camada de valência completa", "Sempre formam óxidos", "São metais"], answer: 1 },
  { id: 5, question: "Qual grupo é chamado de “alcalinos-terrosos”?", options: ["Grupo 1", "Grupo 2", "Grupo 17", "Grupo 18"], answer: 1 },
  { id: 6, question: "O que indica o número de período de um elemento?", options: ["Quantidade de elétrons na camada de valência", "Número de elétrons total", "Quantidade de camadas eletrônicas do átomo", "Grupo do elemento"], answer: 2 },
  { id: 7, question: "Qual elemento é um gás nobre?", options: ["Oxigênio", "Hélio", "Sódio", "Ferro"], answer: 1 },
  { id: 8, question: "Qual elemento tem 2 elétrons na camada de valência e pertence ao grupo 2?", options: ["Magnésio", "Carbono", "Flúor", "Sódio"], answer: 0 },
  { id: 9, question: "O que indica o número do grupo de um elemento?", options: ["Quantos elétrons possui na camada de valência", "Quantos prótons tem", "Quantas camadas eletrônicas", "Massa atômica"], answer: 0 },
  { id: 10, question: "Qual elemento pertence ao período 2 e é um não-metal?", options: ["Carbono", "Lítio", "Magnésio", "Cálcio"], answer: 0 }
];

// estados
let participants = {}; // { socketId: {name, score, answeredQuestions, times} }
let finishedCount = 0;

// socket.io
io.on('connection', (socket) => {

  // se o apresentador conectar, envia o IP local automaticamente
  socket.on('presenter-join', () => {
    const ip = getLocalIP();
    const origin = `http://${ip}:3000`;
    // envia um evento só para esse socket (apresentador)
    socket.emit('server-info', { origin });
    // também atualiza os contadores já que presenter entrou
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });
  });

  // participante entra (recebe { name })
  socket.on('participant-join', ({ name }) => {
    participants[socket.id] = { name, score: 0, answeredQuestions: {}, times: {} };
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });
  });

  socket.on('presenter-start-quiz', () => {
    finishedCount = 0;
    for (const p of Object.values(participants)) {
      p.score = 0;
      p.answeredQuestions = {};
      p.times = {};
    }
    io.emit('quiz-start', { questions });
  });

  socket.on('answer', ({ questionId, selected, timeTaken }) => {
    const p = participants[socket.id];
    if (!p || p.answeredQuestions[questionId]) return;
    const q = questions.find(q => q.id === questionId);
    if (!q) return;
    if (q.answer === selected) p.score += 1;
    p.answeredQuestions[questionId] = true;
    p.times[questionId] = timeTaken;
  });

  socket.on('participant-finished', () => {
    finishedCount++;
    if (finishedCount === Object.keys(participants).length) {
      const totals = Object.entries(participants).map(([id, p]) => ({
        id,
        totalTime: Object.values(p.times).reduce((a, b) => a + b, 0)
      }));
      totals.sort((a, b) => a.totalTime - b.totalTime);
      if (totals[0]) participants[totals[0].id].score += 2;
      const ranking = Object.values(participants)
        .sort((a, b) => b.score - a.score)
        .map(p => ({ name: p.name, score: p.score }));
      io.emit('updateScores', ranking);
    }
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });
  });

  socket.on('disconnect', () => {
    if (participants[socket.id]) delete participants[socket.id];
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });
  });

});

// rotas
app.get('/', (req, res) => res.sendFile(__dirname + '/participant.html'));
app.get('/presenter', (req, res) => res.sendFile(__dirname + '/presenter.html'));

// iniciar
const PORT = 3000;
server.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`Servidor rodando em http://${ip}:${PORT}`);
  console.log('Acesse http://' + ip + ':' + PORT + '/presenter no navegador do apresentador');
});