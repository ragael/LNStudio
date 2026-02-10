# 🚀 Guia de Deploy no GitHub Pages

## Método 1: Interface Web (Recomendado para Iniciantes)

### Passo 1: Criar Repositório
1. Acesse [github.com](https://github.com)
2. Clique em **"New repository"** (botão verde)
3. Preencha:
   - **Repository name:** `light-novel-manager`
   - **Description:** "Gerenciador de Light Novels geradas por IA"
   - **Public** (deixe marcado)
   - **NÃO** marque "Add a README file" (já temos um)
4. Clique em **"Create repository"**

### Passo 2: Upload dos Arquivos
1. Na página do repositório novo, clique em **"uploading an existing file"**
2. Arraste e solte TODOS estes arquivos:
   - ✅ `index.html`
   - ✅ `favicon.svg`
   - ✅ `README.md`
   - ✅ `.gitignore`
   - ✅ `example-response.json`
   - ✅ `DEPLOY.md` (este arquivo)
3. Na caixa de commit, escreva: `Initial commit - Light Novel Manager v1.0`
4. Clique em **"Commit changes"**

### Passo 3: Ativar GitHub Pages
1. No repositório, clique em **"Settings"** (última aba do menu)
2. No menu lateral esquerdo, clique em **"Pages"**
3. Em **"Source"**, selecione:
   - **Branch:** `main` (ou `master`)
   - **Folder:** `/ (root)`
4. Clique em **"Save"**
5. Aguarde ~1 minuto

### Passo 4: Acessar Seu App
Seu app estará disponível em:
```
https://SEU-USUARIO.github.io/light-novel-manager/
```

Substitua `SEU-USUARIO` pelo seu username do GitHub.

---

## Método 2: Linha de Comando (Git)

```bash
# 1. Navegar até a pasta com os arquivos
cd /caminho/para/os/arquivos

# 2. Inicializar repositório Git
git init

# 3. Adicionar todos os arquivos
git add .

# 4. Fazer primeiro commit
git commit -m "Initial commit - Light Novel Manager v1.0"

# 5. Renomear branch para main
git branch -M main

# 6. Adicionar repositório remoto
git remote add origin https://github.com/SEU-USUARIO/light-novel-manager.git

# 7. Fazer push
git push -u origin main
```

Depois, siga o **Passo 3** do Método 1 para ativar Pages.

---

## 📱 Adicionar à Tela Inicial (Mobile)

### iPhone/iPad
1. Abra o site no Safari
2. Toque no ícone de compartilhar (quadrado com seta)
3. Role para baixo e toque em **"Adicionar à Tela de Início"**
4. Dê um nome e toque em **"Adicionar"**

### Android
1. Abra o site no Chrome
2. Toque nos três pontinhos (menu)
3. Toque em **"Adicionar à tela inicial"**
4. Confirme

Agora você tem um "app nativo"! 🎉

---

## 🔄 Atualizações Futuras

Para atualizar o app depois:

### Via Interface Web
1. No repositório, clique no arquivo que quer atualizar
2. Clique no ícone de lápis (Edit)
3. Faça as alterações
4. Commit changes

### Via Git
```bash
git add .
git commit -m "Descrição da atualização"
git push
```

O GitHub Pages atualiza automaticamente em ~1 minuto.

---

## 🐛 Solução de Problemas

### "Page not found" (404)
- Verifique se ativou Pages corretamente nas Settings
- Aguarde alguns minutos após ativar
- Certifique-se que o arquivo se chama `index.html`

### Favicon não aparece
- Limpe cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)
- Verifique se `favicon.svg` está na mesma pasta que `index.html`

### Mudanças não aparecem
- GitHub Pages pode levar até 10 minutos para atualizar
- Limpe cache do navegador
- Tente em aba anônima

### localStorage sumiu
- localStorage é específico por domínio E navegador
- Se acessar de outro navegador/dispositivo, os dados não estarão lá
- Use Export/Import para fazer backups!

---

## ✅ Checklist Final

Antes de considerar o deploy completo, verifique:

- [ ] Repositório criado e público
- [ ] Todos os arquivos enviados
- [ ] GitHub Pages ativado nas Settings
- [ ] URL funcionando (https://usuario.github.io/repo/)
- [ ] Favicon aparecendo na aba
- [ ] App funciona corretamente
- [ ] localStorage salvando dados
- [ ] Testado em mobile

---

## 🎉 Pronto!

Seu Light Novel Manager está no ar! 🚀

Compartilhe o link com amigos ou salve nos favoritos para acessar de qualquer lugar.

**Divirta-se criando histórias épicas!** 📚✨
