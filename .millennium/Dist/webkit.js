const MILLENNIUM_IS_CLIENT_MODULE = false;
const pluginName = "steam-availability-deals-hub";
function InitializePlugins() {
    var _a, _b;
    /**
     * This function is called n times depending on n plugin count,
     * Create the plugin list if it wasn't already created
     */
    (_a = (window.PLUGIN_LIST || (window.PLUGIN_LIST = {})))[pluginName] || (_a[pluginName] = {});
    (_b = (window.MILLENNIUM_PLUGIN_SETTINGS_STORE || (window.MILLENNIUM_PLUGIN_SETTINGS_STORE = {})))[pluginName] || (_b[pluginName] = {});
    window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS || (window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS = {});
    /**
     * Accepted IPC message types from Millennium backend.
     */
    let IPCType;
    (function (IPCType) {
        IPCType[IPCType["CallServerMethod"] = 0] = "CallServerMethod";
    })(IPCType || (IPCType = {}));
    let MillenniumStore = window.MILLENNIUM_PLUGIN_SETTINGS_STORE[pluginName];
    let IPCMessageId = `Millennium.Internal.IPC.[${pluginName}]`;
    let isClientModule = MILLENNIUM_IS_CLIENT_MODULE;
    const ComponentTypeMap = {
        DropDown: ['string', 'number', 'boolean'],
        NumberTextInput: ['number'],
        StringTextInput: ['string'],
        FloatTextInput: ['number'],
        CheckBox: ['boolean'],
        NumberSlider: ['number'],
        FloatSlider: ['number'],
    };
    MillenniumStore.ignoreProxyFlag = false;
    function DelegateToBackend(pluginName, name, value) {
        return MILLENNIUM_BACKEND_IPC.postMessage(IPCType.CallServerMethod, {
            pluginName,
            methodName: '__builtins__.__update_settings_value__',
            argumentList: { name, value },
        });
    }
    async function ClientInitializeIPC() {
        /** Wait for the MainWindowBrowser to not be undefined */
        while (typeof MainWindowBrowserManager === 'undefined') {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        MainWindowBrowserManager?.m_browser?.on('message', (messageId, data) => {
            if (messageId !== IPCMessageId) {
                return;
            }
            const { name, value } = JSON.parse(data);
            MillenniumStore.ignoreProxyFlag = true;
            MillenniumStore.settingsStore[name] = value;
            DelegateToBackend(pluginName, name, value);
            MillenniumStore.ignoreProxyFlag = false;
        });
    }
    if (isClientModule) {
        ClientInitializeIPC();
    }
    const StartSettingPropagation = (name, value) => {
        if (MillenniumStore.ignoreProxyFlag) {
            return;
        }
        if (isClientModule) {
            DelegateToBackend(pluginName, name, value);
            /** If the browser doesn't exist yet, no use sending anything to it. */
            if (typeof MainWindowBrowserManager !== 'undefined') {
                MainWindowBrowserManager?.m_browser?.PostMessage(IPCMessageId, JSON.stringify({ name, value }));
            }
        }
        else {
            /** Send the message to the SharedJSContext */
            SteamClient.BrowserView.PostMessageToParent(IPCMessageId, JSON.stringify({ name, value }));
        }
    };
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    const DefinePluginSetting = (obj) => {
        return new Proxy(obj, {
            set(target, property, value) {
                if (!(property in target)) {
                    throw new TypeError(`Property ${String(property)} does not exist on plugin settings`);
                }
                const settingType = ComponentTypeMap[target[property].type];
                const range = target[property]?.range;
                /** Clamp the value between the given range */
                if (settingType.includes('number') && typeof value === 'number') {
                    if (range) {
                        value = clamp(value, range[0], range[1]);
                    }
                    value || (value = 0); // Fallback to 0 if the value is undefined or null
                }
                /** Check if the value is of the proper type */
                if (!settingType.includes(typeof value)) {
                    throw new TypeError(`Expected ${settingType.join(' or ')}, got ${typeof value}`);
                }
                target[property].value = value;
                StartSettingPropagation(String(property), value);
                return true;
            },
            get(target, property) {
                if (property === '__raw_get_internals__') {
                    return target;
                }
                if (property in target) {
                    return target[property].value;
                }
                return undefined;
            },
        });
    };
    MillenniumStore.DefinePluginSetting = DefinePluginSetting;
    MillenniumStore.settingsStore = DefinePluginSetting({});
}
InitializePlugins()
const __call_server_method__ = (methodName, kwargs) => Millennium.callServerMethod(pluginName, methodName, kwargs)
function __wrapped_callable__(route) {
    if (route.startsWith('webkit:')) {
        return MILLENNIUM_API.callable((methodName, kwargs) => MILLENNIUM_API.__INTERNAL_CALL_WEBKIT_METHOD__(pluginName, methodName, kwargs), route.replace(/^webkit:/, ''));
    }
    return MILLENNIUM_API.callable(__call_server_method__, route);
}
let PluginEntryPointMain = function() { var millennium_main = (function (exports) {
    'use strict';

    // webkit/index.tsx
    // Injected into Steam store pages (store.steampowered.com/app/*)
    // This file is compiled by millennium-ttc into .millennium/Dist/webkit.js
    async function WebkitMain() {
        if (!/^\/app\/\d+/.test(window.location.pathname))
            return;
        // ── Storage helpers ────────────────────────────────────────────────────────
        function saveCustom(key, data) {
            try {
                localStorage.setItem('shub_' + key, JSON.stringify(data));
            }
            catch (e) { }
        }
        function loadCustom(key) {
            try {
                return JSON.parse(localStorage.getItem('shub_' + key) || '[]') || [];
            }
            catch (e) {
                return [];
            }
        }
        function addCustom(key, site) {
            const d = loadCustom(key);
            d.push(site);
            saveCustom(key, d);
        }
        function removeCustom(key, site) {
            saveCustom(key, loadCustom(key).filter((s) => s.url !== site.url || s.text !== site.text));
        }
        // ── Game name ──────────────────────────────────────────────────────────────
        function getGameName() {
            const el = document.querySelector('.apphub_AppName');
            if (el && el.textContent?.trim())
                return el.textContent.trim().replace(/[™®©]/g, '').trim();
            const parts = window.location.pathname.split('/');
            const idx = parts.indexOf('app') + 2;
            return (idx > 1 && parts[idx]) ? decodeURIComponent(parts[idx].replace(/_/g, ' ')) : '';
        }
        function buildUrl(site) {
            const name = getGameName();
            const fmt = encodeURIComponent(name).replace(/%20/g, '+');
            return site.url.includes('{{G}}')
                ? site.url.replace(/\{\{G\}\}/g, fmt)
                : site.url + encodeURIComponent(name);
        }
        // ── Open URL in OS default browser (Edge, Firefox, Chrome — whatever is set)
        function openUrl(url) {
            if (typeof window.SteamClient !== 'undefined' &&
                window.SteamClient?.System?.OpenInDefaultBrowser) {
                window.SteamClient.System.OpenInDefaultBrowser(url);
            }
            else {
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
            if (document.getElementById('shub-style'))
                return;
            const s = document.createElement('style');
            s.id = 'shub-style';
            s.textContent = CSS;
            document.head.appendChild(s);
        }
        // ── Button factory ─────────────────────────────────────────────────────────
        function makeBtn(site, removable, onRemove) {
            const wrap = document.createElement('div');
            wrap.className = 'shub-bw';
            const btn = document.createElement('button');
            btn.className = 'shub-btn';
            btn.textContent = site.text;
            btn.title = 'Search on ' + site.text;
            btn.onclick = () => openUrl(buildUrl(site));
            wrap.appendChild(btn);
            if (removable) {
                const del = document.createElement('button');
                del.className = 'shub-del';
                del.textContent = '✕';
                del.title = 'Remove';
                del.onclick = () => { wrap.remove(); if (onRemove)
                    onRemove(); };
                wrap._del = del;
                wrap.appendChild(del);
            }
            return wrap;
        }
        // ── Section factory ────────────────────────────────────────────────────────
        function makeSection(label, icon, sites, storageKey) {
            const sec = document.createElement('div');
            sec.className = 'shub-sec';
            const hdr = document.createElement('div');
            hdr.className = 'shub-hdr';
            hdr.innerHTML = icon + '&nbsp;&nbsp;' + label;
            sec.appendChild(hdr);
            const grid = document.createElement('div');
            grid.className = 'shub-grid';
            sites.forEach(s => grid.appendChild(makeBtn(s, false, null)));
            sec.appendChild(grid);
            const ctrl = document.createElement('div');
            ctrl.className = 'shub-ctrl';
            const addBtn = document.createElement('button');
            addBtn.className = 'shub-addbtn';
            addBtn.textContent = '+ Add Custom Search';
            const form = document.createElement('div');
            form.className = 'shub-form';
            const nameInp = document.createElement('input');
            nameInp.className = 'shub-inp';
            nameInp.type = 'text';
            nameInp.placeholder = 'Site name (e.g. PCGamingWiki)';
            nameInp.setAttribute('autocomplete', 'off');
            const urlInp = document.createElement('input');
            urlInp.className = 'shub-inp';
            urlInp.type = 'text';
            urlInp.placeholder = 'Search for the game on your desired site & paste the URL here';
            urlInp.setAttribute('autocomplete', 'off');
            const fg = document.createElement('div');
            fg.className = 'shub-fg';
            const saveBtn = document.createElement('button');
            saveBtn.className = 'shub-save';
            saveBtn.textContent = 'Save';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'shub-cancel';
            cancelBtn.textContent = 'Cancel';
            fg.appendChild(saveBtn);
            fg.appendChild(cancelBtn);
            form.appendChild(nameInp);
            form.appendChild(urlInp);
            form.appendChild(fg);
            const delBtns = [];
            let editMode = false;
            const setEdit = (on) => {
                editMode = on;
                form.style.display = on ? 'flex' : 'none';
                delBtns.forEach(b => b.style.display = on ? 'block' : 'none');
            };
            addBtn.onclick = () => setEdit(!editMode);
            cancelBtn.onclick = () => setEdit(false);
            saveBtn.onclick = () => {
                const nm = nameInp.value.trim();
                const rawUrl = urlInp.value.trim();
                if (!nm) {
                    alert('Please enter a site name.');
                    return;
                }
                if (!rawUrl || !rawUrl.includes('=')) {
                    alert('Please enter a valid search URL that contains "=".\nExample: https://example.com/search?q=red+dead');
                    return;
                }
                const base = rawUrl.substring(0, rawUrl.lastIndexOf('=') + 1);
                const site = { url: base + '{{G}}', text: nm };
                addCustom(storageKey, site);
                const newBtn = makeBtn(site, true, () => removeCustom(storageKey, site));
                if (newBtn._del) {
                    delBtns.push(newBtn._del);
                    newBtn._del.style.display = editMode ? 'block' : 'none';
                }
                grid.appendChild(newBtn);
                nameInp.value = '';
                urlInp.value = '';
                setEdit(false);
            };
            loadCustom(storageKey).forEach(site => {
                const btn = makeBtn(site, true, () => removeCustom(storageKey, site));
                if (btn._del)
                    delBtns.push(btn._del);
                grid.appendChild(btn);
            });
            ctrl.appendChild(addBtn);
            ctrl.appendChild(form);
            sec.appendChild(ctrl);
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
            if (document.getElementById('shub-root'))
                return;
            injectStyles();
            const root = document.createElement('div');
            root.id = 'shub-root';
            const title = document.createElement('div');
            title.className = 'shub-title';
            title.textContent = '🔍  Steam Availability & Deals Hub';
            root.appendChild(title);
            root.appendChild(makeSection('Availability', '💻', AVAILABILITY, 'availability'));
            root.appendChild(makeSection('Deals', '🏷️', DEALS, 'deals'));
            const anchor = document.querySelector('#queueActionsCtn') ||
                document.querySelector('.queue_actions_ctn') ||
                document.querySelector('.game_area_purchase_game_wrapper') ||
                document.querySelector('#game_area_purchase') ||
                document.querySelector('.rightcol');
            if (anchor?.parentNode)
                anchor.parentNode.insertBefore(root, anchor.nextSibling);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 600));
        }
        else {
            setTimeout(mount, 600);
        }
    }

    exports.default = WebkitMain;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
 return millennium_main; };
function ExecutePluginModule() {
    let MillenniumStore = window.MILLENNIUM_PLUGIN_SETTINGS_STORE[pluginName];
    function OnPluginConfigChange(key, __, value) {
        if (key in MillenniumStore.settingsStore) {
            MillenniumStore.ignoreProxyFlag = true;
            MillenniumStore.settingsStore[key] = value;
            MillenniumStore.ignoreProxyFlag = false;
        }
    }
    /** Expose the OnPluginConfigChange so it can be called externally */
    MillenniumStore.OnPluginConfigChange = OnPluginConfigChange;
    MILLENNIUM_BACKEND_IPC.postMessage(0, { pluginName: pluginName, methodName: '__builtins__.__millennium_plugin_settings_parser__' }).then(async (response) => {
        /**
         * __millennium_plugin_settings_parser__ will return false if the plugin has no settings.
         * If the plugin has settings, it will return a base64 encoded string.
         * The string is then decoded and parsed into an object.
         */
        if (typeof response.returnValue === 'string') {
            MillenniumStore.ignoreProxyFlag = true;
            /** Initialize the settings store from the settings returned from the backend. */
            MillenniumStore.settingsStore = MillenniumStore.DefinePluginSetting(Object.fromEntries(JSON.parse(atob(response.returnValue)).map((item) => [item.functionName, item])));
            MillenniumStore.ignoreProxyFlag = false;
        }
        /** @ts-ignore: call the plugin main after the settings have been parsed. This prevent plugin settings from being undefined at top level. */
        let PluginModule = PluginEntryPointMain();
        /** Assign the plugin on plugin list. */
        Object.assign(window.PLUGIN_LIST[pluginName], {
            ...PluginModule,
            __millennium_internal_plugin_name_do_not_use_or_change__: pluginName,
        });
        /** Run the rolled up plugins default exported function */
        let pluginProps = await PluginModule.default();
        function isValidSidebarNavComponent(obj) {
            return obj && obj.title !== undefined && obj.icon !== undefined && obj.content !== undefined;
        }
        if (pluginProps && isValidSidebarNavComponent(pluginProps)) {
            window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS[pluginName] = pluginProps;
        }
        else {
            console.warn(`Plugin ${pluginName} does not contain proper SidebarNavigation props and therefor can't be mounted by Millennium. Please ensure it has a title, icon, and content.`);
            return;
        }
        /** If the current module is a client module, post message id=1 which calls the front_end_loaded method on the backend. */
        if (MILLENNIUM_IS_CLIENT_MODULE) {
            MILLENNIUM_BACKEND_IPC.postMessage(1, { pluginName: pluginName });
        }
    });
}
ExecutePluginModule()