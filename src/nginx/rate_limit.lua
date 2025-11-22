-- Load the Lua Redis library
local redis = require "resty.redis"
local ipmatcher = require("resty.ipmatcher")


function extract_nth_id(path, id_type, n)
  local patterns = {
    guid = "[a-fA-F0-9]{8}%-[a-fA-F0-9]{4}%-[a-fA-F0-9]{4}%-[a-fA-F0-9]{4}%-[a-fA-F0-9]{12}",
    integer = "%d+",
    ulid = "[0-9A-HJKMNP-TV-Z]{26}"
  }

  local pattern = patterns[id_type]
  if not pattern then
    ngx.log(ngx.ERR, "Unsupported id_type: " .. tostring(id_type))
  end
  if not path then
    ngx.log(ngx.ERR, "Path is nil")
    return nil
  end
  local count = 0
  local start_pos = 1
  while true do
    local s, e = string.find(path, pattern, start_pos)
    if not s then
      return nil
    end

    count = count + 1
    if count == n then
      return string.sub(path, s, e)
    end
    start_pos = e + 1
  end
end

function is_array(table)
  if type(table) ~= 'table' then
    return false
  end

  -- objects always return empty size
  if #table > 0 then
    return true
  end

  -- only object can have empty length with elements inside
  for k, v in pairs(table) do
    return false
  end

  -- if no elements it can be array and not at same time
  return true
end

local function has_value (tab, val)
    for index, value in ipairs(tab) do
        if value == val then
            return true
        end
    end

    return false
end
-- Function to connect to Redis
local function connect_to_redis()
    local red = redis:new()
    local ok, err = red:connect("redis", 6379)
    if not ok then
        ngx.log(ngx.ERR, "Failed to connect to Redis: ", err)
        return nil, err
    end
    return red
end

-- Function to close the Redis connection but only after a timeout so that it goes to the pool
local function close_redis(red)
    if not red then
        return
    end
    -- https://github.com/openresty/lua-resty-redis#check-list-for-issues Need to tune here
    local ok, err = red:set_keepalive(10000, 100)
    if not ok then
        ngx.log(ngx.ERR, "Failed to set Redis keepalive: ", err)
    end
end

local function get_key_value(limit_key)
    local extracted_name = string.match(limit_key, "ngx.var.(.+)")
    if extracted_name then
        if ngx.var[extracted_name] then
            return ngx.var[extracted_name]
        end
        return (limit_key .. ":" .. "nil")
    elseif string.match(limit_key, "extract_nth_id%((.+),%s*(.+),%s*(%d+)%)") then
        local path, id_type, n = string.match(limit_key, "extract_nth_id%((.+),%s*(.+),%s*(%d+)%)")
        n = tonumber(n)
        local extracted_id = extract_nth_id(ngx.var[path], id_type, n)
        if extracted_id then
            return extracted_id
        else
            return (limit_key .. ":" .. "nil")
        end
    end
    return limit_key
end

local function find_best_match(limit_class, ngx, nodes, request_verb, request_uri)
    local best_match = nil
    local best_score = -1

    if not nodes then
        ngx.log(ngx.INFO, "find_best_match: no nodes for class:", limit_class)
        return best_match
    end

    for _, node in ipairs(nodes) do
        local pattern = node.uri

        if pattern == nil then
            pattern = "\\/.*"
        end

        local score = -1
        if (node.verb == nil) or (node.verb == request_verb) or (is_array(node.verb) and has_value(node.verb, request_verb) ) then
            -- Calculate score based on URI pattern match
            local uri_match = ngx.re.match(request_uri, "^" .. pattern .. "$", "jo")

            if uri_match then
                score = score + #uri_match[0]
            end
            -- Update best match if the score is higher
            if score > best_score then
                best_match = node
                best_score = score
            end
       end
    end

    return best_match
end

local function evaluate_condition(ngx, condition)

    if not (condition and condition.lhs and condition.rhs and condition.operator) then
        return nil, "Invalid condition encountered: " .. condition.name
    end

    local lhs_val = nil
    local rhs_val = nil

    if (type(condition.lhs) == "table") then
       lhs_val = evaluate_condition(ngx, condition.lhs)
    else
        lhs_val = get_key_value(condition.lhs)
    end

    if (type(condition.rhs) == "table") then
      rhs_val = evaluate_condition(ngx, condition.rhs)
    else
      rhs_val = get_key_value(condition.rhs)
    end

    if condition.operator == "eq" then
        return lhs_val == rhs_val
    end
    if condition.operator == "neq" then
        return lhs_val ~= rhs_val
    end
    if condition.operator == "lt" then
        return lhs_val < rhs_val
    end
    if condition.operator == "gt" then
        return lhs_val > rhs_val
    end
    if condition.operator == "lte" then
        return lhs_val <= rhs_val
    end
    if condition.operator == "gte" then
        return lhs_val >= rhs_val
    end
    if condition.operator == "and" then
        return lhs_val and rhs_val
    end
    if condition.operator == "or" then
       return lhs_val or rhs_val
    end
    return false
end

local function find_best_limit(ngx, node)
    local i = 1
    local n = #node.limits
    while (i <= n ) do
        limit = node.limits[i]
        i = i + 1
        if limit and limit.condition then
            local result, err = evaluate_condition(ngx, limit.condition)
            if err then
                ngx.log(ngx.ERR, "***** DEBUG: CONDITION EVALUATED WITH ERROR  ", limit.condition.name, err)
            elseif result then
                return limit, nil
            end
        end
    end

    return nil, "failed to match any condition"

end

local function to_hex_string(input_string)
    local hex_string = ""
    for i = 1, #input_string do
        hex_string = hex_string .. string.format("%02x", string.byte(input_string, i))
    end
    return hex_string
end

local function amalgamate_key(ngx, node)
    if not node then
        return nil, "invalid node"
    end
     if not ngx then
            return nil, "invalid ngx context"
     end

    if not node.limit_key then
        return nil, "invalid limit key"
    end

    local limit_key = "nelly:" .. node.limit_class .. ":" -- adds our namespace
    for _, key_component in ipairs(node.limit_key) do
        limit_key = limit_key .. get_key_value(key_component)
    end

    return limit_key, nil
end

local function apply_rate_limit(ngx, redis_key, interval, threshold)

 -- Connect to Redis
    local red = connect_to_redis()
    if not red then
        return nil, nil, nil, "could not connect to redis"
    end
    -- Increment the key
    local new_value, err = red:incr(redis_key)
    local ttl = nil
    if not new_value then
        ngx.log(ngx.ERR, "apply_rate_limit: Failed to increment Redis key: ", err)
        return nil, nil, nil, err
    end

    if tonumber(new_value) == 1 then
        local ok, err = red:expire(redis_key, interval)
        if not ok then
            ngx.log(ngx.ERR, "apply_rate_limit: Failed to set expiration for Redis key: ", err)
            return nil, nil, nil, err
        end
    else
        -- Get the TTL for the key
        ttl, err = red:ttl(redis_key)
        if not ttl then
            ngx.log(ngx.ERR, "apply_rate_limit: Failed to get expiration for Redis key: ", err)
            return nil, nil, nil, err
        end
        if ttl < 0  then
            return nil, nil, nil, err
        end

    end

    close_redis(red)

    return new_value, threshold, ttl, nil

end

local function get_and_initialize_configuration(limit_class)

   ngx.log(ngx.INFO, "NGINX starting initialization: get_and_initialize_configuration for class:" .. limit_class .. "\n")
-- Connect to Redis
   local red = connect_to_redis()
   if not red then
        ngx.log(ngx.ERR, "redis connect failed " .. "\n")
        return nil, "could not connect to redis"
   end
   local res, err
    if limit_class == "plan" or limit_class == "product" then
      res, err = red:get("nelly_configuration")
    elseif limit_class == "conditional" then
      res, err = red:get("nelly_conditional_limits")
    elseif limit_class == "allowlist" then
        res, err = red:get("nelly_allowlist")
    elseif limit_class == "account_id_network_allowlist" then
        res, err = red:get("account_id_network_allowlist")
    end
    close_redis(red)
    if not res then
        ngx.log(ngx.ERR, "redis get failed " .. "\n", err)
        return nil, "could not get key my_key"
    end

    local cjson = require "cjson.safe"

    -- Read the contents of the JSON file
    local json_str = tostring(res)

    -- Parse the JSON data
    local json_data, err = cjson.decode(json_str)
    if not json_data then
        ngx.log(ngx.INFO, "Failed to decode JSON file:", limit_class, err)
        return nil, "could not parse JSON"
    end

    -- Store the parsed JSON data in a shared variable
    ngx.shared.my_config = json_data
    local plan_nodes = {}
    local product_nodes = {}
    local conditional_nodes = {}
    local allowlist_nodes = {}

    if limit_class == "account_id_network_allowlist" then
        ngx.shared.account_id_network_allowlist = json_data
        ngx.log(ngx.INFO, "Nelly loaded account_id_network_allowlist nodes\n")
        return nil, nil
    end

    for _, node in ipairs(json_data) do
        if node.limit_class == "plan" then
            table.insert(plan_nodes, node)
        elseif node.limit_class == "product" then
            table.insert(product_nodes, node)
        elseif node.limit_class == "conditional" then
            table.insert(conditional_nodes, node)
         elseif node.limit_class == "allowlist" then
            table.insert(allowlist_nodes, node)
         else
            ngx.log(ngx.ERR, "ERROR: UNKNOWN NODE CLASS ENCOUNTERED: ")
        end
    end
    if limit_class == "product" or limit_class == "plan" then
        ngx.shared.plan_nodes = plan_nodes
        ngx.shared.product_nodes = product_nodes
        ngx.log(ngx.INFO, "Nelly loaded plan and product nodes\n")
    elseif limit_class == "conditional" then
        ngx.shared.conditional_nodes = conditional_nodes
        ngx.log(ngx.INFO, "Nelly loaded conditional nodes\n")
    elseif limit_class == "allowlist" then
         ngx.shared.allowlist_nodes = allowlist_nodes
         ngx.log(ngx.INFO, "Nelly loaded conditional nodes\n")
    end

end

local function account_id_network_allowlist(ngx, allowlist, account_id, remote_addr)
    if not allowlist or not allowlist[account_id] then
        return true
    end
    local ip = ipmatcher.new(allowlist[account_id])
    return ip:match(remote_addr)
end

local function allowlist(ngx, nodes, request_verb, request_uri)
    -- 1. Find the appropriate node we want to rate limit
    -- 2. Execute the conditions and easy out on first match.
    -- 3. Apply the rate limit and return how long one would wait, along with error encountered.

    if not nodes then
        return true, nil
    end

    local best_node = find_best_match("allowlist", ngx, nodes, request_verb, request_uri)

    if not best_node then
        return false, nil
    end

    -- Check if the best_node has a body_limit and the request_verb is a write operation
    if best_node.body_limit and (request_verb == "POST" or request_verb == "PUT" or request_verb == "PATCH" or request_verb == "DELETE") then
        ngx.req.read_body()
        local body_data = ngx.req.get_body_data()
        local body_size = body_data and #body_data or 0

        -- If the body is stored in a temporary file, get its size
        if body_size == 0 then
            local body_file = ngx.req.get_body_file()
            if body_file then
                local file = io.open(body_file, "r")
                if file then
                    body_size = file:seek("end")
                    file:close()
                end
            end
        end

        -- Compare the body size with the body_limit
        if body_size > best_node.body_limit then
            ngx.log(ngx.ERR, "Request body size exceeds the allowed limit: ", body_size, " > ", best_node.body_limit)
            return false, "Request body size exceeds the allowed limit"
        end
    end

    return true, nil
end

local function rate_limit(limit_class, ngx, nodes, request_verb, request_uri) -- returns amount to wait, error string
-- 1. Find the appropriate node we want to rate rate_limit
-- 2. Execute the conditions and easy out on first match.
-- 3. Apply the rate limit and return how long one would wait, along with error encountered.
    local best_node = find_best_match(limit_class, ngx, nodes, request_verb, request_uri)

    if not best_node then
        return nil, nil
    end

    local best_limit, err = find_best_limit(ngx, best_node)

    if err then
        return nil, nil, err
    end

    local rate_limit_key, err = amalgamate_key(ngx, best_node)

    if err then
        return nil, nil, err
    end

   local redis_key = to_hex_string(rate_limit_key)

   local new_value, threshold, ttl, err = apply_rate_limit(ngx, redis_key, best_limit.interval_seconds, best_limit.threshold)

   if err then
        return nil, nil, err
   end

   return new_value, threshold, err, best_node, best_limit, ttl
end

-- Return the function so it can be used elsewhere
return {
    rate_limit = rate_limit,
    allowlist = allowlist,
    account_id_network_allowlist = account_id_network_allowlist,
    get_and_initialize_configuration = get_and_initialize_configuration
}
