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
let participants = {}; // { socketId: {name, score, answeredQuestions:{questionId: true} } }
let finishedCount = 0;

// ----------------- SOCKET.IO -----------------
io.on('connection', (socket) => {

  // PARTICIPANTE ENTROU
  socket.on('participant-join', ({name}) => {
    participants[socket.id] = { name, score: 0, answeredQuestions: {} };
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });
  });

  // APRESENTADOR ENTROU
  socket.on('presenter-join', () => {
    io.emit('counts', { connected: Object.keys(participants).length, finished: finishedCount });
  });

  // INICIAR QUIZ
  socket.on('presenter-start-quiz', () => {
    finishedCount = 0; // reseta contador para novo quiz
    Object.values(participants).forEach(p => p.answeredQuestions = {}); // reseta respostas
    io.emit('quiz-start', { questions });
  });

  // RECEBER RESPOSTA
  socket.on('answer', ({ questionId, selected, timeTaken }) => {
    const p = participants[socket.id];
    if (!p) return;
    if (p.answeredQuestions[questionId]) return; // já respondeu, ignora

    const q = questions.find(q=>q.id===question