// ==UserScript==
// @name         Light Novel Studio - Gemini Worker
// @namespace    http://127.0.0.1:3101/
// @version      0.1.0
// @description  Trabalhador Tampermonkey para processar prompts do Light Novel Studio no Gemini.
// @match        https://gemini.google.com/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @connect      localhost
// ==/UserScript==

(function () {
  'use strict';

  if (window.__lightNovelStudioWorkerStarted) {
    console.info('[Light Novel Studio] Worker ja iniciado nesta aba.');
    return;
  }
  window.__lightNovelStudioWorkerStarted = true;

  const API_BASE = localStorage.getItem('lns.apiBase') || 'http://127.0.0.1:3101';
  const WORKER_KEY = 'lns.workerId';
  const TASK_KEY = 'lns.currentTask';
  const RESULT_KEY = 'lns.pendingResult';
  const LOOP_MS = 10000;
  const RESPONSE_TIMEOUT_MS = 10 * 60 * 1000;
  const RESPONSE_STABLE_MS = 6000;

  let busy = false;
  let loopRunning = false;

  function getWorkerId() {
    const stored = sessionStorage.getItem(WORKER_KEY);
    if (stored) return stored;

    const generated = `gemini_${new Date().toISOString()}`;
    sessionStorage.setItem(WORKER_KEY, generated);
    return generated;
  }

  const workerId = getWorkerId();

  function request(method, path, body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url: `${API_BASE}${path}`,
        headers: { 'Content-Type': 'application/json' },
        data: body ? JSON.stringify(body) : undefined,
        timeout: 30000,
        onload(response) {
          try {
            const payload = response.responseText ? JSON.parse(response.responseText) : {};
            if (response.status >= 200 && response.status < 300) {
              resolve(payload);
            } else {
              reject(new Error(payload.error || `HTTP ${response.status}`));
            }
          } catch (error) {
            reject(error);
          }
        },
        onerror() {
          reject(new Error('Falha de rede ao acessar API local.'));
        },
        ontimeout() {
          reject(new Error('Timeout ao acessar API local.'));
        }
      });
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function readCurrentTask() {
    const raw = sessionStorage.getItem(TASK_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      sessionStorage.removeItem(TASK_KEY);
      return null;
    }
  }

  function writeCurrentTask(task) {
    if (task) {
      sessionStorage.setItem(TASK_KEY, JSON.stringify(task));
    } else {
      sessionStorage.removeItem(TASK_KEY);
    }
  }

  function readPendingResult() {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      sessionStorage.removeItem(RESULT_KEY);
      return null;
    }
  }

  function writePendingResult(result) {
    if (result) {
      sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
    } else {
      sessionStorage.removeItem(RESULT_KEY);
    }
  }

  function findPromptInput() {
    const selectors = [
      'rich-textarea [contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"][aria-label*="prompt" i]',
      '[contenteditable="true"][aria-label*="mensagem" i]',
      '[contenteditable="true"][aria-label*="pergunta" i]',
      'textarea[aria-label*="prompt" i]',
      'textarea'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && isVisible(element)) return element;
    }

    return null;
  }

  function findSendButton() {
    const selectors = [
      'button[aria-label*="send" i]:not([disabled])',
      'button[aria-label*="enviar" i]:not([disabled])',
      'button[aria-label*="submit" i]:not([disabled])',
      'button[type="submit"]:not([disabled])'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && isVisible(element)) return element;
    }

    return null;
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
  }

  function setPromptText(element, text) {
    element.focus();

    if (element.matches('textarea, input')) {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('insertText', false, text);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }

  async function waitForPromptInput(timeoutMs = 60000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const input = findPromptInput();
      if (input) return input;
      await sleep(500);
    }
    throw new Error('Campo de texto do Gemini nao encontrado.');
  }

  async function waitForSendButton(timeoutMs = 15000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const button = findSendButton();
      if (button) return button;
      await sleep(300);
    }
    throw new Error('Botao de envio do Gemini nao encontrado.');
  }

  function responseCandidates() {
    const selectors = [
      'message-content',
      '[data-response-index]',
      '.model-response-text',
      '.markdown',
      '[data-testid*="response" i]'
    ];

    const seen = new Set();
    const nodes = [];
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((node) => {
        if (!seen.has(node) && isVisible(node) && node.innerText && node.innerText.trim().length > 0) {
          seen.add(node);
          nodes.push(node);
        }
      });
    }
    return nodes;
  }

  function latestResponseText() {
    const candidates = responseCandidates();
    if (!candidates.length) return '';
    return candidates[candidates.length - 1].innerText.trim();
  }

  function isGenerating() {
    const selectors = [
      'button[aria-label*="stop" i]',
      'button[aria-label*="parar" i]',
      'mat-progress-spinner',
      '[role="progressbar"]',
      '[aria-label*="loading" i]',
      '[aria-label*="carregando" i]',
      '[aria-label*="digitando" i]'
    ];
    return selectors.some((selector) => {
      const element = document.querySelector(selector);
      return element && isVisible(element);
    });
  }

  function hasFeedbackControls() {
    const selectors = [
      'button[aria-label*="good response" i]',
      'button[aria-label*="bad response" i]',
      'button[aria-label*="like" i]',
      'button[aria-label*="dislike" i]',
      'button[aria-label*="boa resposta" i]',
      'button[aria-label*="resposta ruim" i]'
    ];
    return selectors.some((selector) => {
      const element = document.querySelector(selector);
      return element && isVisible(element);
    });
  }

  async function waitForStableResponse(beforeText) {
    const startedAt = Date.now();
    let lastText = '';
    let stableSince = 0;

    while (Date.now() - startedAt < RESPONSE_TIMEOUT_MS) {
      const text = latestResponseText();
      const changedFromBaseline = text && text !== beforeText;
      const idle = !isGenerating();

      if (changedFromBaseline) {
        if (text !== lastText) {
          lastText = text;
          stableSince = Date.now();
        }

        if (idle && (hasFeedbackControls() || Date.now() - stableSince >= RESPONSE_STABLE_MS)) {
          return text;
        }
      }

      await sleep(1500);
    }

    if (lastText) return lastText;
    throw new Error('Tempo limite aguardando resposta do Gemini.');
  }

  async function sendTaskToGemini(task) {
    const beforeText = latestResponseText();
    const input = await waitForPromptInput();
    setPromptText(input, task.prompt);

    const button = await waitForSendButton();
    button.click();

    return waitForStableResponse(beforeText);
  }

  async function flushPendingResult() {
    const pending = readPendingResult();
    if (!pending) return false;

    await request('POST', '/resultado', pending);
    writePendingResult(null);
    writeCurrentTask(null);
    return true;
  }

  async function executeTask(task) {
    busy = true;
    writeCurrentTask(task);
    let completed = false;
    try {
      await request('POST', '/status', { id: workerId, status: 'trabalhando' });
      const resposta = await sendTaskToGemini(task);
      writePendingResult({
        id: workerId,
        taskId: task.id,
        resposta
      });
      await flushPendingResult();
      completed = true;
    } catch (error) {
      console.error('[Light Novel Studio] Falha na tarefa:', error);
    } finally {
      if (completed) {
        writeCurrentTask(null);
      }
      busy = false;
      await request('POST', '/status', { id: workerId, status: 'livre' }).catch(() => {});
    }
  }

  async function tick() {
    if (loopRunning) return;
    loopRunning = true;

    try {
      const flushed = await flushPendingResult();
      if (flushed) {
        await request('POST', '/status', { id: workerId, status: 'livre' });
      }

      const currentTask = readCurrentTask();
      if (!busy && currentTask) {
        executeTask(currentTask);
        return;
      }

      const status = busy ? 'trabalhando' : 'livre';
      await request('POST', '/status', { id: workerId, status });

      if (!busy) {
        const payload = await request('GET', `/tarefa/${encodeURIComponent(workerId)}`);
        if (payload.ok && payload.tarefa) {
          executeTask(payload.tarefa);
        }
      }
    } catch (error) {
      console.warn('[Light Novel Studio] Loop aguardando API local:', error.message);
    } finally {
      loopRunning = false;
    }
  }

  async function resumeTaskIfNeeded() {
    const task = readCurrentTask();
    if (task) {
      console.info('[Light Novel Studio] Retomando monitoramento da tarefa em andamento:', task.id);
      executeTask(task);
      return;
    }

    await tick();
  }

  window.addEventListener('beforeunload', () => {
    if (busy) {
      const payload = new Blob([JSON.stringify({ id: workerId, status: 'trabalhando' })], {
        type: 'application/json'
      });
      navigator.sendBeacon(`${API_BASE}/status`, payload);
    }
  });

  console.info('[Light Novel Studio] Worker iniciado:', workerId);
  resumeTaskIfNeeded();
  setInterval(tick, LOOP_MS);
})();
