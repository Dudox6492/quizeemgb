const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname)); // serve presenter.html, participant.html, socket.io.js etc.

// ----------------- QUESTÕES -----------------
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

// ----------------- ESTADOS -----------------
let participants = {}; // { socketId: {name, score} }
let finishedCount = 0;

// ----------------- SOCKET.IO -----------------
io.on('connection', (socket) => {

  // PARTICIPANTE ENTROU
  socket.on('participant-join', ({name}) => {
    participants[socket.id] = { name, score: 0 };
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });
  });

  // APRESENTADOR ENTROU
  socket.on('presenter-join', () => {
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });
  });

  // INICIAR QUIZ
  socket.on('presenter-start-quiz', () => {
    io.emit('quiz-start', { questions });
  });

  // RECEBER RESPOSTA
  socket.on('answer', ({ questionId, selected, timeTaken }) => {
    const p = participants[socket.id];
    if (!p) return;

    const q = questions.find(q=>q.id===questionId);
    if (!q) return;

    // 1 ponto por acerto
    let pts = 0;
    if (q.answer === selected) pts += 1;

    // Bônus de velocidade: 2 pontos se responder em <=5s
    if (q.answer === selected && timeTaken <=5) pts += 2;

    p.score += pts;

    // Atualiza pontuação individual
    socket.emit('updateScore', { score: p.score });
  });//

  // PARTICIPANTE TERMINOU
  socket.on('participant-finished', () => {
    finishedCount++;
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });

    // Se todos terminaram, envia ranking
    if (finishedCount === Object.keys(participants).length) {
      const ranking = Object.values(participants)
        .sort((a,b)=>b.score-a.score)
        .map(p=>({ name: p.name, score: p.score }));
      io.emit('updateScores', ranking);
    }
  });

  // DESCONEXÃO
  socket.on('disconnect', () => {
    if (participants[socket.id]) delete participants[socket.id];
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });
  });

});

// ----------------- ROTAS -----------------
app.get('/', (req,res)=>res.sendFile(__dirname + '/participant.html'));
app.get('/presenter', (req,res)=>res.sendFile(__dirname + '/presenter.html'));

// ----------------- INICIAR SERVIDOR -----------------
const PORT = 3000;
server.listen(PORT, ()=>console.log(`Servidor rodando em http://localhost:${PORT}`));
