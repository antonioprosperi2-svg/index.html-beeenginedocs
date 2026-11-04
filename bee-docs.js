(function () {
    if (window.__beeDocsInit) return;
    window.__beeDocsInit = true;

    /* ============================================================
       1. PULSANTE "COPIA CODICE" (auto-applicato a .bee-code-block e <pre><code>)
       ============================================================ */
    function copyText(text, btn) {
        var done = function () {
            btn.textContent = '✔ Copiato';
            btn.classList.add('bee-copied');
            setTimeout(function () {
                btn.textContent = '⧉ Copia codice';
                btn.classList.remove('bee-copied');
            }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
        } else {
            fallback(text, done);
        }
    }

    function fallback(text, done) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { }
        document.body.removeChild(ta);
    }

    /* Rimuove il rientro comune ereditato dall'indentazione dell'HTML,
       senza toccare la struttura relativa del codice */
    function dedent(block) {
        var lines = block.innerHTML.split('\n');
        if (lines.length < 2) return;

        var min = Infinity;
        for (var i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            var pad = lines[i].match(/^[ \t]*/)[0].length;
            if (pad < min) min = pad;
        }
        if (!min || min === Infinity) return;

        var re = new RegExp('^[ \\t]{0,' + min + '}');
        for (var j = 1; j < lines.length; j++) lines[j] = lines[j].replace(re, '');
        block.innerHTML = lines.join('\n').replace(/^\s*\n/, '').replace(/\s+$/, '');
    }

    function enhance(block) {
        if (block.dataset.beeCopy === '1') return;
        block.dataset.beeCopy = '1';
        dedent(block);

        var wrap = document.createElement('div');
        wrap.className = 'bee-code-wrap';
        block.parentNode.insertBefore(wrap, block);
        wrap.appendChild(block);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bee-copy-btn';
        btn.textContent = '⧉ Copia codice';
        btn.setAttribute('aria-label', 'Copia il codice');
        btn.addEventListener('click', function () {
            copyText(block.innerText.replace(/^\s*\n/, '').replace(/\s+$/, ''), btn);
        });
        wrap.appendChild(btn);
        block.classList.add('bee-has-copy');
    }

    function initCopy() {
        var blocks = document.querySelectorAll('.bee-code-block');
        for (var i = 0; i < blocks.length; i++) enhance(blocks[i]);

        var codes = document.querySelectorAll('.bee-docs-content pre > code');
        for (var j = 0; j < codes.length; j++) enhance(codes[j].parentNode);
    }

    /* ============================================================
       2. BARRA LATERALE: pagina corrente, cartella aperta, ricerca
       ============================================================ */
    function initSidebar() {
        var side = document.querySelector('.bee-docs-sidebar');
        if (!side || side.dataset.beeSide === '1') return;
        side.dataset.beeSide = '1';

        var groups = Array.prototype.slice.call(side.querySelectorAll('details'));

        /* 2a. pagina corrente: se manca is-current, la cerco dal titolo della barra in alto */
        if (!side.querySelector('a.is-current')) {
            var titleEl = document.querySelector('.bee-header-title');
            var title = titleEl ? titleEl.textContent.replace(/\s+/g, '').toLowerCase() : '';
            if (title) {
                var links = side.querySelectorAll('a');
                for (var i = 0; i < links.length; i++) {
                    var name = links[i].textContent.replace(/\s+/g, '').toLowerCase().replace(/\.js$/, '');
                    if (name === title) { links[i].classList.add('is-current'); break; }
                }
            }
        }

        /* 2b. apre la cartella della pagina corrente e porta il link in vista */
        var current = side.querySelector('a.is-current');
        if (current) {
            var parent = current.closest('details');
            if (parent) parent.open = true;
            /* scorre solo la barra laterale, mai la pagina */
            if (side.scrollHeight > side.clientHeight) {
                side.scrollTop = Math.max(0, current.offsetTop - side.clientHeight / 2);
            }
        }

        /* 2c. su schermi stretti l'indice si apre e si chiude con un pulsante
           (senza JavaScript resta sempre aperto) */
        /* Pulsante, ricerca e messaggio "nessun risultato" sono gia' nell'HTML
           (li mette build-docs.mjs): cosi' la pagina non cambia altezza dopo il
           caricamento. Se mancano (pagina vecchia) li creo qui. */
        var toggle = side.querySelector('.bee-sidebar-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'bee-sidebar-toggle';
            toggle.setAttribute('aria-expanded', 'false');
            var currentName = current ? current.textContent.replace(/\s+/g, ' ').trim() : '';
            toggle.textContent = currentName ? 'Indice · ' + currentName : 'Indice della documentazione';
            side.insertBefore(toggle, side.firstChild);
        }
        toggle.addEventListener('click', function () {
            var open = side.classList.toggle('bee-side-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        /* 2d. ricerca */
        var wrap = side.querySelector('.bee-sidebar-search');
        var input = wrap && wrap.querySelector('input');
        if (!input) {
            wrap = document.createElement('div');
            wrap.className = 'bee-sidebar-search';
            input = document.createElement('input');
            input.type = 'search';
            input.placeholder = 'Cerca una classe…';
            input.setAttribute('aria-label', 'Cerca nella documentazione');
            input.autocomplete = 'off';
            input.spellcheck = false;
            var hint = document.createElement('kbd');
            hint.textContent = '/';
            hint.setAttribute('aria-hidden', 'true');
            wrap.appendChild(input);
            wrap.appendChild(hint);
            var title0 = side.querySelector('.bee-sidebar-title');
            if (title0 && title0.nextSibling) {
                side.insertBefore(wrap, title0.nextSibling);
            } else {
                side.insertBefore(wrap, side.firstChild);
            }
        }

        var empty = side.querySelector('.bee-sidebar-empty');
        if (!empty) {
            empty = document.createElement('div');
            empty.className = 'bee-sidebar-empty';
            empty.textContent = 'Nessuna classe trovata.';
            side.insertBefore(empty, wrap.nextSibling);
        }

        var openBefore = null;

        function filter() {
            var q = input.value.trim().toLowerCase();

            if (q && openBefore === null) {
                openBefore = groups.map(function (g) { return g.open; });
            }

            var anyVisible = false;
            groups.forEach(function (g) {
                var items = g.querySelectorAll('li');
                var visible = 0;
                for (var i = 0; i < items.length; i++) {
                    var text = items[i].textContent.replace(/\s+/g, ' ').toLowerCase();
                    var hit = !q || text.indexOf(q) !== -1;
                    items[i].style.display = hit ? '' : 'none';
                    if (hit) visible++;
                }
                g.style.display = visible ? '' : 'none';
                if (q && visible) g.open = true;
                if (visible) anyVisible = true;
            });
            empty.style.display = q && !anyVisible ? 'block' : 'none';

            if (!q && openBefore) {
                groups.forEach(function (g, idx) { g.open = openBefore[idx]; });
                openBefore = null;
            }
        }

        input.addEventListener('input', filter);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                input.value = '';
                filter();
                input.blur();
            } else if (e.key === 'Enter') {
                var first = side.querySelector('details li:not([style*="display: none"]) a');
                if (first) first.click();
            }
        });

        /* "/" porta il cursore nella ricerca (se non stai scrivendo altrove) */
        document.addEventListener('keydown', function (e) {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
            var t = e.target;
            var tag = t && t.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
            e.preventDefault();
            input.focus();
            input.select();
        });
    }

    function init() {
        initCopy();
        initSidebar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
