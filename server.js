const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(__dirname));

function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], registros: [] }, null, 2), "utf-8");
  }

  const raw = fs.readFileSync(DATA_FILE, "utf-8").trim();

  if (!raw) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], registros: [] }, null, 2), "utf-8");
    return { users: [], registros: [] };
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const migrated = { users: [], registros: parsed };
      fs.writeFileSync(DATA_FILE, JSON.stringify(migrated, null, 2), "utf-8");
      return migrated;
    }

    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      registros: Array.isArray(parsed.registros) ? parsed.registros : []
    };
  } catch (e) {
    const fallback = { users: [], registros: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallback, null, 2), "utf-8");
    return fallback;
  }
}

function lerDados() {
  return initDataFile();
}

function salvarDados(dados) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2), "utf-8");
}

app.get("/api/users", (req, res) => {
  try {
    const dados = lerDados();
    res.json(dados.users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});

app.post("/api/users", (req, res) => {
  try {
    const { nome, username, password } = req.body;

    if (!nome || !username || !password) {
      return res.status(400).json({ error: "Nome, username e senha são obrigatórios." });
    }

    const dados = lerDados();
    const usernameNormalizado = String(username).trim().toLowerCase();

    if (dados.users.some(u => u.username === usernameNormalizado)) {
      return res.status(400).json({ error: "Esse username já está em uso." });
    }

    const novoUsuario = {
      id: Date.now().toString(),
      nome: String(nome).trim(),
      username: usernameNormalizado,
      password: String(password)
    };

    dados.users.push(novoUsuario);
    salvarDados(dados);
    res.status(201).json(novoUsuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar usuário." });
  }
});

app.get("/api/registros", (req, res) => {
  try {
    const { nome, dataIni, dataFim } = req.query;
    let registros = lerDados().registros;

    if (nome) {
      const busca = String(nome).toLowerCase();
      registros = registros.filter(r => (r.nome || "").toLowerCase().includes(busca));
    }

    if (dataIni) registros = registros.filter(r => r.dataCriacao >= dataIni);
    if (dataFim) registros = registros.filter(r => r.dataCriacao <= dataFim);

    registros.sort((a, b) => (b.dataCriacao || "").localeCompare(a.dataCriacao || ""));
    res.json(registros);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar registros." });
  }
});

app.post("/api/registros", (req, res) => {
  try {
    const { nome, username, dataCriacao, crisp, portal, tipoCardapio, alteracao } = req.body;

    if (!nome || !username || !dataCriacao || !tipoCardapio) {
      return res.status(400).json({ error: "Nome, username, data de criação e tipo são obrigatórios." });
    }

    const dados = lerDados();
    const novo = {
      id: Date.now().toString(),
      nome,
      username,
      dataCriacao,
      crisp: crisp || "",
      portal: portal || "",
      tipoCardapio,
      alteracao: alteracao || ""
    };

    dados.registros.push(novo);
    salvarDados(dados);
    res.status(201).json(novo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar registro." });
  }
});

app.put("/api/registros/:id", (req, res) => {
  try {
    const { id } = req.params;
    const dados = lerDados();
    const index = dados.registros.findIndex(r => r.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    dados.registros[index] = { ...dados.registros[index], ...req.body, id };
    salvarDados(dados);
    res.json(dados.registros[index]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar registro." });
  }
});

app.delete("/api/registros/:id", (req, res) => {
  try {
    const { id } = req.params;
    const dados = lerDados();

    if (!dados.registros.some(r => r.id === id)) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    dados.registros = dados.registros.filter(r => r.id !== id);
    salvarDados(dados);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao excluir registro." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Rota da API não encontrada" });
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
