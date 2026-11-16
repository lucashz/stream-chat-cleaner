# 🧹 Stream Chat Rewards Cleaner (Kick & Twitch)

Extensão de Navegador Universal (Manifest V3) de alta performance e script de automação Playwright para suprimir resgates de recompensas da loja de pontos, bônus de minigames (PokeIdle) e poluição visual nos chats da **Kick** e da **Twitch**.

---

## 🚀 Instalação por Navegador

A extensão foi desenvolvida em formato **Universal MV3**, compatível com Chromium (Chrome, Opera, Opera GX, Brave, Edge) e Gecko (Firefox).

### 🔴 Opera & Opera GX
1. Abra o navegador e digite na barra de endereços: `opera://extensions`
2. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (Developer mode).
3. Clique no botão **"Carregar extensão descompactada"** (Load unpacked).
4. Selecione a pasta:
   ```
   D:\lsk\stream-chat-cleaner
   ```
5. *(Opcional no Opera GX)*: Se você usa o painel lateral ou janelas popout de chat da Twitch/Kick, a extensão funcionará normalmente pois escuta todos os subdomínios `*.kick.com` e `*.twitch.tv`.

---

### 🦊 Mozilla Firefox
1. Abra o Firefox e acesse: `about:debugging#/runtime/this-firefox`
2. Clique no botão **"Carregar extensão temporária..."** (Load Temporary Add-on...).
3. Navegue até `D:\lsk\stream-chat-cleaner` e selecione o arquivo:
   ```
   manifest.json
   ```
4. O Firefox carregará a extensão instantaneamente com o ID configurado em `browser_specific_settings.gecko`.
*(Nota: O Firefox oferece suporte nativo completo ao seletor CSS `:has()` desde a versão 121).*

---

### 🟡 Google Chrome / Brave / Edge
1. Acesse: `chrome://extensions/`
2. Ative a chave **"Modo do desenvolvedor"**.
3. Clique em **"Carregar sem compactação"**.
4. Selecione a pasta `D:\lsk\stream-chat-cleaner`.

---

## ⚙️ Funcionalidades da Extensão

- **Zero Flicker (:has() CSS Engine):** As mensagens de resgate são eliminadas pelo motor de estilo do navegador antes mesmo da pintura do layout na tela.
- **Heurística Resiliente na Kick:** Detecta cards de resgate mesmo se as classes dinâmicas do Tailwind mudarem, verificando:
  - O ícone SVG com 3 círculos (token da loja de pontos).
  - A faixa lateral verde néon Kick (`#53fc18` / `#00e701`).
  - O verbo de sistema `resgatou` / `redeemed` sem dois-pontos (`:`) após o username.
- **Filtro de Palavra-Chave:** Permite silenciar apenas bônus específicos (ex: `PokeIdle`, `+15% XP`, `Minigame`) ou ocultar todos os resgates globalmente.
- **Suporte a SPA (Single Page Application):** Reconecta o observador de mutações automaticamente ao trocar de streamer/canal sem necessidade de recarregar a página (F5).

---

## 🔍 Script Playwright de Inspeção (`inspect-rewards.js`)

O script conecta a uma live da Kick, aguarda o container do chat e intercepta qualquer resgate de recompensa em tempo real, extraindo o DOM exato, classes e hierarquia de seletores CSS.

### Pré-requisitos:
Se for rodar de forma isolada nesta pasta:
```bash
npm install
```
*(Nota: se você já possui o Playwright no ambiente `StreamOS`, o script detecta o binário automaticamente).*

### Execução:
```bash
# Executar apontando para uma live específica (janela visível)
node inspect-rewards.js https://kick.com/xqc --headed

# Executar em modo headless com arquivo de saída customizado
node inspect-rewards.js https://kick.com/xqc --headless --output=meu-dump.html
```
