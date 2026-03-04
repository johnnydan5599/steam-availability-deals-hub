local logger = require("logger")
local millennium = require("millennium")

-- Called from the frontend via millennium.call_frontend_method
function open_url_callback(url)
    logger:info("open_url_callback called with: " .. tostring(url))
    return "ok"
end

local function on_load()
    logger:info("Steam Availability & Deals Hub loaded")
    millennium.ready()
end

-- Called when your plugin is unloaded (plugin disabled or Steam shutting down).
-- NOTE: If Steam crashes or is force-closed, this may not be called.
local function on_unload()
    logger:info("Steam Availability & Deals Hub unloaded")
end

-- Called when the Steam UI has fully loaded.
local function on_frontend_loaded()
    logger:info("Steam Availability & Deals Hub: frontend loaded")
end

return {
    on_frontend_loaded = on_frontend_loaded,
    on_load = on_load,
    on_unload = on_unload
}
