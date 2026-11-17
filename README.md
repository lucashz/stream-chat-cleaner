# 🧹 Stream Chat Rewards Cleaner (Kick & Twitch)

Extensão de Navegador Universal (Manifest V3) de alta performance que elimina o spam de resgates de pontos e minigames (como **PokeIdle**, bônus de XP, etc.) nos chats da **Kick** e da **Twitch**, mantendo o chat limpo e sem poluição visual.

> 🛡️ **Segurança para o Streamer:** Esta extensão preserva 100% das notificações que importam: **Inscrições (Subs e Resubs)**, **Subs de Presente (Gift Subs)**, **Doações de Bits** e **Doações de Kicks** continuam aparecendo normalmente na tela!

---

## 📥 Como Baixar

1. Baixe o arquivo comprimido da extensão:
   - **[Download Direto do ZIP (GitHub)](https://github.com/lucashz/stream-chat-cleaner/archive/refs/heads/main.zip)**
2. Extraia o arquivo `.zip` em qualquer pasta no seu computador (por exemplo, na pasta `Documentos` ou `Downloads`).
3. Uma pasta contendo os arquivos da extensão (como `manifest.json`, `styles.css`, `content.js`, etc.) será criada.

---

## 🚀 Como Instalar no Seu Navegador (Menos de 1 minuto)

A extensão é em formato **Universal Manifest V3**, funcionando em todos os navegadores modernos:

### 🔴 Opera & Opera GX
1. Digite na barra de endereços: `opera://extensions`
2. No canto superior direito da tela, ative a chave **"Modo do desenvolvedor"** (*Developer mode*).
3. Clique no botão **"Carregar extensão descompactada"** (*Load unpacked*).
4. Selecione a pasta que você extraiu no Passo 1 e confirme.
5. Abra a Kick ou Twitch e dê **F5** na live para ativar a limpeza!

---

### 🟡 Google Chrome / Brave / Edge
1. Digite na barra de endereços: `chrome://extensions`
2. No canto superior direito da tela, ative a chave **"Modo do desenvolvedor"** (*Developer mode*).
3. Clique no botão **"Carregar sem compactação"** (*Load unpacked*).
4. Selecione a pasta que você extraiu no Passo 1 e confirme.
5. Abra a live da Kick ou Twitch e pressione **F5**!

---

### 🦊 Mozilla Firefox
1. Abra o Firefox e digite: `about:debugging#/runtime/this-firefox`
2. Clique no botão **"Carregar extensão temporária..."** (*Load Temporary Add-on...*).
3. Entre na pasta que você extraiu e selecione o arquivo:
   ```
   manifest.json
   ```
4. Pronto! O Firefox carregará a extensão instantaneamente. Abra a live e dê **F5**.

---

## ⚙️ Principais Recursos

- **Zero Flicker (:has() CSS Engine):** As mensagens de spam de pontos são suprimidas instantaneamente pelo motor de estilos do navegador antes mesmo da pintura dos pixels na tela.
- **Preservação de Eventos Nobres:** Subscriptions (inscrições normais e de presente), doações em Bits e Kicks nunca são afetadas.
- **Filtro Customizável por Palavra-Chave:** No ícone da extensão, você pode optar por ocultar todos os resgates ou bloquear apenas recompensas específicas (ex: bloquear apenas `PokeIdle` e permitir outras).
- **Suporte Total a SPA:** Funciona continuamente ao trocar de canal ou streamer sem quebrar o monitoramento.

---

## 🛠️ Ferramenta para Desenvolvedores: Inspetor Playwright

O projeto inclui o script `inspect-rewards.js` para monitorar e capturar o DOM de novos tipos de recompensas e seletores da Kick em tempo real:

```bash
# Instalação de dependências
npm install

# Executar monitorando um canal específico (com interface visível)
node inspect-rewards.js https://kick.com/xqc --headed
```
O script gera automaticamente o relatório `reward-dom-dump.html` com a árvore de seletores e o HTML capturado.
