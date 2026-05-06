# Light Novel Studio

Sistema local de orquestracao por HTTP polling para enviar prompts ao Gemini via Tampermonkey e receber as respostas de volta na API.

## Requisitos

- Node.js 18 ou superior
- Tampermonkey no navegador usado com o Gemini

## Instalar e rodar

```bash
npm install
npm start
```

A API sobe por padrao em:

```text
http://127.0.0.1:3101
```

Painel de debug, servido a partir de `public/debug.html`:

```text
http://127.0.0.1:3101/debug
```

## Userscript

Instale o arquivo abaixo no Tampermonkey:

```text
tampermonkey/gemini-worker.user.js
```

Tambem e possivel abrir o conteudo do userscript direto pela API, sem download forcado:

```text
http://127.0.0.1:3101/tampermonkey
```

Abra o Gemini em `https://gemini.google.com/`. O script cria um ID de trabalhador por aba, salva em `sessionStorage`, envia `/status` a cada 10 segundos e busca tarefas quando estiver livre.

## Fluxo principal

1. Injete um prompt por `POST /prompt` ou pelo painel `/debug`.
2. O userscript livre busca `GET /tarefa/:id`.
3. O userscript envia o prompt no Gemini, espera a resposta estabilizar e chama `POST /resultado`.
4. A API mantém o trabalhador em `aguardando_consumo`; ele ainda nao recebe nova tarefa.
5. Quando a SPA consumir uma resposta, chame `POST /resultado/consumir` com `{ "resultId": "resultado_1" }`.
6. A API inicia um cool-down aleatorio de 3 a 9 ciclos de `/status` para o trabalhador correspondente.
7. Depois que a resposta foi consumida e o cool-down chegou a zero, o trabalhador volta a ser considerado livre.

## Endpoints

### Fila

- `POST /status`

```json
{ "id": "worker_1", "status": "livre" }
```

- `GET /tarefa/:id`
- `POST /prompt`

```json
{ "prompt": "Escreva uma cena curta." }
```

- `POST /resultado`

```json
{ "id": "worker_1", "taskId": "task_1", "resposta": "Texto gerado..." }
```

Depois de receber a resposta, a API bloqueia o trabalhador em `aguardando_consumo` ate a resposta ser consumida pela SPA.

- `GET /resultados`
- `GET /resultados?pendentes=1`
- `POST /resultado/consumir`
- `GET /trabalhadores`
- `GET /debug/status`
- `GET /tampermonkey`

```json
{ "resultId": "resultado_1" }
```

`GET /trabalhadores` remove antes da resposta qualquer trabalhador com mais de 2 minutos sem contato e retorna apenas trabalhadores ativos.

`GET /debug/status` alimenta o painel de debug com trabalhadores, fila e respostas. Essa rota nao remove registros; trabalhadores sem contato por mais de 2 minutos aparecem como `inativo`.

### Obras

- `GET /obras`
- `GET /obra/:id`
- `POST /obra`

Com ID explicito:

```json
{
  "id": "minha_obra.json",
  "content": {
    "input": {
      "title": "Minha Obra",
      "chapters": [{ "title": "Capitulo 1" }],
      "genres": ["fantasia"],
      "elements": ["academia magica"],
      "additional_notes": ["tom leve"]
    }
  }
}
```

Sem ID, a API gera o nome do arquivo a partir de `input.title`, em lowercase, sem acentos e com espacos convertidos em `_`.

## Estrutura

```text
src/server.js                         API Express
public/debug.html                     Painel HTML da rota /debug
tampermonkey/gemini-worker.user.js    Userscript do trabalhador
obras/                                Arquivos JSON das obras
```
