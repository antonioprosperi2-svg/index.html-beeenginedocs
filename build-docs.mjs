// Applica lo stile e lo script comuni a tutte le pagine della documentazione.
//
//   node build-docs.mjs          scrive le modifiche
//   node build-docs.mjs --check  non scrive: elenca solo le pagine da aggiornare
//
// Sorgenti: bee-docs.css (stile) e bee-docs.js (script).
// Ogni pagina resta un file HTML autonomo, pronto da incollare in WordPress:
// lo script sostituisce il primo <style> e l'ultimo <script> con questi due file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const check = process.argv.includes('--check');

const css = fs.readFileSync(path.join(root, 'bee-docs.css'), 'utf8').replace(/\r\n/g, '\n').trim();
const js = fs.readFileSync(path.join(root, 'bee-docs.js'), 'utf8').replace(/\r\n/g, '\n').trim();

// Emoji usate come icone: 📁 cartella, 🌐 link utili, 🐞 🐙 📦 link esterni
const ICON = '(?:\\u{1F4C1}|\\u{1F310}|\\u{1F41E}|\\u{1F419}|\\u{1F4E6})\\uFE0F?';

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.name.endsWith('.html')) out.push(full);
    }
    return out;
}

// ---------------------------------------------------------------------------
// Blocchi di codice
//
// Un formatter HTML (format on save) va a capo dentro i <span> e sostituisce
// il rientro del codice con quello dell'HTML: gli esempi perdono l'indentazione.
// Qui i blocchi diventano <pre>, che i formatter non toccano, e quelli gia'
// rovinati vengono re-indentati dalla profondita' di parentesi.
// ---------------------------------------------------------------------------
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const visible = (line) => decode(line.replace(/<[^>]*>/g, ''));

// una spaziatura con a capo dentro un tag (<span\n   class="...">) diventa uno spazio
const joinTagBreaks = (s) => s.replace(/<[^>]*>/g, (tag) => tag.replace(/\s*\n\s*/g, ' '));

// eventi di parentesi di una riga (+1 apre, -1 chiude), ignorando stringhe e commenti
function scanLine(text, state) {
    const events = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];
        if (state.block) { if (ch === '*' && next === '/') { state.block = false; i++; } continue; }
        if (state.quote) {
            if (ch === '\\') { i++; continue; }
            if (ch === state.quote) state.quote = null;
            continue;
        }
        if (ch === '/' && next === '/') break;
        if (ch === '/' && next === '*') { state.block = true; i++; continue; }
        if (ch === "'" || ch === '"' || ch === '`') { state.quote = ch; continue; }
        if (ch === '(' || ch === '[' || ch === '{') events.push(1);
        else if (ch === ')' || ch === ']' || ch === '}') events.push(-1);
    }
    if (state.quote === "'" || state.quote === '"') state.quote = null; // stringa non chiusa: fine riga
    return events;
}

// Ogni apertura ricorda il livello della riga in cui e' nata: `({` su una riga
// vale un solo livello, e `})` torna al livello della riga che apriva.
function reindent(lines) {
    const state = { block: false, quote: null };
    const stack = [];
    return lines.map((line, index) => {
        const text = visible(line).trim();
        if (!text) return '';
        let lead = 0;
        while (lead < text.length && ')]}'.includes(text[lead])) lead++;
        const events = scanLine(text, state);

        let level;
        let i = 0;
        if (lead > 0) {
            let popped = 0;
            for (; i < lead && i < events.length; i++) popped = stack.length ? stack.pop() : 0;
            level = popped;
        } else {
            level = stack.length ? stack[stack.length - 1] + 1 : 0;
        }
        for (; i < events.length; i++) {
            if (events[i] > 0) stack.push(level);
            else if (stack.length) stack.pop();
        }
        if (text[0] === '.') level += 1;
        return (index === 0 ? '' : ' '.repeat(level * 4)) + line.trim();
    });
}
function fixCodeBlock(tag, inner) {
    const mangled = /<[^>]*\n[^>]*>/.test(inner);
    const tree = /[\u251C\u2514\u2502]/.test(inner);
    let body = inner;

    if (mangled) {
        body = joinTagBreaks(body);
        // il formatter spezza anche i commenti `//` e le stringhe lunghe: li riunisco
        body = body.replace(/<span class="(token (?:comment|string)|bee-cm)">([\s\S]*?)<\/span>/g, (all, kind, text) => {
            const plain = decode(text).trimStart();
            const oneLine = plain.startsWith('//') || plain.startsWith("'") || plain.startsWith('"');
            return oneLine ? all.replace(/[ \t]*\n[ \t]*/g, ' ') : all;
        });
        if (!tree) {
            const before = body.trim().split('\n').map((l) => l.trim());
            const lines = reindent(body.trim().split('\n'));
            const after = lines.map((l) => l.trim());
            // il testo deve restare identico: cambia solo il rientro
            if (before.join('\n') === after.join('\n')) body = lines.join('\n');
        }
    }

    body = body.replace(/^\s+/, '').replace(/\s+$/, '');
    return `<pre class="bee-code-block">${body}</pre>`;
}

function fixCodeBlocks(html) {
    return html.replace(/<(div|pre) class="bee-code-block">([\s\S]*?)<\/\1>/g, (all, tag, inner) => {
        // blocco gia' convertito e integro: lo lascio com'e'
        if (tag === 'pre' && !/<[^>]*\n[^>]*>/.test(inner)) return all;
        return fixCodeBlock(tag, inner);
    });
}

// la cartella con la pagina corrente si apre anche senza JavaScript
function openCurrentGroup(aside) {
    return aside.replace(/<details(?: open)?>([\s\S]*?)<\/details>/g, (all, inner) =>
        /class="is-current"/.test(inner) ? `<details open>${inner}</details>` : all);
}

function transform(html) {
    let out = html;

    // 1. stile comune (primo <style>)
    const s = out.indexOf('<style>');
    const e = out.indexOf('</style>', s);
    if (s === -1 || e === -1) return null;
    out = out.slice(0, s + '<style>'.length) + '\n' + css + '\n' + out.slice(e);

    // 2. script comune (ultimo <script>)
    const ss = out.lastIndexOf('<script>');
    const se = out.indexOf('</script>', ss);
    if (ss === -1 || se === -1) return null;
    out = out.slice(0, ss + '<script>'.length) + '\n' + js + '\n' + out.slice(se);

    // 3. emoji -> niente: l'icona della cartella la disegna il CSS
    out = out.replace(new RegExp('(<summary>)\\s*' + ICON + '\\s*', 'gu'), '$1');
    out = out.replace(new RegExp('(<h3>)\\s*' + ICON + '\\s*', 'gu'), '$1');
    out = out.replace(/<aside class="bee-docs-sidebar">[\s\S]*?<\/aside>/, (aside) =>
        openCurrentGroup(
            aside.replace(new RegExp('(>)\\s*' + ICON + '\\s*', 'gu'), '$1')
                .replace(/(<summary>)([^<]*?)\s+(<\/summary>)/g, '$1$2$3')
                .replace(/<div class="bee-sidebar-title">[^<]*<\/div>/, '<div class="bee-sidebar-title">Documentazione</div>')
        )
    );

    // 4. blocchi di codice: <pre> e rientro ripristinato
    out = fixCodeBlocks(out);

    return out;
}

let changed = 0;
let skipped = 0;
for (const file of walk(root)) {
    const buf = fs.readFileSync(file);
    if (buf.length === 0) { skipped++; console.log('salto (vuoto):', path.relative(root, file)); continue; }

    const bom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
    let text = buf.toString('utf8');
    if (bom) text = text.slice(1);
    const eol = text.includes('\r\n') ? '\r\n' : '\n';

    const next = transform(text.replace(/\r\n/g, '\n'));
    if (next === null) { skipped++; console.log('salto (manca <style> o <script>):', path.relative(root, file)); continue; }

    const result = (bom ? '\uFEFF' : '') + next.replace(/\n/g, eol);
    if (result === (bom ? '\uFEFF' : '') + text) continue;

    changed++;
    console.log((check ? 'da aggiornare: ' : 'aggiornato: ') + path.relative(root, file));
    if (!check) fs.writeFileSync(file, result, 'utf8');
}

console.log(`\n${check ? 'Da aggiornare' : 'Aggiornate'}: ${changed} pagine. Saltate: ${skipped}.`);
