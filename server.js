const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registros (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      username TEXT NOT NULL,
      data_criacao DATE NOT NULL,
      crisp TEXT DEFAULT '',
      portal TEXT DEFAULT '',
      tipo_cardapio TEXT NOT NULL CHECK (tipo_cardapio IN ('manual', 'importavel', 'alteracao')),
      sos BOOLEAN NOT NULL DEFAULT FALSE,
      ism_responsavel TEXT DEFAULT '',
      alteracao TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_registros_user_id ON registros(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_registros_username ON registros(username)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_registros_data_criacao ON registros(data_criacao)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_registros_sos ON registros(sos)`);
}

app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, username, created_at FROM users ORDER BY nome ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { nome, username, password } = req.body;

    if (!nome || !username || !password) {
      return res.status(400).json({ error: "Nome, username e senha são obrigatórios." });
    }

    const usernameNormalizado = String(username).trim().toLowerCase();

    const exists = await pool.query(`SELECT id FROM users WHERE username = $1`, [usernameNormalizado]);
    if (exists.rowCount > 0) {
      return res.status(400).json({ error: "Esse username já está em uso." });
    }

    const result = await pool.query(
      `INSERT INTO users (nome, username, password)
       VALUES ($1, $2, $3)
       RETURNING id, nome, username, created_at`,
      [String(nome).trim(), usernameNormalizado, String(password)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar usuário." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
    }

    const result = await pool.query(
      `SELECT id, nome, username FROM users WHERE username = $1 AND password = $2 LIMIT 1`,
      [String(username).trim().toLowerCase(), String(password)]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao realizar login." });
  }
});

app.get("/api/registros", async (req, res) => {
  try {
    const { nome, dataIni, dataFim } = req.query;
    const conditions = [];
    const values = [];

    if (nome) {
      values.push(`%${String(nome).toLowerCase()}%`);
      conditions.push(`LOWER(nome) LIKE $${values.length}`);
    }

    if (dataIni) {
      values.push(dataIni);
      conditions.push(`data_criacao >= $${values.length}`);
    }

    if (dataFim) {
      values.push(dataFim);
      conditions.push(`data_criacao <= $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT id, user_id, nome, username, data_criacao, crisp, portal, tipo_cardapio, sos, ism_responsavel, alteracao, created_at
       FROM registros
       ${whereClause}
       ORDER BY data_criacao DESC, id DESC`,
      values
    );

    const rows = result.rows.map(r => ({
      id: String(r.id),
      userId: String(r.user_id),
      nome: r.nome,
      username: r.username,
      dataCriacao: r.data_criacao,
      crisp: r.crisp,
      portal: r.portal,
      tipoCardapio: r.tipo_cardapio,
      sos: r.sos,
      ismResponsavel: r.ism_responsavel,
      alteracao: r.alteracao,
      createdAt: r.created_at
    }));

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar registros." });
  }
});

app.post("/api/registros", async (req, res) => {
  try {
    const { nome, username, dataCriacao, crisp, portal, tipoCardapio, sos, ismResponsavel, alteracao } = req.body;

    if (!nome || !username || !dataCriacao || !tipoCardapio) {
      return res.status(400).json({ error: "Nome, username, data de criação e tipo são obrigatórios." });
    }

    if (sos && !ismResponsavel) {
      return res.status(400).json({ error: "Informe o ISM responsável para registros SOS." });
    }

    const userResult = await pool.query(`SELECT id FROM users WHERE username = $1 LIMIT 1`, [String(username).trim().toLowerCase()]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const userId = userResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO registros (user_id, nome, username, data_criacao, crisp, portal, tipo_cardapio, sos, ism_responsavel, alteracao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, user_id, nome, username, data_criacao, crisp, portal, tipo_cardapio, sos, ism_responsavel, alteracao, created_at`,
      [
        userId,
        nome,
        String(username).trim().toLowerCase(),
        dataCriacao,
        crisp || "",
        portal || "",
        tipoCardapio,
        !!sos,
        sos ? (ismResponsavel || "") : "",
        alteracao || ""
      ]
    );

    const r = result.rows[0];
    res.status(201).json({
      id: String(r.id),
      userId: String(r.user_id),
      nome: r.nome,
      username: r.username,
      dataCriacao: r.data_criacao,
      crisp: r.crisp,
      portal: r.portal,
      tipoCardapio: r.tipo_cardapio,
      sos: r.sos,
      ismResponsavel: r.ism_responsavel,
      alteracao: r.alteracao,
      createdAt: r.created_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar registro." });
  }
});

app.put("/api/registros/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, username, dataCriacao, crisp, portal, tipoCardapio, sos, ismResponsavel, alteracao } = req.body;

    if (sos && !ismResponsavel) {
      return res.status(400).json({ error: "Informe o ISM responsável para registros SOS." });
    }

    const existing = await pool.query(`SELECT id FROM registros WHERE id = $1 LIMIT 1`, [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    const result = await pool.query(
      `UPDATE registros
       SET nome = $1,
           username = $2,
           data_criacao = $3,
           crisp = $4,
           portal = $5,
           tipo_cardapio = $6,
           sos = $7,
           ism_responsavel = $8,
           alteracao = $9
       WHERE id = $10
       RETURNING id, user_id, nome, username, data_criacao, crisp, portal, tipo_cardapio, sos, ism_responsavel, alteracao, created_at`,
      [
        nome,
        String(username).trim().toLowerCase(),
        dataCriacao,
        crisp || "",
        portal || "",
        tipoCardapio,
        !!sos,
        sos ? (ismResponsavel || "") : "",
        alteracao || "",
        id
      ]
    );

    const r = result.rows[0];
    res.json({
      id: String(r.id),
      userId: String(r.user_id),
      nome: r.nome,
      username: r.username,
      dataCriacao: r.data_criacao,
      crisp: r.crisp,
      portal: r.portal,
      tipoCardapio: r.tipo_cardapio,
      sos: r.sos,
      ismResponsavel: r.ism_responsavel,
      alteracao: r.alteracao,
      createdAt: r.created_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar registro." });
  }
});

app.delete("/api/registros/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM registros WHERE id = $1 RETURNING id`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

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

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro ao inicializar banco:", error);
    process.exit(1);
  });
