const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(__dirname));

function lerDados() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw || "[]");
}

function salvarDados(dados) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2));
}

app.get("/api/registros", (req, res) => {
  const { nome, dataIni, dataFim } = req.query;
  let dados = lerDados();

  if (nome) {
    const busca = nome.toLowerCase();
    dados = dados.filter(r => r.nome.toLowerCase().includes(busca));
  }
  if (dataIni) dados = dados.filter(r => r.dataCriacao >= dataIni);
  if (dataFim) dados = dados.filter(r => r.dataCriacao <= dataFim);

  dados.sort((a, b) => (b.dataCriacao || "").localeCompare(a.dataCriacao || ""));
  res.json(dados);
});

app.post("/api/registros", (req, res) => {
  const { nome, dataCriacao, crisp, portal, tipoCardapio, alteracao } = req.body;

  if (!nome || !dataCriacao || !tipoCardapio) {
    return res.status(400).json({ error: "Nome, data de criação e tipo de cardápio são obrigatórios." });
  }

  const dados = lerDados();
  const novo = {
    id: Date.now().toString(),
    nome,
    dataCriacao,
    crisp: crisp || "",
    portal: portal || "",
    tipoCardapio,
    alteracao: alteracao || ""
  };

  dados.push(novo);
  salvarDados(dados);
  res.status(201).json(novo);
});

app.put("/api/registros/:id", (req, res) => {
  const { id } = req.params;
  const dados = lerDados();
  const idx = dados.findIndex(r => r.id === id);

  if (idx === -1) return res.status(404).json({ error: "Registro não encontrado." });

  dados[idx] = { ...dados[idx], ...req.body, id };
  salvarDados(dados);
  res.json(dados[idx]);
});

app.delete("/api/registros/:id", (req, res) => {
  const { id } = req.params;
  let dados = lerDados();
  const existe = dados.some(r => r.id === id);

  if (!existe) return res.status(404).json({ error: "Registro não encontrado." });

  dados = dados.filter(r => r.id !== id);
  salvarDados(dados);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
