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
  try {
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
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    res.status(500).json({ error: "Erro ao buscar registros" });
  }
});

app.post("/api/registros", (req, res) => {
  try {
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
  } catch (error) {
    console.error("Erro ao criar registro:", error);
    res.status(500).json({ error: "Erro ao criar registro" });
  }
});

app.put("/api/registros/:id", (req, res) => {
  try {
    const { id } = req.params;
    const dados = lerDados();
    const idx = dados.findIndex(r => r.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    dados[idx] = { ...dados[idx], ...req.body, id };
    salvarDados(dados);
    res.json(dados[idx]);
  } catch (error) {
    console.error("Erro ao atualizar registro:", error);
    res.status(500).json({ error: "Erro ao atualizar registro" });
  }
});

app.delete("/api/registros/:id", (req, res) => {
  try {
    const { id } = req.params;
    let dados = lerDados();

    if (!dados.some(r => r.id === id)) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    dados = dados.filter(r => r.id !== id);
    salvarDados(dados);
    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir registro:", error);
    res.status(500).json({ error: "Erro ao excluir registro" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
