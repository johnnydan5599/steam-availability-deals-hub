// webkit/index.tsx
// Injected into Steam store pages (store.steampowered.com/app/*)
// This file is compiled by millennium-ttc into .millennium/Dist/webkit.js

export default async function WebkitMain() {

    if (!/^\/app\/\d+/.test(window.location.pathname)) return;

    // ── Storage helpers ────────────────────────────────────────────────────────
    function saveCustom(key: string, data: any[]) {
        try { localStorage.setItem('shub_' + key, JSON.stringify(data)); } catch (e) { }
    }
    function loadCustom(key: string): any[] {
        try { return JSON.parse(localStorage.getItem('shub_' + key) || '[]') || []; } catch (e) { return []; }
    }
    function addCustom(key: string, site: any) {
        const d = loadCustom(key); d.push(site); saveCustom(key, d);
    }
    function removeCustom(key: string, site: any) {
        saveCustom(key, loadCustom(key).filter((s: any) => s.url !== site.url || s.text !== site.text));
    }

    // ── Game name ──────────────────────────────────────────────────────────────
    function getGameName(): string {
        const el = document.querySelector('.apphub_AppName');
        if (el && el.textContent?.trim()) return el.textContent.trim().replace(/[™®©]/g, '').trim();
        const parts = window.location.pathname.split('/');
        const idx = parts.indexOf('app') + 2;
        return (idx > 1 && parts[idx]) ? decodeURIComponent(parts[idx].replace(/_/g, ' ')) : '';
    }

    function buildUrl(site: any): string {
        const name = getGameName();
        const fmt = encodeURIComponent(name).replace(/%20/g, '+');
        return site.url.includes('{{G}}')
            ? site.url.replace(/\{\{G\}\}/g, fmt)
            : site.url + encodeURIComponent(name);
    }

    // ── Open URL in OS default browser (Edge, Firefox, Chrome — whatever is set)
    function openUrl(url: string) {
        if (typeof (window as any).SteamClient !== 'undefined' &&
            (window as any).SteamClient?.System?.OpenInDefaultBrowser) {
            (window as any).SteamClient.System.OpenInDefaultBrowser(url);
        } else {
            window.location.href = 'steam://openurl_external/' + url;
        }
    }

    // ── Styles ─────────────────────────────────────────────────────────────────
    const CSS = [
        '#shub-root{margin-top:16px;padding:16px 20px 20px;background:rgba(0,0,0,0.25);border-radius:4px}',
        '.shub-sec{margin-bottom:22px}.shub-sec:last-child{margin-bottom:0}',
        '.shub-hdr{font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8f98a0;margin-bottom:10px}',
        '.shub-grid{display:flex;flex-wrap:wrap;gap:8px}',
        '.shub-bw{position:relative;display:inline-block}',
        '.shub-btn{display:flex;align-items:center;justify-content:center;min-width:145px;height:34px;padding:0 12px;',
        'background:rgba(103,193,245,.13);color:#67c1f5;font-size:13px;border-radius:3px;',
        'border:none;cursor:pointer;white-space:nowrap;transition:background .15s}',
        '.shub-btn:hover{background:rgba(103,193,245,.26);color:#c6e8ff}',
        '.shub-del{position:absolute;top:-5px;right:-5px;background:#c0392b;color:#fff;border:none;',
        'width:16px;height:16px;border-radius:50%;cursor:pointer;font-size:9px;',
        'line-height:16px;text-align:center;display:none;z-index:10;padding:0}',
        '.shub-ctrl{margin-top:10px}',
        '.shub-addbtn{background:linear-gradient(to right,#6fa720 5%,#588a1b 95%);color:#d2efa9;',
        'border:none;padding:7px 14px;cursor:pointer;border-radius:3px;font-size:12px;font-weight:500;transition:color .15s}',
        '.shub-addbtn:hover{color:#fff}',
        '.shub-form{display:none;flex-direction:column;gap:5px;margin-top:8px}',
        '.shub-inp{padding:6px 10px;background:rgba(0,0,0,.35);border:1px solid rgba(103,193,245,.2);',
        'border-radius:3px;color:#c7d5e0;font-size:13px;width:300px;max-width:100%;box-sizing:border-box}',
        '.shub-inp:focus{outline:none;border-color:#67c1f5}',
        '.shub-inp::placeholder{color:rgba(199,213,224,.4)}',
        '.shub-fg{display:flex;gap:5px}',
        '.shub-save{background:linear-gradient(to right,#6fa720 5%,#588a1b 95%);color:#fff;border:none;',
        'padding:7px 14px;cursor:pointer;border-radius:3px;font-size:12px;font-weight:500;flex:1}',
        '.shub-cancel{background:#637080;color:#fff;border:none;padding:7px 14px;',
        'cursor:pointer;border-radius:3px;font-size:12px;font-weight:500;flex:1}',
        '.shub-title{font-size:12px;color:#8f98a0;letter-spacing:.04em;margin-bottom:14px;',
        'padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}',
    ].join('');

    function injectStyles() {
        if (document.getElementById('shub-style')) return;
        const s = document.createElement('style');
        s.id = 'shub-style'; s.textContent = CSS;
        document.head.appendChild(s);
    }

    // ── Button factory ─────────────────────────────────────────────────────────
    function makeBtn(site: any, removable: boolean, onRemove: (() => void) | null): HTMLDivElement & { _del?: HTMLButtonElement } {
        const wrap: HTMLDivElement & { _del?: HTMLButtonElement } = document.createElement('div');
        wrap.className = 'shub-bw';
        const btn = document.createElement('button');
        btn.className = 'shub-btn'; btn.textContent = site.text;
        btn.title = 'Search on ' + site.text;
        btn.onclick = () => openUrl(buildUrl(site));
        wrap.appendChild(btn);
        if (removable) {
            const del = document.createElement('button');
            del.className = 'shub-del'; del.textContent = '✕'; del.title = 'Remove';
            del.onclick = () => { wrap.remove(); if (onRemove) onRemove(); };
            wrap._del = del; wrap.appendChild(del);
        }
        return wrap;
    }

    // ── Section factory ────────────────────────────────────────────────────────
    function makeSection(label: string, icon: string, sites: any[], storageKey: string): HTMLDivElement {
        const sec = document.createElement('div'); sec.className = 'shub-sec';
        const hdr = document.createElement('div'); hdr.className = 'shub-hdr';
        hdr.innerHTML = icon + '&nbsp;&nbsp;' + label; sec.appendChild(hdr);
        const grid = document.createElement('div'); grid.className = 'shub-grid';
        sites.forEach(s => grid.appendChild(makeBtn(s, false, null)));
        sec.appendChild(grid);

        const ctrl = document.createElement('div'); ctrl.className = 'shub-ctrl';
        const addBtn = document.createElement('button'); addBtn.className = 'shub-addbtn'; addBtn.textContent = '+ Add Custom Search';
        const form = document.createElement('div'); form.className = 'shub-form';
        const nameInp = document.createElement('input'); nameInp.className = 'shub-inp'; nameInp.type = 'text';
        nameInp.placeholder = 'Site name (e.g. PCGamingWiki)'; nameInp.setAttribute('autocomplete', 'off');
        const urlInp = document.createElement('input'); urlInp.className = 'shub-inp'; urlInp.type = 'text';
        urlInp.placeholder = 'Search for the game on your desired site & paste the URL here'; urlInp.setAttribute('autocomplete', 'off');
        const fg = document.createElement('div'); fg.className = 'shub-fg';
        const saveBtn = document.createElement('button'); saveBtn.className = 'shub-save'; saveBtn.textContent = 'Save';
        const cancelBtn = document.createElement('button'); cancelBtn.className = 'shub-cancel'; cancelBtn.textContent = 'Cancel';
        fg.appendChild(saveBtn); fg.appendChild(cancelBtn);
        form.appendChild(nameInp); form.appendChild(urlInp); form.appendChild(fg);

        const delBtns: HTMLButtonElement[] = [];
        let editMode = false;
        const setEdit = (on: boolean) => {
            editMode = on; form.style.display = on ? 'flex' : 'none';
            delBtns.forEach(b => b.style.display = on ? 'block' : 'none');
        };
        addBtn.onclick = () => setEdit(!editMode);
        cancelBtn.onclick = () => setEdit(false);
        saveBtn.onclick = () => {
            const nm = nameInp.value.trim(); const rawUrl = urlInp.value.trim();
            if (!nm) { alert('Please enter a site name.'); return; }
            if (!rawUrl || !rawUrl.includes('=')) {
                alert('Please enter a valid search URL that contains "=".\nExample: https://example.com/search?q=red+dead'); return;
            }
            const base = rawUrl.substring(0, rawUrl.lastIndexOf('=') + 1);
            const site = { url: base + '{{G}}', text: nm };
            addCustom(storageKey, site);
            const newBtn = makeBtn(site, true, () => removeCustom(storageKey, site));
            if (newBtn._del) { delBtns.push(newBtn._del); newBtn._del.style.display = editMode ? 'block' : 'none'; }
            grid.appendChild(newBtn); nameInp.value = ''; urlInp.value = ''; setEdit(false);
        };
        loadCustom(storageKey).forEach(site => {
            const btn = makeBtn(site, true, () => removeCustom(storageKey, site));
            if (btn._del) delBtns.push(btn._del); grid.appendChild(btn);
        });
        ctrl.appendChild(addBtn); ctrl.appendChild(form); sec.appendChild(ctrl);
        return sec;
    }

    // ── Site lists ─────────────────────────────────────────────────────────────
    const AVAILABILITY = [
        { url: 'https://www.pcgamingwiki.com/w/index.php?search={{G}}', text: 'PCGamingWiki' },
        { url: 'https://steamdb.info/search/?a=app&q={{G}}', text: 'SteamDB' },
        { url: 'https://howlongtobeat.com/?q={{G}}', text: 'HowLongToBeat' },
    ];
    const DEALS = [
        { url: 'https://store.epicgames.com/en-US/browse?q={{G}}', text: 'Epic Games' },
        { url: 'https://www.gog.com/en/games?query={{G}}', text: 'GOG' },
        { url: 'https://www.humblebundle.com/store/search?sort=discount&search={{G}}', text: 'Humble Store' },
        { url: 'https://www.greenmangaming.com/search?query={{G}}', text: 'Green Man Gaming' },
        { url: 'https://www.fanatical.com/en/search?search={{G}}', text: 'Fanatical' },
        { url: 'https://www.cdkeys.com/catalogsearch/result/?q={{G}}', text: 'CDKeys' },
        { url: 'https://www.gamebillet.com/search?q={{G}}', text: 'GameBillet' },
    ];

    // ── Mount ──────────────────────────────────────────────────────────────────
    function mount() {
        if (document.getElementById('shub-root')) return;
        injectStyles();
        const root = document.createElement('div'); root.id = 'shub-root';
        const title = document.createElement('div'); title.className = 'shub-title';
        title.textContent = '🔍  Steam Availability & Deals Hub'; root.appendChild(title);
        root.appendChild(makeSection('Availability', '💻', AVAILABILITY, 'availability'));
        root.appendChild(makeSection('Deals', '🏷️', DEALS, 'deals'));
        const anchor =
            document.querySelector('#queueActionsCtn') ||
            document.querySelector('.queue_actions_ctn') ||
            document.querySelector('.game_area_purchase_game_wrapper') ||
            document.querySelector('#game_area_purchase') ||
            document.querySelector('.rightcol');
        if (anchor?.parentNode) anchor.parentNode.insertBefore(root, anchor.nextSibling);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 600));
    } else {
        setTimeout(mount, 600);
    }
}
