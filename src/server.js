const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT || 3101);
const OBRAS_DIR = path.resolve(process.cwd(), "obras");
const LIGHT_NOVEL_PROMPT_PATH = path.resolve(
  process.cwd(),
  "public",
  "light_novel_prompt.json",
);
const READER_INDEX_PATH = path.resolve(process.cwd(), "index.html");
const DEBUG_HTML_PATH = path.resolve(process.cwd(), "public", "debug.html");
const TAMPERMONKEY_SCRIPT_PATH = path.resolve(
  process.cwd(),
  "tampermonkey",
  "gemini-worker.user.js",
);
const WORKER_TIMEOUT_MS = 2 * 60 * 1000;

const workers = new Map();
const queue = [];
const results = [];

let taskSequence = 1;
let resultSequence = 1;

app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

function nowIso() {
  return new Date().toISOString();
}

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    const error = new Error(
      `Campo '${fieldName}' deve ser uma string nao vazia.`,
    );
    error.statusCode = 400;
    throw error;
  }
  return value.trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneJson(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function publicWorker(worker) {
  return {
    id: worker.id,
    status: worker.status,
    lastContact: worker.lastContact,
    cooldown: worker.cooldown,
    currentTask: worker.currentTask
      ? {
          id: worker.currentTask.id,
          prompt: worker.currentTask.prompt,
          assignedAt: worker.currentTask.assignedAt,
        }
      : null,
    waitingResultId: worker.waitingResultId || null,
    lastResultAt: worker.lastResultAt || null,
  };
}

function ensureWorker(id) {
  const workerId = requireText(id, "id");
  if (!workers.has(workerId)) {
    workers.set(workerId, {
      id: workerId,
      status: "desconhecido",
      lastContact: null,
      cooldown: 0,
      currentTask: null,
      createdAt: nowIso(),
      waitingResultId: null,
      lastResultAt: null,
    });
  }
  return workers.get(workerId);
}

function randomCooldownCycles() {
  return crypto.randomInt(3, 10);
}

function findResultById(id) {
  return results.find((item) => item.id === id) || null;
}

function isWorkerStale(worker) {
  if (!worker.lastContact) {
    return false;
  }

  const lastContactTime = Date.parse(worker.lastContact);
  return (
    Number.isFinite(lastContactTime) &&
    Date.now() - lastContactTime > WORKER_TIMEOUT_MS
  );
}

function unregisterStaleWorkers() {
  const removed = [];

  for (const [id, worker] of workers.entries()) {
    if (!isWorkerStale(worker)) {
      continue;
    }

    if (worker.currentTask) {
      worker.currentTask.assignedTo = null;
      worker.currentTask.assignedAt = null;
      queue.unshift(worker.currentTask);
    }

    workers.delete(id);
    removed.push(id);
  }

  return removed;
}

function publicWorkerForDebug(worker) {
  const payload = publicWorker(worker);
  payload.active = !isWorkerStale(worker);
  if (!payload.active) {
    payload.status = "inativo";
  }
  return payload;
}

function updateWorkerStatusFromReport(worker, reportedStatus) {
  worker.lastContact = nowIso();

  const waitingResult = worker.waitingResultId
    ? findResultById(worker.waitingResultId)
    : null;
  if (waitingResult && !waitingResult.consumedAt) {
    worker.status = "aguardando_consumo";
    return;
  }

  if (worker.waitingResultId && (!waitingResult || waitingResult.consumedAt)) {
    worker.waitingResultId = null;
  }

  if (worker.cooldown > 0) {
    worker.cooldown -= 1;
    worker.status = worker.cooldown > 0 ? "cooldown" : reportedStatus;
    return;
  }

  worker.status = reportedStatus;
}

function normalizeFileNameFromTitle(title) {
  const normalized = String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${normalized || `obra_${Date.now()}`}.json`;
}

function normalizeProvidedFileName(id) {
  const fileName = requireText(id, "id");
  if (
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName === "." ||
    fileName === ".."
  ) {
    const error = new Error(
      "ID de obra invalido: use apenas o nome do arquivo.",
    );
    error.statusCode = 400;
    throw error;
  }
  return fileName.toLowerCase().endsWith(".json")
    ? fileName
    : `${fileName}.json`;
}

function resolveObraPath(fileName) {
  const target = path.resolve(OBRAS_DIR, fileName);
  const relative = path.relative(OBRAS_DIR, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    const error = new Error("Caminho de obra fora da pasta ./obras.");
    error.statusCode = 400;
    throw error;
  }
  return target;
}

function novelFilesEntryFor(fileName) {
  const baseName = fileName.replace(/\.json$/i, "");
  return {
    json: `obras/${fileName}`,
    cover: `capas/${baseName}.png`,
  };
}

function formatNovelFilesArray(entries) {
  const lines = ["    const NOVEL_FILES = ["];
  entries.forEach((entry, index) => {
    const comma = index === entries.length - 1 ? "" : ",";
    lines.push("      {");
    lines.push(`        json: ${JSON.stringify(entry.json)},`);
    lines.push(`        cover: ${JSON.stringify(entry.cover)}`);
    lines.push(`      }${comma}`);
  });
  lines.push("    ];");
  return lines.join("\n");
}

async function upsertReaderIndexNovel(fileName) {
  let html;
  try {
    html = await fs.readFile(READER_INDEX_PATH, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }

  const pattern =
    /    const NOVEL_FILES = \[\n([\s\S]*?)\n    \];/m;
  const match = html.match(pattern);
  if (!match) {
    return false;
  }

  const entries = [];
  const entryPattern =
    /\{\s*json:\s*"([^"]+)",\s*cover:\s*"([^"]+)"\s*\}/g;
  for (const entryMatch of match[0].matchAll(entryPattern)) {
    entries.push({ json: entryMatch[1], cover: entryMatch[2] });
  }

  const nextEntry = novelFilesEntryFor(fileName);
  if (!entries.some((entry) => entry.json === nextEntry.json)) {
    entries.push(nextEntry);
  }

  const nextHtml = html.replace(pattern, formatNovelFilesArray(entries));
  if (nextHtml === html) {
    return true;
  }

  await fs.writeFile(READER_INDEX_PATH, nextHtml, "utf8");
  return true;
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function summarizeObra(id, data) {
  const input = data && typeof data === "object" ? data.input || {} : {};
  const chapters = Array.isArray(input.chapters)
    ? input.chapters.map((chapter) => ({
        title:
          chapter && typeof chapter === "object" ? chapter.title || null : null,
      }))
    : [];

  return {
    id,
    input: {
      title: input.title || null,
      chapters,
      genres: Array.isArray(input.genres) ? input.genres : [],
      elements: Array.isArray(input.elements) ? input.elements : [],
      additional_notes: Array.isArray(input.additional_notes)
        ? input.additional_notes
        : [],
    },
  };
}

function clearJsonValue(value) {
  if (Array.isArray(value)) {
    return [];
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).map((key) => [key, clearJsonValue(value[key])]),
    );
  }

  if (typeof value === "boolean") {
    return false;
  }

  return "";
}

function emptyChapterLike(chapter) {
  return {
    number: "",
    title: "",
    content: "",
    ...(isPlainObject(chapter) ? clearJsonValue(chapter) : {}),
  };
}

function isCompleteChapter(chapter) {
  return (
    isPlainObject(chapter) &&
    String(chapter.number || "").trim() !== "" &&
    String(chapter.title || "").trim() !== "" &&
    String(chapter.content || "").trim() !== ""
  );
}

function chapterIdentity(chapter) {
  return [
    String(chapter.number || "").trim(),
    String(chapter.title || "").trim(),
    String(chapter.content || "").trim(),
  ].join("\u0000");
}

function sanitizeChapters(chapters) {
  if (!Array.isArray(chapters)) {
    return [];
  }

  const seen = new Set();
  const sanitized = [];
  for (const chapter of chapters) {
    if (!isCompleteChapter(chapter)) {
      continue;
    }

    const key = chapterIdentity(chapter);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    sanitized.push(cloneJson(chapter));
  }

  return sanitized;
}

function appendUniqueChapters(target, candidates) {
  const existingKeys = new Set(target.map(chapterIdentity));

  for (const chapter of sanitizeChapters(candidates)) {
    const key = chapterIdentity(chapter);
    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);
    target.push(chapter);
  }

  return target;
}

function normalizeObraForStorage(payload) {
  const normalized = cloneJson(payload);
  if (!isPlainObject(normalized.input)) {
    normalized.input = {};
  }

  const chapters = sanitizeChapters(normalized.input.chapters);
  const incomingChapter = isCompleteChapter(normalized.input.chapter)
    ? cloneJson(normalized.input.chapter)
    : null;

  if (incomingChapter) {
    const incomingKey = chapterIdentity(incomingChapter);
    if (!chapters.some((chapter) => chapterIdentity(chapter) === incomingKey)) {
      chapters.push(incomingChapter);
    }
  }

  normalized.input.chapters = chapters;
  normalized.input.chapter = emptyChapterLike(normalized.input.chapter);
  return normalized;
}

function hasMeaningfulValue(value) {
  if (value == null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim() !== "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.some(hasMeaningfulValue);
  }

  if (isPlainObject(value)) {
    return Object.values(value).some(hasMeaningfulValue);
  }

  return false;
}

function mergeJsonFields(target, source, currentPath = []) {
  if (!isPlainObject(source)) {
    return target;
  }

  for (const [key, sourceValue] of Object.entries(source)) {
    const nextPath = [...currentPath, key];
    if (
      nextPath.length === 2 &&
      nextPath[0] === "input" &&
      nextPath[1] === "chapters"
    ) {
      continue;
    }

    if (isPlainObject(sourceValue)) {
      if (!isPlainObject(target[key])) {
        target[key] = {};
      }
      mergeJsonFields(target[key], sourceValue, nextPath);
      continue;
    }

    target[key] = cloneJson(sourceValue);
  }

  return target;
}

function prepareObraForPrompt(data) {
  const payload = cloneJson(data);
  if (!isPlainObject(payload.input)) {
    payload.input = {};
  }

  payload.input.chapter = emptyChapterLike(payload.input.chapter);
  delete payload.input.chapters;
  return payload;
}

async function updateObraFile(fileName, payload) {
  const filePath = resolveObraPath(fileName);
  let existing = {};
  let created = false;

  try {
    existing = await readJsonFile(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    created = true;
  }

  const existingChapters = created
    ? []
    : sanitizeChapters(existing && existing.input && existing.input.chapters);
  appendUniqueChapters(
    existingChapters,
    payload && payload.input && payload.input.chapters,
  );
  const incomingChapter = isPlainObject(
    payload && payload.input && payload.input.chapter,
  )
    ? cloneJson(payload.input.chapter)
    : null;
  const updated = mergeJsonFields(
    isPlainObject(existing) ? existing : {},
    payload,
  );

  if (!isPlainObject(updated.input)) {
    updated.input = {};
  }

  updated.input.chapters = existingChapters;
  if (incomingChapter && isCompleteChapter(incomingChapter)) {
    appendUniqueChapters(updated.input.chapters, [incomingChapter]);
  }
  updated.input.chapter = emptyChapterLike(
    incomingChapter || updated.input.chapter,
  );

  await fs.writeFile(filePath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return { created, data: updated };
}

function extractObraPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error("Corpo da obra deve ser um objeto JSON.");
    error.statusCode = 400;
    throw error;
  }

  if (
    body.content &&
    typeof body.content === "object" &&
    !Array.isArray(body.content)
  ) {
    return body.content;
  }

  if (body.obra && typeof body.obra === "object" && !Array.isArray(body.obra)) {
    return body.obra;
  }

  const { id, ...payload } = body;
  return payload;
}

function compactTask(task) {
  return {
    id: task.id,
    prompt: task.prompt,
    workerId: task.workerId || null,
    createdAt: task.createdAt,
    assignedTo: task.assignedTo || null,
    assignedAt: task.assignedAt || null,
  };
}

function compactResult(result) {
  return {
    id: result.id,
    workerId: result.workerId,
    taskId: result.taskId,
    prompt: result.prompt,
    resposta: result.resposta,
    createdAt: result.createdAt,
    consumedAt: result.consumedAt,
  };
}

function enqueuePrompt(req, res, next) {
  try {
    const prompt = requireText(req.body && req.body.prompt, "prompt");
    const requestedWorkerId =
      req.body &&
      (req.body.workerId || req.body.trabalhadorId || req.body.targetWorkerId);
    const task = {
      id: req.body.id
        ? requireText(req.body.id, "id")
        : `task_${taskSequence++}`,
      prompt,
      workerId: requestedWorkerId
        ? requireText(requestedWorkerId, "workerId")
        : null,
      createdAt: nowIso(),
      assignedTo: null,
      assignedAt: null,
    };

    queue.push(task);
    res
      .status(201)
      .json({ ok: true, tarefa: compactTask(task), queueLength: queue.length });
  } catch (error) {
    next(error);
  }
}

async function ensureDataFolders() {
  await fs.mkdir(OBRAS_DIR, { recursive: true });
}

app.get("/", (req, res) => {
  // res.json({
  //   ok: true,
  //   name: "light-novel-studio",
  //   endpoints: [
  //     "GET /debug",
  //     "POST /status",
  //     "GET /tarefa/:id",
  //     "POST /prompt",
  //     "POST /resultado",
  //     "GET /resultados",
  //     "POST /resultado/consumir",
  //     "GET /trabalhadores",
  //     "GET /debug/status",
  //     "GET /tampermonkey/gemini",
  //     "GET /obra",
  //     "GET /obra/:id",
  //     "GET /obras",
  //     "POST /obra",
  //   ],
  // });
  res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
});

app.post("/status", (req, res, next) => {
  try {
    const worker = ensureWorker(req.body && req.body.id);
    const status = requireText(req.body.status, "status");

    updateWorkerStatusFromReport(worker, status);

    res.json({ ok: true, worker: publicWorker(worker) });
  } catch (error) {
    next(error);
  }
});

app.get("/tarefa/:id", (req, res, next) => {
  try {
    const worker = ensureWorker(req.params.id);

    const waitingResult = worker.waitingResultId
      ? findResultById(worker.waitingResultId)
      : null;
    if (waitingResult && !waitingResult.consumedAt) {
      worker.status = "aguardando_consumo";
      res.json({
        ok: false,
        reason: "awaiting_result_consumption",
        worker: publicWorker(worker),
      });
      return;
    }

    if (
      worker.waitingResultId &&
      (!waitingResult || waitingResult.consumedAt)
    ) {
      worker.waitingResultId = null;
    }

    if (worker.cooldown > 0) {
      worker.status = "cooldown";
      res.json({ ok: false, reason: "cooldown", worker: publicWorker(worker) });
      return;
    }

    if (worker.status !== "livre") {
      res.json({
        ok: false,
        reason: "worker_not_free",
        worker: publicWorker(worker),
      });
      return;
    }

    if (worker.currentTask) {
      res.json({
        ok: true,
        reentregue: true,
        tarefa: compactTask(worker.currentTask),
        worker: publicWorker(worker),
      });
      return;
    }

    const taskIndex = queue.findIndex(
      (item) => !item.workerId || item.workerId === worker.id,
    );
    const task = taskIndex >= 0 ? queue.splice(taskIndex, 1)[0] : null;
    if (!task) {
      res.json({
        ok: false,
        reason: queue.length ? "no_task_for_worker" : "empty_queue",
        worker: publicWorker(worker),
      });
      return;
    }

    task.assignedTo = worker.id;
    task.assignedAt = nowIso();
    worker.currentTask = task;
    worker.status = "trabalhando";

    res.json({
      ok: true,
      tarefa: compactTask(task),
      worker: publicWorker(worker),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/prompt", enqueuePrompt);

app.post("/resultado", (req, res, next) => {
  try {
    const worker = ensureWorker(req.body && req.body.id);
    const resposta = requireText(req.body.resposta, "resposta");
    const currentTask = worker.currentTask;
    const taskId = req.body.taskId || (currentTask && currentTask.id) || null;
    const existing = taskId
      ? results.find(
          (item) => item.workerId === worker.id && item.taskId === taskId,
        )
      : null;

    if (existing) {
      worker.currentTask = null;
      worker.waitingResultId = existing.consumedAt ? null : existing.id;
      worker.status = existing.consumedAt
        ? worker.cooldown > 0
          ? "cooldown"
          : "livre"
        : "aguardando_consumo";
      worker.lastResultAt = existing.createdAt;
      res.json({
        ok: true,
        duplicate: true,
        resultado: compactResult(existing),
      });
      return;
    }

    const result = {
      id: `resultado_${resultSequence++}`,
      workerId: worker.id,
      taskId,
      prompt: currentTask ? currentTask.prompt : null,
      resposta,
      createdAt: nowIso(),
      consumedAt: null,
    };

    results.push(result);
    worker.currentTask = null;
    worker.waitingResultId = result.id;
    worker.status = "aguardando_consumo";
    worker.lastResultAt = result.createdAt;

    res.status(201).json({ ok: true, resultado: compactResult(result) });
  } catch (error) {
    next(error);
  }
});

app.get("/resultados", (req, res) => {
  const onlyPending =
    req.query.pendentes === "1" || req.query.pendentes === "true";
  const payload = results
    .filter((result) => !onlyPending || !result.consumedAt)
    .map(compactResult)
    .reverse();
  res.json({ ok: true, resultados: payload });
});

app.post("/resultado/consumir", (req, res, next) => {
  try {
    const resultId = requireText(
      (req.body && (req.body.resultId || req.body.id)) || "",
      "resultId",
    );
    const result = findResultById(resultId);
    if (!result) {
      res.status(404).json({ ok: false, error: "Resultado nao encontrado." });
      return;
    }

    const worker = ensureWorker(result.workerId);
    if (!result.consumedAt) {
      result.consumedAt = nowIso();
      worker.cooldown = randomCooldownCycles();
      if (worker.waitingResultId === result.id) {
        worker.waitingResultId = null;
      }
      worker.status = "cooldown";
    }

    res.json({
      ok: true,
      resultado: compactResult(result),
      worker: publicWorker(worker),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/obras", async (req, res, next) => {
  try {
    await ensureDataFolders();
    const files = await fs.readdir(OBRAS_DIR);
    const obras = [];

    for (const fileName of files
      .filter((file) => file.toLowerCase().endsWith(".json"))
      .sort()) {
      const filePath = resolveObraPath(fileName);
      try {
        const raw = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(raw);
        obras.push(summarizeObra(fileName, data));
      } catch (error) {
        obras.push({ id: fileName, error: error.message });
      }
    }

    res.json({ ok: true, obras });
  } catch (error) {
    next(error);
  }
});

app.get("/obra", async (req, res, next) => {
  try {
    const payload = await readJsonFile(LIGHT_NOVEL_PROMPT_PATH);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get("/obra/:id", async (req, res, next) => {
  try {
    const fileName = normalizeProvidedFileName(req.params.id);
    const filePath = resolveObraPath(fileName);
    const payload = await readJsonFile(filePath);
    res.json(prepareObraForPrompt(payload));
  } catch (error) {
    if (error.code === "ENOENT") {
      error.statusCode = 404;
      error.message = "Obra nao encontrada.";
    }
    next(error);
  }
});

app.post("/obra", async (req, res, next) => {
  try {
    await ensureDataFolders();
    const payload = extractObraPayload(req.body);
    const providedId =
      req.body && typeof req.body.id === "string" && req.body.id.trim() !== "";
    const fileName = providedId
      ? normalizeProvidedFileName(req.body.id)
      : normalizeFileNameFromTitle(
          payload && payload.input && payload.input.title,
        );

    if (providedId) {
      const result = await updateObraFile(fileName, payload);
      if (result.created) {
        await upsertReaderIndexNovel(fileName);
      }
      res.status(result.created ? 201 : 200).json({
        ok: true,
        id: fileName,
        obra: summarizeObra(fileName, result.data),
      });
      return;
    }

    const filePath = resolveObraPath(fileName);
    const storedPayload = normalizeObraForStorage(payload);
    await fs.writeFile(
      filePath,
      `${JSON.stringify(storedPayload, null, 2)}\n`,
      "utf8",
    );
    await upsertReaderIndexNovel(fileName);
    res.status(201).json({
      ok: true,
      id: fileName,
      obra: summarizeObra(fileName, storedPayload),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/trabalhadores", (req, res) => {
  const removedWorkers = unregisterStaleWorkers();

  res.json({
    ok: true,
    removedWorkers,
    trabalhadores: Array.from(workers.values()).map(publicWorker),
  });
});

app.get("/debug/status", (req, res) => {
  res.json({
    ok: true,
    workers: Array.from(workers.values()).map(publicWorkerForDebug),
    queue: queue.map(compactTask),
    resultados: results.map(compactResult).reverse(),
  });
});

app.get("/debug", (req, res) => {
  res.sendFile(DEBUG_HTML_PATH);
});

app.get("/tampermonkey/gemini", async (req, res, next) => {
  try {
    const script = await fs.readFile(TAMPERMONKEY_SCRIPT_PATH, "utf8");
    res.type("text/plain; charset=utf-8").send(script);
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Rota nao encontrada." });
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    ok: false,
    error: error.message || "Erro interno.",
  });
});

ensureDataFolders()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Light Novel Studio API em http://127.0.0.1:${PORT}`);
      console.log(`Debug: http://127.0.0.1:${PORT}/debug`);

      // const { default: open } = await import('open');
      // await open('http://localhost:3333', { app: { name: open.apps.CHROME } });
    });
  })
  .catch((error) => {
    console.error("Falha ao preparar pastas de dados:", error);
    process.exit(1);
  });
