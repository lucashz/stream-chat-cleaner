/**
 * Stream Chat Rewards Inspector (Playwright)
 * Captures, analyzes and dumps live reward redemption DOM elements from Kick.com
 *
 * Usage:
 *   node inspect-rewards.js [streamUrl] [--headed] [--output=filename.html]
 * Example:
 *   node inspect-rewards.js https://kick.com/xqc --headed
 */

const fs = require('fs');
const path = require('path');

let chromium;
try {
  chromium = require('playwright').chromium;
} catch (e1) {
  try {
    chromium = require('@playwright/test').chromium;
  } catch (e2) {
    try {
      chromium = require('d:/lsk/StreamOS/node_modules/@playwright/test').chromium;
    } catch (e3) {
      console.error('\x1b[31m[ERROR]\x1b[0m Playwright não encontrado.');
      process.exit(1);
    }
  }
}

const args = process.argv.slice(2);
const isHeaded = args.includes('--headed') || !args.includes('--headless');
const outputArg = args.find((a) => a.startsWith('--output='));
const outputFile = outputArg ? outputArg.split('=')[1] : path.join(__dirname, 'reward-dom-dump.html');
const targetUrl = args.find((a) => !a.startsWith('--')) || 'https://kick.com/xqc';

console.log('\x1b[36m%s\x1b[0m', '==========================================================');
console.log('\x1b[32m%s\x1b[0m', '   KICK REWARD INSPECTOR - PLAYWRIGHT DOM EXTRACTOR');
console.log('\x1b[36m%s\x1b[0m', '==========================================================');
console.log(`\x1b[33mAlvo:\x1b[0m ${targetUrl}`);
console.log(`\x1b[33mModo:\x1b[0m ${isHeaded ? 'Headed (janela visível)' : 'Headless'}`);
console.log(`\x1b[33mArquivo de saída:\x1b[0m ${outputFile}`);
console.log('----------------------------------------------------------');

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: !isHeaded,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-size=1366,768'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'pt-BR'
  });

  const page = await context.newPage();
  let captured = false;

  await page.exposeFunction('onRewardDetected', async (payload) => {
    if (captured) return;
    captured = true;

    console.log('\n\x1b[32m%s\x1b[0m', '🎉 [SUCESSO] Recompensa de chat detectada no DOM da Kick!');
    console.log('\x1b[36m----------------------------------------------------------\x1b[0m');
    console.log('\x1b[33m[Texto Capturado]:\x1b[0m', payload.text);
    console.log('\x1b[33m[Árvore de Seletores (Hierarchy)]:\x1b[0m');
    console.log(`  \x1b[35m${payload.selectorPath}\x1b[0m`);
    console.log('\x1b[33m[Classes do Container]:\x1b[0m', payload.containerClasses);

    const htmlReport = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Kick Reward DOM Dump - ${new Date().toISOString()}</title>
  <style>
    body { background-color: #0b0e14; color: #e6edf3; font-family: monospace; padding: 24px; }
    h1, h2 { color: #53fc18; }
    .meta-box { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .code-block { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 16px; overflow-x: auto; white-space: pre-wrap; }
    .preview { background: #181b1f; border-left: 4px solid #53fc18; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <h1>Kick Reward DOM Extraction Report</h1>
  <div class="meta-box">
    <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
    <div><strong>URL da Live:</strong> ${targetUrl}</div>
    <div><strong>Texto Detectado:</strong> ${payload.text}</div>
  </div>

  <h2>1. Caminho de Seletores CSS</h2>
  <div class="code-block">${payload.selectorPath}</div>

  <h2>2. Classes CSS do Wrapper</h2>
  <div class="code-block">${payload.containerClasses}</div>

  <h2>3. OuterHTML Completo</h2>
  <div class="code-block">${escapeHtml(payload.outerHTML)}</div>

  <h2>4. Preview Renderizado</h2>
  <div class="preview">${payload.outerHTML}</div>
</body>
</html>`;

    fs.writeFileSync(outputFile, htmlReport, 'utf8');
    console.log('\x1b[32m%s\x1b[0m', `✔ Relatório salvo em: ${outputFile}`);
    setTimeout(async () => {
      await browser.close();
      process.exit(0);
    }, 1500);
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  try {
    console.log(`Conectando a ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('Aguardando container de chat carregar...');
    await page.waitForSelector('#chatroom-messages, [id="chatroom-messages"], #channel-chatroom', { timeout: 30000 });

    console.log('\x1b[32m✔ Chat localizado!\x1b[0m Monitorando em tempo real...');

    await page.evaluate(() => {
      function getSelectorPath(el) {
        const path = [];
        let curr = el;
        while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.body) {
          let sel = curr.tagName.toLowerCase();
          if (curr.id) {
            sel += '#' + curr.id;
            path.unshift(sel);
            break;
          } else {
            let sib = curr;
            let nth = 1;
            while ((sib = sib.previousElementSibling)) {
              if (sib.tagName.toLowerCase() === curr.tagName.toLowerCase()) nth++;
            }
            if (curr.hasAttribute('data-index')) {
              sel += `[data-index="${curr.getAttribute('data-index')}"]`;
            } else if (curr.className && typeof curr.className === 'string') {
              const cleanClasses = curr.className
                .trim()
                .split(/\s+/)
                .filter((c) => !c.includes(':') && !c.includes('/') && !c.includes('[') && !c.includes(']'));
              if (cleanClasses.length > 0) {
                sel += '.' + cleanClasses.slice(0, 2).join('.');
              }
              sel += `:nth-of-type(${nth})`;
            }
          }
          path.unshift(sel);
          curr = curr.parentElement;
        }
        return path.join(' > ');
      }

      function inspectNode(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

        const pEl = node.tagName.toLowerCase() === 'p' && node.classList.contains('line-clamp-2')
          ? node
          : (node.querySelector ? node.querySelector('p.line-clamp-2') : null);

        const hasBorderL4 = node.classList.contains('border-l-4') ||
          (node.querySelector ? !!node.querySelector('.border-l-4') : false);

        const text = node.textContent || '';
        const hasRedeemVerb = /\b(resgatou|redeemed)\b/i.test(text);

        if (pEl || (hasBorderL4 && hasRedeemVerb) || (hasRedeemVerb && !/:\s*\S+/.test(text))) {
          const row = node.closest('[data-index]') || node.closest('.px-px') || node;
          window.onRewardDetected({
            text: text.trim().slice(0, 200),
            containerClasses: row.className,
            selectorPath: getSelectorPath(row),
            outerHTML: row.outerHTML
          });
        }
      }

      // Check existing
      document.querySelectorAll('#chatroom-messages [data-index], .px-px').forEach(inspectNode);

      // Observe mutations
      const chatroom = document.getElementById('chatroom-messages') || document.body;
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (n.nodeType === Node.ELEMENT_NODE) {
              inspectNode(n);
              if (n.children) {
                for (let i = 0; i < n.children.length; i++) inspectNode(n.children[i]);
              }
            }
          }
        }
      });

      observer.observe(chatroom, { childList: true, subtree: true });
    });

    await new Promise((resolve) => setTimeout(resolve, 600000));
    await browser.close();
  } catch (err) {
    console.error('\x1b[31m[ERRO]:\x1b[0m', err.message);
    await browser.close();
    process.exit(1);
  }
})();
