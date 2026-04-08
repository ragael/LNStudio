// ==UserScript==
// @name         Gemini Light Novels
// @namespace    http://tampermonkey.net/
// @version      2026-04-08
// @description  Launcher para criar e continuar light novels no Gemini
// @author       You
// @match        https://gemini.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const ROOT_ID = 'ln-studio-root';
    const OVERLAY_ID = 'ln-studio-overlay';
    const TOGGLE_ID = 'ln-studio-toggle';
    const PANEL_ID = 'ln-studio-panel';
    const STATUS_ID = 'ln-studio-status';
    const LIST_VIEW_ID = 'ln-studio-list';
    const CREATE_VIEW_ID = 'ln-studio-create';
    const NOVEL_LIST_ID = 'ln-studio-novels';
    const FORM_ID = 'ln-studio-form';
    const OPEN_CLASS = 'ln-open';
    const HIDDEN_CLASS = 'ln-hidden';
    const ERROR_CLASS = 'ln-error';
    const DB_NAME = 'ln-studio-db';
    const DB_VERSION = 1;
    const NOVELS_STORE = 'novels';
    const CHAPTERS_STORE = 'chapters';
    const POLL_MS = 900;
    const GENERATION_TIMEOUT_MS = 8 * 60 * 1000;

    const GENRE_OPTIONS = ['Isekai', 'Fantasia', 'Acao', 'Aventura', 'Romance', 'Comedia', 'Drama', 'Slice of Life', 'Misterio', 'Escolar', 'Sobrenatural', 'Construcao de Imperio'];
    const ELEMENT_OPTIONS = ['academia', 'sistema', 'magia runica', 'industrializacao', 'crafting', 'masmorra', 'monstros', 'politica', 'tecnologia arcana', 'guildas', 'torneio', 'faccao rival', 'protagonista pragmatico', 'evolucao constante'];
    const PROMPT_TEMPLATE = {"instructions":{"role":"Voce e um autor especialista em light novels japonesas com total liberdade criativa. Sua missao e gerar capitulos de uma historia serializada original com base nos dados de input fornecidos neste mesmo JSON.","mode_rule":{"description":"O modo de operacao e determinado pelo campo input.last_chapter_number","modes":{"creation":{"condition":"input.last_chapter_number === 0","behavior":"MODO CRIACAO: Crie titulo, mundo, personagens e escreva o Capitulo 1 do zero. O campo input.continuity estara vazio, ignore-o e construa tudo com base em input.genres, input.elements e input.additional_notes."},"continuation":{"condition":"input.last_chapter_number > 0","behavior":"MODO CONTINUIDADE: Use input.continuity como estado canonico e absoluto da historia. Escreva o capitulo de numero input.last_chapter_number + 1. Nunca contradiga o que esta em input.continuity."}}},"writing_guidelines":["Narrativa em primeira pessoa","Entre 1000 e 2000 palavras por capitulo","Abrace os tropos classicos de light novels, mas execute-os de forma interessante","Descreva magia, combates e cenarios com impacto sensorial e emocional","De vozes e personalidades distintas a cada personagem nos dialogos","Avance a narrativa de forma significativa a cada capitulo"],"critical_rules":["Retorne APENAS o JSON. Sem texto antes ou depois.","Use aspas duplas em todo o JSON.","Para quebras de linha no conteudo do capitulo, use \\n.","Preencha todos os campos do input na resposta.","input.last_chapter_number deve conter o numero do capitulo que voce acabou de escrever.","input.title deve ser sempre preenchido: criado em MODO CRIACAO, repetido em MODO CONTINUIDADE.","input.continuity deve refletir o estado da historia APOS o capitulo gerado.","Em MODO CRIACAO: crie um titulo criativo e original baseado nos generos e elementos fornecidos.","Em MODO CONTINUIDADE: mantenha consistencia absoluta com input.continuity recebido.","Certifique-se de que o JSON retornado e valido."],"output_rule":"Retorne um JSON com a mesma estrutura deste documento, com o bloco instructions preservado e o bloco input preenchido com o conteudo gerado."},"input":{"last_chapter_number":0,"title":"","genres":[],"elements":[],"additional_notes":[],"style":{"narrative":"Primeira pessoa","chapter_length":"1000 a 2000 palavras","style_notes":""},"chapter":{"number":"","title":"","content":"","ai_provider":"","model":"","plan":"","generated_at":""},"continuity":{"summary":"","protagonist":{"name":"","age":"","level_power":"","abilities":[],"current_goal":""},"secondary_characters":[],"worldbuilding":{"current_location":"","world_rules":"","organizations":[]},"power_system":{"mechanics":"","progression":""},"plot_threads":{"main":"","secondary":[]},"next_chapter_suggestions":[]}}};

    const refs = {};
    const state = { open: false, busy: false, batch: null, coverNovelId: null };
    let dbPromise = null;

    GM_addStyle(`
        :root{--ln-panel-width:min(380px,96vw);--ln-toggle-size:58px}
        #${OVERLAY_ID}{position:fixed;inset:0;background:rgba(2,6,23,.38);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .18s;z-index:2147483644}
        #${OVERLAY_ID}.${OPEN_CLASS}{opacity:1;pointer-events:auto}
        #${ROOT_ID}{position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:"Segoe UI",system-ui,sans-serif}
        #${TOGGLE_ID}{position:fixed;right:18px;bottom:18px;width:var(--ln-toggle-size);height:var(--ln-toggle-size);border:1px solid rgba(34,211,238,.24);border-radius:18px;background:linear-gradient(145deg,#07111f,#0f172a 54%,#111827);color:#dbeafe;cursor:pointer;box-shadow:0 0 0 1px rgba(34,211,238,.06),0 16px 40px rgba(2,6,23,.46);pointer-events:auto;display:grid;place-items:center;transition:right .22s ease,box-shadow .18s ease,border-color .18s ease;z-index:2147483647}
        #${TOGGLE_ID}:hover{box-shadow:0 0 0 1px rgba(34,211,238,.16),0 18px 44px rgba(2,6,23,.52);border-color:rgba(34,211,238,.34)}
        #${TOGGLE_ID} .i{position:absolute;font-size:26px;transition:opacity .16s,transform .16s}
        #${TOGGLE_ID} .o{opacity:0;transform:translateY(2px) scale(.92)}
        #${TOGGLE_ID}:hover .c{opacity:0;transform:translateY(-2px) scale(.92)}
        #${TOGGLE_ID}:hover .o{opacity:1;transform:translateY(0) scale(1)}
        #${TOGGLE_ID}.${OPEN_CLASS}{right:calc(var(--ln-panel-width) - var(--ln-toggle-size) - 10px)}
        #${PANEL_ID}{position:fixed;top:0;right:0;width:var(--ln-panel-width);height:100vh;border-radius:24px 0 0 24px;background:linear-gradient(180deg,#020617 0%,#081120 38%,#0b1220 100%);color:#e2e8f0;box-shadow:0 22px 64px rgba(2,6,23,.6);border-left:1px solid rgba(34,211,238,.14);opacity:1;transform:translateX(100%);transition:transform .22s ease;pointer-events:none;display:grid;grid-template-rows:auto auto 1fr;overflow:hidden}
        #${PANEL_ID}.${OPEN_CLASS}{transform:translateX(0);pointer-events:auto}
        .ln-head{padding:16px 16px 10px;display:flex;justify-content:space-between;gap:12px}
        .ln-head h1{margin:0;font-size:20px;font-weight:800;letter-spacing:-.03em}
        .ln-head p{margin:4px 0 0;color:#94a3b8;font-size:12px}
        .ln-close{width:38px;height:38px;border:1px solid rgba(34,211,238,.16);border-radius:12px;background:rgba(15,23,42,.92);color:#e2e8f0;cursor:pointer}
        #${STATUS_ID}{margin:0 16px 10px;min-height:18px;padding:8px 10px;border-radius:12px;background:rgba(15,23,42,.86);color:#cbd5e1;font-size:12px;line-height:1.35;border:1px solid rgba(34,211,238,.12)}
        #${STATUS_ID}.${ERROR_CLASS}{color:#fecaca;background:rgba(69,10,10,.58);border-color:rgba(248,113,113,.34)}
        .ln-body{min-height:0;padding:0 16px 16px;display:flex;flex-direction:column;gap:12px}
        .ln-view{min-height:0;display:flex;flex-direction:column;gap:12px}
        .${HIDDEN_CLASS}{display:none!important}
        .ln-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .ln-label{margin:0;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#67e8f9;font-weight:700}
        .ln-scroll{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;padding-right:4px}
        .ln-library-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .ln-card,.ln-section,.ln-empty{padding:12px;border-radius:18px;background:linear-gradient(180deg,rgba(15,23,42,.92),rgba(9,16,31,.92));border:1px solid rgba(56,189,248,.14)}
        .ln-card{display:grid;grid-template-columns:92px minmax(0,1fr);gap:10px;align-items:start}
        .ln-cover{width:100%;aspect-ratio:3/4;border-radius:14px;overflow:hidden;border:1px solid rgba(56,189,248,.14);background:linear-gradient(180deg,rgba(8,15,30,.98),rgba(15,23,42,.9));display:grid;place-items:center;cursor:pointer;align-self:start}
        .ln-cover img{width:100%;height:100%;object-fit:cover;display:block}
        .ln-cover-placeholder{display:flex;flex-direction:column;align-items:center;gap:6px;color:#94a3b8;font-size:11px;line-height:1.25;text-align:center;padding:10px 8px}
        .ln-card h3{margin:0;font-size:15px;font-weight:800;line-height:1.3;overflow-wrap:anywhere}
        .ln-title{margin:0;font-size:15px;font-weight:800;line-height:1.3;overflow-wrap:anywhere}
        .ln-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;color:#94a3b8;font-size:12px}
        .ln-chip{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:rgba(8,145,178,.14);color:#a5f3fc;font-size:11px;font-weight:700;border:1px solid rgba(34,211,238,.18)}
        .ln-log{grid-column:1/-1;max-height:108px;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:8px 9px;border-radius:14px;background:rgba(2,6,23,.56);border:1px solid rgba(34,211,238,.08)}
        .ln-log-entry{padding:7px 8px;border-radius:10px;background:rgba(15,23,42,.72);border:1px solid transparent;color:#94a3b8;font-size:11px;line-height:1.35}
        .ln-log-entry.current{color:#e2e8f0;border-color:rgba(34,211,238,.2);background:rgba(8,47,73,.38)}
        .ln-log-entry.error{color:#fecaca;border-color:rgba(248,113,113,.3);background:rgba(69,10,10,.4)}
        .ln-log-entry.done{color:#cbd5e1}
        .ln-log-entry.pending{opacity:.55}
        .ln-card-actions{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,92px) 1fr auto;gap:8px;align-items:center}
        .ln-count{display:flex;align-items:center;gap:6px;color:#cbd5e1;font-size:12px}
        .ln-count input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:12px;border:1px solid rgba(34,211,238,.12);background:rgba(2,6,23,.72);color:#e2e8f0;font-size:13px}
        .ln-stop{border-color:rgba(250,204,21,.18);color:#fde68a}
        .ln-section h3{margin:0 0 4px;font-size:13px;color:#e2e8f0}
        .ln-section p{margin:0;color:#94a3b8;font-size:12px;line-height:1.4}
        .ln-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .ln-choice{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:14px;background:rgba(15,23,42,.88);border:1px solid rgba(34,211,238,.1);cursor:pointer;font-size:12px;font-weight:600;color:#dbeafe}
        .ln-choice input{margin:0}
        .ln-text{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:14px;border:1px solid rgba(34,211,238,.12);background:rgba(2,6,23,.72);color:#e2e8f0;font-size:13px;line-height:1.45;font-family:inherit;min-height:110px;resize:vertical}
        .ln-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .ln-muted{color:#94a3b8;font-size:12px;line-height:1.45}
        .ln-b1,.ln-b2,.ln-b3{border:0;border-radius:16px;cursor:pointer;font-weight:700}
        .ln-b1{padding:11px 14px;background:linear-gradient(145deg,#0f172a,#1d4ed8 55%,#0891b2);color:#f8fafc;box-shadow:0 0 0 1px rgba(34,211,238,.12),0 10px 24px rgba(13,148,136,.12)}
        .ln-b2{padding:9px 12px;background:rgba(12,20,37,.96);color:#dbeafe;border:1px solid rgba(56,189,248,.18)}
        .ln-b3{padding:9px 12px;background:rgba(15,23,42,.78);color:#cbd5e1;border:1px solid rgba(148,163,184,.16)}
        .ln-image-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.82);backdrop-filter:blur(8px);z-index:2147483648;pointer-events:auto}
        .ln-image-overlay.open{display:flex}
        .ln-image-viewer{width:min(92vw,980px);max-height:92vh;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:12px;pointer-events:auto}
        .ln-image-stage{min-height:0;display:grid;place-items:center;border-radius:18px;background:rgba(2,6,23,.72);border:1px solid rgba(56,189,248,.12);overflow:hidden}
        .ln-image-stage img{max-width:100%;max-height:80vh;object-fit:contain;display:block}
        .ln-image-toolbar{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
        button:disabled{cursor:not-allowed;opacity:.56}
        #${TOGGLE_ID}.${OPEN_CLASS}{display:none}
        @media (max-width:720px){:root{--ln-panel-width:100vw}#${PANEL_ID}{border-radius:0}#${TOGGLE_ID}{right:12px;bottom:12px}#${TOGGLE_ID}.${OPEN_CLASS}{right:12px}.ln-grid{grid-template-columns:1fr}.ln-card{grid-template-columns:78px minmax(0,1fr)}.ln-card-actions{grid-template-columns:minmax(0,76px) 1fr auto}}
    `);

    function delay(ms) { return new Promise((resolve) => window.setTimeout(resolve, ms)); }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function uid(prefix) { return window.crypto && crypto.randomUUID ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
    function esc(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function reqToPromise(req) { return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error || new Error('IndexedDB error')); }); }
    function rootEl() { return document.getElementById(ROOT_ID); }
    function visible(el) { if (!el) return false; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; }
    function outside(selector) { const root = rootEl(); return Array.from(document.querySelectorAll(selector)).filter((el) => !root || !root.contains(el)); }
    function firstVisible(selectors) { for (const selector of selectors) { const found = outside(selector).find(visible); if (found) return found; } return null; }
    function status(message, isError = false) { if (!refs.status) return; refs.status.textContent = message; refs.status.classList.toggle(ERROR_CLASS, isError); }
    function setBusy(isBusy, message, isError = false) {
        state.busy = isBusy;
        if (message) status(message, isError);
        if (!refs.panel) return;
        refs.panel.querySelectorAll('button,input,textarea').forEach((node) => {
            if (node.id === TOGGLE_ID) return;
            if (node.dataset && node.dataset.action === 'stop-generation') return;
            node.disabled = isBusy;
        });
        if (refs.toggle) refs.toggle.disabled = isBusy;
    }
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (typeof text === 'string') node.textContent = text;
        return node;
    }

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function addChoiceGrid(container, options, name) {
        options.forEach((option, index) => {
            const label = el('label', 'ln-choice');
            label.htmlFor = `${name}-${index}`;
            const input = document.createElement('input');
            input.id = `${name}-${index}`;
            input.type = 'checkbox';
            input.name = name;
            input.value = option;
            const span = el('span', '', option);
            label.appendChild(input);
            label.appendChild(span);
            container.appendChild(label);
        });
    }

    function aggressiveClick(node) {
        ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'].forEach((type) => {
            const EventType = type.startsWith('pointer') ? PointerEvent : MouseEvent;
            node.dispatchEvent(new EventType(type, { bubbles: true, cancelable: true, composed: true }));
        });
    }

    function formatDatePtBr(value) {
        if (!value) return '';
        const date = new Date(value);
        const pad = (number) => String(number).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('Falha ao ler o arquivo de imagem.'));
            reader.readAsDataURL(file);
        });
    }

    function randomCooldownMs() {
        return (30 + Math.floor(Math.random() * 31)) * 1000;
    }

    function getBatchState(novelId) {
        return state.batch && state.batch.novelId === novelId ? state.batch : null;
    }

    function setLogStepCurrent(stepIndex) {
        if (!state.batch) return;
        state.batch.logs.forEach((entry, index) => {
            if (entry.status === 'current') entry.status = 'done';
            if (entry.status === 'pending' && index < stepIndex) entry.status = 'done';
        });
        if (state.batch.logs[stepIndex]) state.batch.logs[stepIndex].status = 'current';
        state.batch.currentStepIndex = stepIndex;
    }

    function setLogStepStatus(stepIndex, statusValue) {
        if (!state.batch || !state.batch.logs[stepIndex]) return;
        state.batch.logs[stepIndex].status = statusValue;
    }

    function sameStructure(template, candidate) {
        if (Array.isArray(template)) return Array.isArray(candidate);
        if (template && typeof template === 'object') {
            if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
            return Object.keys(template).every((key) => sameStructure(template[key], candidate[key]));
        }
        return true;
    }

    function validatePromptResponseShape(parsed) {
        return sameStructure(PROMPT_TEMPLATE, parsed);
    }

    function injectUi() {
        if (!document.body || document.getElementById(ROOT_ID)) return;

        const overlay = el('div');
        overlay.id = OVERLAY_ID;

        const root = el('div');
        root.id = ROOT_ID;
        const panel = el('aside');
        panel.id = PANEL_ID;

        const header = el('div', 'ln-head');
        const headerText = el('div');
        headerText.appendChild(el('h1', '', 'LN Studio'));
        headerText.appendChild(el('p', '', 'Crie e continue light novels direto no Gemini.'));
        const closeBtn = el('button', 'ln-close', 'X');
        closeBtn.type = 'button';
        closeBtn.dataset.action = 'close';
        header.appendChild(headerText);
        header.appendChild(closeBtn);

        const statusBox = el('div', '', 'Pronto. Abra uma conversa do Gemini antes de gerar.');
        statusBox.id = STATUS_ID;

        const body = el('div', 'ln-body');

        const listView = el('section', 'ln-view');
        listView.id = LIST_VIEW_ID;
        const listToolbar = el('div', 'ln-toolbar');
        listToolbar.appendChild(el('p', 'ln-label', 'Biblioteca'));
        const novelList = el('div', 'ln-scroll');
        novelList.id = NOVEL_LIST_ID;
        const libraryActions = el('div', 'ln-library-actions');
        const newBtn = el('button', 'ln-b1', 'Nova light novel');
        newBtn.type = 'button';
        newBtn.dataset.action = 'open-create';
        const exportBtn = el('button', 'ln-b3', 'Exportar');
        exportBtn.type = 'button';
        exportBtn.dataset.action = 'export-data';
        libraryActions.appendChild(newBtn);
        libraryActions.appendChild(exportBtn);
        listView.appendChild(listToolbar);
        listView.appendChild(novelList);
        listView.appendChild(libraryActions);

        const createView = el('section', `ln-view ${HIDDEN_CLASS}`);
        createView.id = CREATE_VIEW_ID;
        const createToolbar = el('div', 'ln-toolbar');
        createToolbar.appendChild(el('p', 'ln-label', 'Nova Light Novel'));
        const backBtn = el('button', 'ln-b3', 'Voltar');
        backBtn.type = 'button';
        backBtn.dataset.action = 'back';
        createToolbar.appendChild(backBtn);

        const form = el('form', 'ln-view');
        form.id = FORM_ID;
        const formScroll = el('div', 'ln-scroll');

        const genresSection = el('section', 'ln-section');
        genresSection.appendChild(el('h3', '', 'Generos'));
        genresSection.appendChild(el('p', '', 'Escolha varios generos para compor o prompt inicial.'));
        const genresGrid = el('div', 'ln-grid');
        addChoiceGrid(genresGrid, GENRE_OPTIONS, 'genres');
        genresSection.appendChild(genresGrid);

        const elementsSection = el('section', 'ln-section');
        elementsSection.appendChild(el('h3', '', 'Elementos'));
        elementsSection.appendChild(el('p', '', 'Combine varios elementos que devem aparecer na novel.'));
        const elementsGrid = el('div', 'ln-grid');
        addChoiceGrid(elementsGrid, ELEMENT_OPTIONS, 'elements');
        elementsSection.appendChild(elementsGrid);

        const notesSection = el('section', 'ln-section');
        notesSection.appendChild(el('h3', '', 'Notas adicionais'));
        notesSection.appendChild(el('p', '', 'Uma nota por linha. Adicione quantas quiser.'));
        const notesField = el('textarea', 'ln-text');
        notesField.name = 'additional_notes';
        notesField.placeholder = 'Exemplo:\nprotagonista frio mas leal\nmisturar politica e crafting';
        notesSection.appendChild(notesField);

        formScroll.appendChild(genresSection);
        formScroll.appendChild(elementsSection);
        formScroll.appendChild(notesSection);

        const formFooter = el('div', 'ln-foot');
        formFooter.appendChild(el('p', 'ln-muted', 'O script salva o JSON bruto retornado pelo Gemini e usa o ultimo JSON como base para os proximos capitulos.'));
        const createBtn = el('button', 'ln-b1', 'Criar e gerar capitulo 1');
        createBtn.type = 'submit';
        formFooter.appendChild(createBtn);

        form.appendChild(formScroll);
        form.appendChild(formFooter);
        createView.appendChild(createToolbar);
        createView.appendChild(form);

        body.appendChild(listView);
        body.appendChild(createView);
        panel.appendChild(header);
        panel.appendChild(statusBox);
        panel.appendChild(body);

        const toggle = el('button');
        toggle.id = TOGGLE_ID;
        toggle.type = 'button';
        toggle.title = 'Abrir LN Studio';
        const closedIcon = el('span', 'i c', String.fromCodePoint(0x1F4D5));
        const openIcon = el('span', 'i o', String.fromCodePoint(0x1F4D6));
        toggle.appendChild(closedIcon);
        toggle.appendChild(openIcon);

        root.appendChild(panel);
        root.appendChild(toggle);

        const coverInput = document.createElement('input');
        coverInput.type = 'file';
        coverInput.accept = 'image/*';
        coverInput.style.display = 'none';

        const imageOverlay = el('div', 'ln-image-overlay');
        const imageViewer = el('div', 'ln-image-viewer');
        const imageStage = el('div', 'ln-image-stage');
        const imageElement = document.createElement('img');
        imageElement.alt = 'Capa da light novel';
        imageStage.appendChild(imageElement);
        const imageToolbar = el('div', 'ln-image-toolbar');
        const uploadCoverBtn = el('button', 'ln-b1', 'Enviar imagem');
        uploadCoverBtn.type = 'button';
        uploadCoverBtn.dataset.action = 'upload-cover';
        const deleteCoverBtn = el('button', 'ln-b3', 'Excluir imagem');
        deleteCoverBtn.type = 'button';
        deleteCoverBtn.dataset.action = 'delete-cover';
        const promptCoverBtn = el('button', 'ln-b3', 'Gerar prompt da imagem');
        promptCoverBtn.type = 'button';
        promptCoverBtn.dataset.action = 'cover-prompt';
        const closeImageBtn = el('button', 'ln-b3', 'Fechar');
        closeImageBtn.type = 'button';
        closeImageBtn.dataset.action = 'close-cover-viewer';
        imageToolbar.appendChild(uploadCoverBtn);
        imageToolbar.appendChild(deleteCoverBtn);
        imageToolbar.appendChild(promptCoverBtn);
        imageToolbar.appendChild(closeImageBtn);
        imageViewer.appendChild(imageStage);
        imageViewer.appendChild(imageToolbar);
        imageOverlay.appendChild(imageViewer);
        root.appendChild(coverInput);
        root.appendChild(imageOverlay);

        document.body.appendChild(overlay);
        document.body.appendChild(root);

        refs.overlay = overlay;
        refs.root = root;
        refs.panel = panel;
        refs.toggle = toggle;
        refs.status = statusBox;
        refs.list = listView;
        refs.create = createView;
        refs.novels = novelList;
        refs.libraryActions = libraryActions;
        refs.form = form;
        refs.coverInput = coverInput;
        refs.imageOverlay = imageOverlay;
        refs.imageElement = imageElement;

        refs.toggle.addEventListener('click', () => togglePanel());
        refs.overlay.addEventListener('click', () => closePanel());
        refs.imageOverlay.addEventListener('click', (event) => { if (event.target === refs.imageOverlay) closeCoverViewer(); });
        refs.coverInput.addEventListener('change', (event) => { void handleCoverFileSelection(event); });
        refs.root.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl || actionEl.disabled) return;
            const action = actionEl.dataset.action;
            if (action === 'close') closePanel();
            if (action === 'open-create') showCreate();
            if (action === 'back') showList();
            if (action === 'generate-next' && actionEl.dataset.id) void generateNext(actionEl.dataset.id);
            if (action === 'stop-generation' && actionEl.dataset.id) requestStopGeneration(actionEl.dataset.id);
            if (action === 'export-data') void exportData();
            if (action === 'open-cover' && actionEl.dataset.id) void openCoverViewer(actionEl.dataset.id);
            if (action === 'close-cover-viewer') closeCoverViewer();
            if (action === 'upload-cover') triggerCoverUpload();
            if (action === 'delete-cover') void deleteCoverImage();
            if (action === 'cover-prompt') void generateCoverPrompt();
        });
        refs.form.addEventListener('submit', (event) => { event.preventDefault(); void createNovel(); });
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            if (refs.imageOverlay.classList.contains('open')) {
                closeCoverViewer();
                return;
            }
            if (state.open) closePanel();
        });
    }

    function openPanel() { state.open = true; refs.panel.classList.add(OPEN_CLASS); refs.overlay.classList.add(OPEN_CLASS); refs.toggle.classList.add(OPEN_CLASS); }
    function closePanel() { state.open = false; refs.panel.classList.remove(OPEN_CLASS); refs.overlay.classList.remove(OPEN_CLASS); refs.toggle.classList.remove(OPEN_CLASS); }
    function togglePanel() { state.open ? closePanel() : openPanel(); }
    function showCreate() { refs.list.classList.add(HIDDEN_CLASS); refs.create.classList.remove(HIDDEN_CLASS); status('Selecione generos, elementos e notas antes de gerar o capitulo inicial.'); }
    function showList() { refs.create.classList.add(HIDDEN_CLASS); refs.list.classList.remove(HIDDEN_CLASS); status('Biblioteca atualizada. Escolha uma novel para gerar o proximo capitulo.'); }
    function openCoverViewerState(novel) {
        state.coverNovelId = novel.id;
        refs.imageElement.src = novel.coverImageBase64 || '';
        refs.imageOverlay.classList.add('open');
    }
    function closeCoverViewer() {
        state.coverNovelId = null;
        refs.imageElement.removeAttribute('src');
        refs.imageOverlay.classList.remove('open');
    }
    async function openCoverViewer(novelId) {
        const novel = await getOne(NOVELS_STORE, novelId);
        if (!novel) return;
        if (!novel.coverImageBase64) {
            status('Esta light novel ainda nao possui capa. Use "Enviar imagem".', false);
        }
        openCoverViewerState(novel);
    }
    function triggerCoverUpload() {
        if (!state.coverNovelId) return;
        refs.coverInput.value = '';
        refs.coverInput.click();
    }
    async function handleCoverFileSelection(event) {
        const file = event.target.files && event.target.files[0];
        if (!file || !state.coverNovelId) return;
        try {
            const novel = await getOne(NOVELS_STORE, state.coverNovelId);
            if (!novel) throw new Error('Nao encontrei a light novel da capa.');
            const dataUrl = await readFileAsDataUrl(file);
            const updatedNovel = { ...novel, coverImageBase64: dataUrl, coverImageName: file.name, coverImageMimeType: file.type || '', updatedAt: Date.now() };
            await saveNovel(updatedNovel);
            refs.imageElement.src = dataUrl;
            await refreshNovelList();
            status(`Capa atualizada para ${updatedNovel.title}.`, false);
        } catch (error) {
            status(error.message || 'Falha ao salvar a capa.', true);
        }
    }
    async function deleteCoverImage() {
        if (!state.coverNovelId) return;
        try {
            const novel = await getOne(NOVELS_STORE, state.coverNovelId);
            if (!novel) throw new Error('Nao encontrei a light novel da capa.');
            const updatedNovel = { ...novel, coverImageBase64: '', coverImageName: '', coverImageMimeType: '', updatedAt: Date.now() };
            await saveNovel(updatedNovel);
            await refreshNovelList();
            closeCoverViewer();
            status(`Capa removida de ${updatedNovel.title}.`, false);
        } catch (error) {
            status(error.message || 'Falha ao excluir a capa.', true);
        }
    }
    function csv(values) {
        return Array.isArray(values)
            ? values.map((value) => String(value || '').trim()).filter(Boolean).join(', ')
            : '';
    }

    function buildCoverPrompt(novel) {
        const parsed = novel && novel.lastRawResponse ? parseResponse(novel.lastRawResponse).parsed : null;
        const input = parsed && parsed.input ? parsed.input : {};
        const continuity = input.continuity || {};
        const protagonist = continuity.protagonist || {};
        const worldbuilding = continuity.worldbuilding || {};
        const powerSystem = continuity.power_system || {};
        const plotThreads = continuity.plot_threads || {};
        const chapter = input.chapter || {};

        const title = String(novel.title || input.title || 'Untitled Light Novel').trim();
        const genres = csv((novel && novel.genres) || input.genres || []);
        const elements = csv((novel && novel.elements) || input.elements || []);
        const notes = csv((novel && novel.additionalNotes) || input.additional_notes || []);
        const abilities = csv(protagonist.abilities || []);
        const organizations = csv(worldbuilding.organizations || []);
        const secondaryThreads = csv(plotThreads.secondary || []);
        const nextSuggestions = csv(continuity.next_chapter_suggestions || []);

        const protagonistBits = [
            protagonist.name ? protagonist.name : '',
            protagonist.age ? `${protagonist.age} years old` : '',
            protagonist.level_power ? `current power level: ${protagonist.level_power}` : '',
            abilities ? `signature abilities: ${abilities}` : '',
            protagonist.current_goal ? `current goal: ${protagonist.current_goal}` : '',
            notes ? `extra author notes: ${notes}` : ''
        ].filter(Boolean);

        const settingBits = [
            worldbuilding.current_location ? `location: ${worldbuilding.current_location}` : '',
            worldbuilding.world_rules ? `world rules: ${worldbuilding.world_rules}` : '',
            organizations ? `relevant organizations: ${organizations}` : '',
            powerSystem.mechanics ? `power system mechanics: ${powerSystem.mechanics}` : '',
            powerSystem.progression ? `progression feel: ${powerSystem.progression}` : ''
        ].filter(Boolean);

        const storyBits = [
            continuity.summary ? `overall story summary: ${continuity.summary}` : '',
            plotThreads.main ? `main conflict: ${plotThreads.main}` : '',
            secondaryThreads ? `secondary tensions: ${secondaryThreads}` : '',
            chapter.title ? `latest chapter title: ${chapter.title}` : '',
            nextSuggestions ? `upcoming hooks: ${nextSuggestions}` : ''
        ].filter(Boolean);

        return `Act as an expert prompt engineer for image generation models such as Midjourney, DALL-E, and Stable Diffusion.
I need a cover illustration for my Light Novel.

WORK DATA:
- Title: ${title}
- Genres: ${genres || 'Light Novel'}
- Elements: ${elements || 'Original fantasy adventure elements'}

PROMPT REQUIREMENTS:
1. Generate the prompt in ENGLISH.
2. The artistic style must reflect modern Japanese light novel covers.
3. Include atmosphere, setting details, and the main character based on:
   ${protagonistBits.length ? `Character focus: ${protagonistBits.join('. ')}.` : 'Character focus: create a commercially strong light novel protagonist based on the title, genres, and story mood.'}
   ${storyBits.length ? `Context: ${storyBits.join('. ')}.` : 'Context: create a dramatic and marketable cover scene that matches the title and genres.'}
   ${settingBits.length ? `Setting: ${settingBits.join('. ')}.` : 'Setting: build a rich fantasy light novel environment with clear depth, atmosphere, and readable silhouette design.'}
4. MANDATORY: the final image must visibly include the Light Novel title "${title}" as part of the cover design, integrated in a readable and stylish way.
5. MANDATORY: the final image must use portrait proportions, approximately 300x400, with aspect ratio 3:4. Include the ratio command at the end of the generated prompt when relevant (example: "--ar 3:4").

Return ONLY the generated English prompt, with no extra commentary.`;
    }

    async function generateCoverPrompt() {
        if (!state.coverNovelId) {
            status('Abra a capa de uma light novel antes de gerar o prompt.', true);
            return;
        }
        try {
            const novel = await getOne(NOVELS_STORE, state.coverNovelId);
            if (!novel) throw new Error('Nao encontrei a light novel da capa.');
            const prompt = buildCoverPrompt(novel);
            try {
                await navigator.clipboard.writeText(prompt);
                status(`Prompt de capa de ${novel.title || 'light novel'} copiado para a area de transferencia.`, false);
            } catch (copyError) {
                window.prompt('Prompt de capa gerado. Copie abaixo:', prompt);
                status('Prompt de capa gerado. O clipboard falhou, entao abri uma caixa para copia manual.', false);
            }
        } catch (error) {
            status(error.message || 'Falha ao montar o prompt da capa.', true);
        }
    }

    function openDatabase() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const idb = window.indexedDB || (typeof indexedDB !== 'undefined' ? indexedDB : null);
            if (!idb) {
                reject(new Error('IndexedDB nao esta disponivel neste contexto do userscript.'));
                return;
            }
            const request = idb.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(NOVELS_STORE)) db.createObjectStore(NOVELS_STORE, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(CHAPTERS_STORE)) {
                    const store = db.createObjectStore(CHAPTERS_STORE, { keyPath: 'id' });
                    store.createIndex('novelId', 'novelId', { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Nao foi possivel abrir o IndexedDB.'));
        });
        return dbPromise;
    }

    async function getAll(storeName) {
        const db = await openDatabase();
        const tx = db.transaction(storeName, 'readonly');
        return reqToPromise(tx.objectStore(storeName).getAll());
    }

    async function getOne(storeName, key) {
        const db = await openDatabase();
        const tx = db.transaction(storeName, 'readonly');
        return reqToPromise(tx.objectStore(storeName).get(key));
    }

    async function saveNovelAndChapter(novel, chapter) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([NOVELS_STORE, CHAPTERS_STORE], 'readwrite');
            tx.objectStore(NOVELS_STORE).put(novel);
            tx.objectStore(CHAPTERS_STORE).put(chapter);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('Falha ao salvar dados no IndexedDB.'));
        });
    }

    async function saveNovel(novel) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([NOVELS_STORE], 'readwrite');
            tx.objectStore(NOVELS_STORE).put(novel);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('Falha ao salvar a light novel.'));
        });
    }

    async function loadSummaries() {
        const [novels, chapters] = await Promise.all([getAll(NOVELS_STORE), getAll(CHAPTERS_STORE)]);
        return novels.map((novel) => {
            const related = chapters.filter((chapter) => chapter.novelId === novel.id).sort((a, b) => (Number(b.chapterNumber) || 0) - (Number(a.chapterNumber) || 0) || (b.createdAt || 0) - (a.createdAt || 0));
            const latest = related[0];
            return {
                ...novel,
                totalChapters: related.length,
                latestChapterNumber: latest ? latest.chapterNumber : novel.lastChapterNumber || 0,
                latestChapterTitle: latest ? latest.chapterTitle : novel.lastChapterTitle || ''
            };
        }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    async function latestChapter(novelId) {
        const chapters = await getAll(CHAPTERS_STORE);
        return chapters.filter((chapter) => chapter.novelId === novelId).sort((a, b) => (Number(b.chapterNumber) || 0) - (Number(a.chapterNumber) || 0) || (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
    }

    async function chaptersForNovel(novelId) {
        const chapters = await getAll(CHAPTERS_STORE);
        return chapters
            .filter((chapter) => chapter.novelId === novelId)
            .sort((a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0) || (a.createdAt || 0) - (b.createdAt || 0));
    }

    async function allChapters() {
        const chapters = await getAll(CHAPTERS_STORE);
        return chapters.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    function slug(value) {
        return String(value || 'light-novel')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase() || 'light-novel';
    }

    function downloadText(filename, text, mimeType = 'application/json;charset=utf-8') {
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function refreshNovelList() {
        const novels = await loadSummaries();
        clear(refs.novels);
        if (novels.length === 0) {
            const empty = el('div', 'ln-empty');
            empty.appendChild(document.createTextNode('Ainda nao ha light novels salvas. Clique em '));
            const strong = el('strong', '', 'Nova light novel');
            empty.appendChild(strong);
            empty.appendChild(document.createTextNode(' para criar a primeira.'));
            refs.novels.appendChild(empty);
            return;
        }
        novels.forEach((novel) => {
            const batch = getBatchState(novel.id);
            const card = el('article', 'ln-card');
            const coverButton = el('button', 'ln-cover');
            coverButton.type = 'button';
            coverButton.dataset.action = 'open-cover';
            coverButton.dataset.id = novel.id;
            if (novel.coverImageBase64) {
                const image = document.createElement('img');
                image.src = novel.coverImageBase64;
                image.alt = `Capa de ${novel.title || 'light novel'}`;
                coverButton.appendChild(image);
            } else {
                const placeholder = el('div', 'ln-cover-placeholder');
                placeholder.appendChild(el('strong', '', 'Sem capa'));
                placeholder.appendChild(el('span', '', 'Clique para visualizar ou enviar uma imagem.'));
                coverButton.appendChild(placeholder);
            }
            const main = el('div');
            const title = el('h3', 'ln-title', novel.title || 'Light novel sem titulo');
            main.appendChild(title);

            const meta = el('div', 'ln-meta');
            const total = novel.totalChapters === 1 ? '1 capitulo' : `${novel.totalChapters} capitulos`;
            meta.appendChild(el('span', 'ln-chip', total));
            main.appendChild(meta);

            let logPanel = null;
            if (batch && batch.logs && batch.logs.length) {
                logPanel = el('div', 'ln-log');
                batch.logs.forEach((logEntry) => {
                    const logNode = el('div', `ln-log-entry ${logEntry.status || 'pending'}`, logEntry.label);
                    logPanel.appendChild(logNode);
                });
            }

            const actions = el('div', 'ln-card-actions');
            const countWrap = el('label', 'ln-count');
            countWrap.appendChild(el('span', '', 'Qtd'));
            const countInput = document.createElement('input');
            countInput.type = 'number';
            countInput.min = '1';
            countInput.max = '20';
            countInput.step = '1';
            countInput.value = batch ? String(batch.totalRequested || 1) : '1';
            countInput.dataset.id = novel.id;
            countInput.dataset.role = 'batch-count';
            countWrap.appendChild(countInput);

            const nextBtn = el('button', 'ln-b2', batch ? 'Gerando...' : 'Gerar proximo');
            nextBtn.type = 'button';
            nextBtn.dataset.action = 'generate-next';
            nextBtn.dataset.id = novel.id;
            nextBtn.disabled = Boolean(state.busy);
            const stopBtn = el('button', 'ln-b3 ln-stop', batch && batch.stopRequested ? 'Parando...' : 'Parar');
            stopBtn.type = 'button';
            stopBtn.dataset.action = 'stop-generation';
            stopBtn.dataset.id = novel.id;
            stopBtn.disabled = !batch;

            actions.appendChild(countWrap);
            actions.appendChild(nextBtn);
            actions.appendChild(stopBtn);

            card.appendChild(coverButton);
            card.appendChild(main);
            if (logPanel) card.appendChild(logPanel);
            card.appendChild(actions);
            refs.novels.appendChild(card);
        });
    }

    function selected(form, name) {
        return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value.trim()).filter(Boolean);
    }

    function notes(form) {
        const field = form.querySelector('textarea[name="additional_notes"]');
        return field ? field.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
    }

    function buildInitialPayload() {
        const genres = selected(refs.form, 'genres');
        const elements = selected(refs.form, 'elements');
        const additionalNotes = notes(refs.form);
        if (!genres.length) throw new Error('Selecione pelo menos um genero.');
        if (!elements.length) throw new Error('Selecione pelo menos um elemento.');
        const payload = clone(PROMPT_TEMPLATE);
        payload.input.genres = genres;
        payload.input.elements = elements;
        payload.input.additional_notes = additionalNotes;
        payload.input.style.style_notes = additionalNotes.join(' | ');
        return { payload, seed: { genres, elements, additionalNotes } };
    }

    function stripFence(text) { return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim(); }

    function extractJson(text) {
        let depth = 0;
        let start = -1;
        let inString = false;
        let escaping = false;
        for (let i = 0; i < text.length; i += 1) {
            const ch = text[i];
            if (escaping) { escaping = false; continue; }
            if (ch === '\\') { escaping = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{') { if (depth === 0) start = i; depth += 1; continue; }
            if (ch === '}') { depth -= 1; if (depth === 0 && start !== -1) return text.slice(start, i + 1); }
        }
        return '';
    }

    function parseResponse(rawText) {
        const raw = rawText.trim();
        const tries = [raw];
        const noFence = stripFence(raw);
        if (noFence && noFence !== raw) tries.push(noFence);
        const jsonSlice = extractJson(noFence);
        if (jsonSlice && !tries.includes(jsonSlice)) tries.push(jsonSlice);
        for (const candidate of tries) {
            try { return { rawJson: candidate, parsed: JSON.parse(candidate) }; } catch (error) { continue; }
        }
        throw new Error('O Gemini respondeu, mas nao devolveu um JSON valido.');
    }

    function responses() { return outside('model-response').filter(visible); }

    function responseText(responseEl) {
        const content = responseEl.querySelector('message-content.model-response-text div.markdown.markdown-main-panel')
            || responseEl.querySelector('message-content.model-response-text')
            || responseEl.querySelector('div.response-content')
            || responseEl;
        return String(content.innerText || content.textContent || '').replace(/\u00A0/g, ' ').trim();
    }

    function responseDone(responseEl) { return Boolean(responseEl && responseEl.querySelector('message-actions')); }

    async function waitFor(test, timeout, errorMessage) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const result = test();
            if (result) return result;
            await delay(POLL_MS / 2);
        }
        throw new Error(errorMessage);
    }

    function composer() {
        return firstVisible([
            'rich-textarea div[contenteditable="true"]',
            'div.ql-editor[contenteditable="true"]',
            'div[role="textbox"][contenteditable="true"]',
            'div[contenteditable="true"]'
        ]);
    }

    function sendWithEnter(field) {
        const keydown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true, cancelable: true });
        const keypress = new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true, cancelable: true });
        const keyup = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true, cancelable: true });
        field.dispatchEvent(keydown);
        field.dispatchEvent(keypress);
        field.dispatchEvent(keyup);
    }

    function setComposerText(text) {
        const field = composer();
        if (!field) throw new Error('Nao encontrei o campo de prompt do Gemini. Abra uma conversa antes de gerar.');
        field.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(field);
        selection.removeAllRanges();
        selection.addRange(range);
        try {
            document.execCommand('insertText', false, text);
        } catch (error) {
            field.textContent = text;
        }
        if ((field.innerText || '').trim() !== text.trim()) field.textContent = text;
        field.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: text, inputType: 'insertText' }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function sendButton() {
        const direct = firstVisible([
            '.send-button',
            'input-area-v2 button[type="submit"]',
            'button[data-test-id="send-button"]',
            'button[aria-label*="Send" i]',
            'button[aria-label*="Enviar" i]',
            'button[aria-label*="submit" i]'
        ]);
        if (direct && !direct.disabled) return direct;
        const trailing = outside('input-area-v2 .trailing-actions-wrapper button, .trailing-actions-wrapper button').filter((button) => {
            if (!visible(button) || button.disabled) return false;
            const label = String(button.getAttribute('aria-label') || button.title || button.innerText || '').toLowerCase();
            return !label.includes('micro') && !label.includes('voice') && !label.includes('voz') && !label.includes('audio');
        });
        return trailing[trailing.length - 1] || null;
    }

    async function sendPrompt(payloadString) {
        const field = await waitFor(() => composer(), 30000, 'Nao encontrei o editor do Gemini.');
        const baseline = responses().length;
        setComposerText(payloadString);
        await delay(200);
        let button = null;
        const start = Date.now();
        while (Date.now() - start < 4000) {
            button = sendButton();
            if (button) break;
            await delay(150);
        }
        if (button) {
            aggressiveClick(button);
            return baseline;
        }
        sendWithEnter(field);
        return baseline;
    }

    async function waitForResponse(baseline) {
        const start = Date.now();
        let previousText = '';
        let stableCount = 0;
        while (Date.now() - start < GENERATION_TIMEOUT_MS) {
            const all = responses();
            if (all.length > baseline) {
                const latest = all[all.length - 1];
                const text = responseText(latest);
                if (responseDone(latest) && text) {
                    stableCount = text === previousText ? stableCount + 1 : 1;
                    previousText = text;
                    if (stableCount >= 2) return text;
                }
            }
            await delay(POLL_MS);
        }
        throw new Error('Tempo esgotado aguardando a resposta do Gemini.');
    }

    function currentModel() {
        const button = firstVisible(['button.input-area-switch', 'button[aria-haspopup="menu"]']);
        return button ? String(button.innerText || button.textContent || '').trim() : '';
    }

    function chapterNumber(parsed) {
        const input = parsed.input || {};
        const chapter = input.chapter || {};
        const direct = Number(chapter.number);
        const fallback = Number(input.last_chapter_number);
        if (Number.isFinite(direct) && direct > 0) return direct;
        if (Number.isFinite(fallback) && fallback > 0) return fallback;
        return 0;
    }

    function chapterData(parsed, modelFallback) {
        const input = parsed.input || {};
        const chapter = input.chapter || {};
        const number = chapterNumber(parsed);
        return {
            novelTitle: String(input.title || '').trim() || 'Light novel sem titulo',
            chapterNumber: number,
            chapterTitle: String(chapter.title || '').trim() || `Capitulo ${number || '?'}`,
            chapterContent: String(chapter.content || ''),
            aiProvider: String(chapter.ai_provider || 'Gemini Web'),
            model: String(chapter.model || modelFallback || '')
        };
    }

    function continuationPayload(rawResponse) {
        const { parsed } = parseResponse(rawResponse);
        if (!parsed || !parsed.input) throw new Error('A ultima resposta salva nao possui a estrutura esperada.');
        const payload = clone(parsed);
        payload.input.title = '';
        if (payload.input.chapter) {
            payload.input.chapter.number = '';
            payload.input.chapter.title = '';
            payload.input.chapter.content = '';
            payload.input.chapter.ai_provider = '';
            payload.input.chapter.model = '';
            payload.input.chapter.plan = '';
            payload.input.chapter.generated_at = '';
        }
        return payload;
    }

    async function runGeneration(payloadObject) {
        const promptText = JSON.stringify(payloadObject, null, 2);
        status('Enviando JSON para o Gemini...');
        const baseline = await sendPrompt(promptText);
        status('Aguardando resposta do Gemini e validando o JSON retornado...');
        const rawText = await waitForResponse(baseline);
        const { rawJson, parsed } = parseResponse(rawText);
        return { promptText, rawText, rawJson, parsed };
    }

    async function generateSingleChapterForNovel(novelId) {
        const novel = await getOne(NOVELS_STORE, novelId);
        if (!novel) throw new Error('Nao encontrei a light novel selecionada.');
        if (!novel.lastRawResponse) throw new Error('Nao existe continuidade salva para esta novel.');
        const generated = await runGeneration(continuationPayload(novel.lastRawResponse));
        if (!validatePromptResponseShape(generated.parsed)) {
            throw new Error('A resposta retornada nao preservou a estrutura JSON esperada do prompt.');
        }
        const data = chapterData(generated.parsed, currentModel());
        const now = Date.now();
        const updatedNovel = { ...novel, title: data.novelTitle || novel.title, lastChapterNumber: data.chapterNumber, lastChapterTitle: data.chapterTitle, lastRawResponse: generated.rawJson, updatedAt: now };
        const chapter = { id: uid('chapter'), novelId, chapterNumber: data.chapterNumber, chapterTitle: data.chapterTitle, chapterContent: data.chapterContent, aiProvider: data.aiProvider, model: data.model, createdAt: now, updatedAt: now };
        await saveNovelAndChapter(updatedNovel, chapter);
        return { novel: updatedNovel, chapter, data };
    }

    async function createNovel() {
        if (state.busy) return;
        try {
            setBusy(true, 'Montando prompt inicial da light novel...');
            const { payload, seed } = buildInitialPayload();
            const generated = await runGeneration(payload);
            if (!validatePromptResponseShape(generated.parsed)) throw new Error('A resposta inicial nao preservou a estrutura JSON esperada do prompt.');
            const data = chapterData(generated.parsed, currentModel());
            const now = Date.now();
            const novelId = uid('novel');
            const novel = { id: novelId, title: data.novelTitle, genres: seed.genres, elements: seed.elements, additionalNotes: seed.additionalNotes, lastChapterNumber: data.chapterNumber, lastChapterTitle: data.chapterTitle, lastRawResponse: generated.rawJson, coverImageBase64: '', coverImageName: '', coverImageMimeType: '', createdAt: now, updatedAt: now };
            const chapter = { id: uid('chapter'), novelId, chapterNumber: data.chapterNumber, chapterTitle: data.chapterTitle, chapterContent: data.chapterContent, aiProvider: data.aiProvider, model: data.model, createdAt: now, updatedAt: now };
            await saveNovelAndChapter(novel, chapter);
            refs.form.reset();
            await refreshNovelList();
            showList();
            setBusy(false, `Novel criada: ${data.novelTitle}. Capitulo ${data.chapterNumber || 1} salvo no IndexedDB.`);
        } catch (error) {
            setBusy(false, error.message || 'Falha ao criar light novel.', true);
        }
    }

    async function buildExportPayload() {
        const novels = await getAll(NOVELS_STORE);
        const chapters = await allChapters();
        if (!novels.length) throw new Error('Nao existem light novels para exportar.');

        return novels.map((novel) => ({
            id: novel.id,
            title: novel.title,
            genres: novel.genres || [],
            elements: novel.elements || [],
            additionalNotes: novel.additionalNotes || [],
            lastChapterNumber: novel.lastChapterNumber || 0,
            createdAt: formatDatePtBr(novel.createdAt),
            updatedAt: formatDatePtBr(novel.updatedAt),
            coverImageBase64: novel.coverImageBase64 || '',
            promptPayload: (() => {
                try {
                    return JSON.parse(novel.lastRawResponse || '{}');
                } catch (error) {
                    return novel.lastRawResponse || '';
                }
            })(),
            chapters: chapters
                .filter((chapter) => chapter.novelId === novel.id)
                .map((chapter) => {
                    return {
                        id: chapter.id,
                        chapterNumber: chapter.chapterNumber,
                        chapterTitle: chapter.chapterTitle,
                        chapterContent: chapter.chapterContent,
                        aiProvider: chapter.aiProvider || '',
                        model: chapter.model || '',
                        createdAt: formatDatePtBr(chapter.createdAt)
                    };
                })
        }));
    }

    async function exportData() {
        if (state.busy) return;
        try {
            const payload = await buildExportPayload();
            downloadText('ln-studio-export-both.json', JSON.stringify(payload, null, 2));
            status('Exportacao concluida com sucesso.');
        } catch (error) {
            status(error.message || 'Falha ao exportar dados.', true);
        }
    }

    function requestStopGeneration(novelId) {
        const batch = getBatchState(novelId);
        if (!batch) return;
        batch.stopRequested = true;
        if (batch.logs[batch.currentStepIndex]) {
            batch.logs[batch.currentStepIndex].label += ' Parada solicitada apos concluir esta etapa.';
        }
        status(`Parada solicitada para ${batch.title}. O capitulo atual sera concluido antes de interromper.`, false);
        void refreshNovelList();
    }

    async function generateNext(novelId) {
        if (state.busy) {
            status('Ja existe uma geracao em andamento. Aguarde finalizar ou use Parar.', true);
            return;
        }
        try {
            const countField = refs.novels.querySelector(`input[data-role="batch-count"][data-id="${novelId}"]`);
            const count = Math.max(1, Math.min(20, Number(countField ? countField.value : 1) || 1));
            const novel = await getOne(NOVELS_STORE, novelId);
            if (!novel) throw new Error('Nao encontrei a light novel selecionada.');
            const cooldownPlan = Array.from({ length: Math.max(0, count - 1) }, () => randomCooldownMs());
            const logs = [];
            for (let index = 0; index < count; index += 1) {
                logs.push({ id: uid('log'), label: `Gerando capitulo ${index + 1} de ${count}.`, status: index === 0 ? 'current' : 'pending', type: 'generate' });
                if (index < count - 1) {
                    logs.push({ id: uid('log'), label: `Aguardando ${Math.ceil(cooldownPlan[index] / 1000)}s antes do proximo capitulo.`, status: 'pending', type: 'cooldown' });
                }
            }

            state.busy = true;
            state.batch = {
                novelId,
                title: novel.title,
                totalRequested: count,
                currentIndex: 0,
                remainingQueue: count,
                status: 'awaiting_response',
                stopRequested: false,
                cooldownSeconds: 0,
                logs,
                currentStepIndex: 0,
                cooldownPlan
            };
            await refreshNovelList();

            for (let index = 0; index < count; index += 1) {
                state.batch.currentIndex = index + 1;
                state.batch.remainingQueue = count - index;
                state.batch.status = 'awaiting_response';
                state.batch.cooldownSeconds = 0;
                const generateStepIndex = index * 2;
                setLogStepCurrent(generateStepIndex);
                status(`${novel.title}: gerando capitulo ${index + 1} de ${count}...`, false);
                await refreshNovelList();

                try {
                    const result = await generateSingleChapterForNovel(novelId);
                    state.batch.title = result.novel.title;
                    setLogStepStatus(generateStepIndex, 'done');
                    status(`${result.novel.title}: capitulo ${result.data.chapterNumber || '?'} salvo.`, false);
                    await refreshNovelList();
                } catch (error) {
                    setLogStepStatus(generateStepIndex, 'error');
                    status(error.message || 'Falha ao gerar ou salvar o capitulo.', true);
                    await refreshNovelList();
                }

                if (state.batch.stopRequested || index === count - 1) {
                    break;
                }

                state.batch.status = 'cooldown';
                state.batch.remainingQueue = count - index - 1;
                const cooldownMs = state.batch.cooldownPlan[index];
                const cooldownUntil = Date.now() + cooldownMs;
                const cooldownStepIndex = generateStepIndex + 1;
                setLogStepCurrent(cooldownStepIndex);
                await refreshNovelList();

                while (Date.now() < cooldownUntil) {
                    if (state.batch.stopRequested) break;
                    const remainingSeconds = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
                    state.batch.cooldownSeconds = remainingSeconds;
                    state.batch.logs[cooldownStepIndex].label = `Aguardando ${remainingSeconds}s antes do proximo capitulo.`;
                    status(`${novel.title}: aguardando ${remainingSeconds}s antes do proximo capitulo...`, false);
                    await delay(1000);
                }

                setLogStepStatus(cooldownStepIndex, 'done');

                if (state.batch.stopRequested) {
                    break;
                }
            }

            const stopped = state.batch && state.batch.stopRequested;
            state.busy = false;
            state.batch = null;
            await refreshNovelList();
            showList();
            status(stopped ? 'Geracao interrompida apos concluir o capitulo em andamento.' : 'Geracao em lote finalizada com sucesso.', false);
        } catch (error) {
            state.busy = false;
            state.batch = null;
            await refreshNovelList().catch(() => {});
            status(error.message || 'Falha ao gerar o proximo capitulo.', true);
        }
    }

    async function init() {
        injectUi();
        status('Inicializando LN Studio...');
        try {
            await openDatabase();
            await refreshNovelList();
            status('Pronto. Abra uma conversa do Gemini antes de gerar.');
        } catch (error) {
            console.error('LN Studio init error:', error);
            if (refs.novels) {
                clear(refs.novels);
                const empty = el('div', 'ln-empty');
                empty.appendChild(document.createTextNode('A interface carregou, mas o banco local falhou ao iniciar.'));
                empty.appendChild(document.createElement('br'));
                empty.appendChild(document.createElement('br'));
                empty.appendChild(document.createTextNode(error.message || 'Erro desconhecido.'));
                refs.novels.appendChild(empty);
            }
            status(error.message || 'Falha ao inicializar o banco local.', true);
        }
        window.setInterval(() => {
            if (!document.getElementById(ROOT_ID)) {
                injectUi();
                void refreshNovelList().catch((error) => {
                    console.error('LN Studio refresh error:', error);
                    status(error.message || 'Falha ao atualizar a biblioteca.', true);
                });
            }
        }, 2500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { void init(); }, { once: true });
    } else {
        void init();
    }
})();
