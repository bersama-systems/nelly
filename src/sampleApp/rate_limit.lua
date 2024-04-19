-- Load the Lua Redis library
local redis = require "resty.redis"

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

-- Function to close the Redis connection
local function close_redis(red)
    if not red then
        return
    end
    local ok, err = red:set_keepalive(10000, 100)
    if not ok then
        ngx.log(ngx.ERR, "Failed to set Redis keepalive: ", err)
    end
end

-- Access phase handler
local function say_something_from_redis()
    -- Connect to Redis
    local red = connect_to_redis()
    if not red then
        ngx.exit(500)
        return
    end

    -- Set a value in Redis
    local key = "mykey"
    local value = "myvalue"
    local ok, err = red:set(key, value)
    if not ok then
        ngx.log(ngx.ERR, "Failed to set value in Redis: ", err)
        close_redis(red)
        ngx.exit(500)
        return
    end

    -- Get a value from Redis
    local result, err = red:get(key)
    if not result then
        ngx.log(ngx.ERR, "Failed to get value from Redis: ", err)
        close_redis(red)
        ngx.exit(500)
        return
    end

    -- Output the result
    ngx.say("Value retrieved from Redis: ", result)

    -- Close the Redis connection
    close_redis(red)
end

local function get_key_value(limit_key)
    local extracted_name = string.match(limit_key, "ngx.var.(.+)")
    if extracted_name then
        if ngx.var[extracted_name] then
            return ngx.var[extracted_name]
        end
        return (limit_key .. ":" .. "nil")
    end
    return limit_key
end

local function find_best_match(ngx, nodes, verb, uri)
    local best_match = nil
    local best_score = -1

    for _, node in ipairs(nodes) do
        local pattern = node.uri
        local score = -1
        if node.verb == verb then
            -- Calculate score based on URI pattern match
            local uri_match = ngx.re.match(uri, "^" .. pattern .. "$", "jo")
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

    local lhs_val = get_key_value(condition.lhs)
    local rhs_val = get_key_value(condition.rhs)
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
    return false
end

local function find_best_limit(ngx, node)
    local i = 1
    local n = #node.limits
    while (i <= n ) do
        limit = node.limits[i]
        i = i + 1
        if limit and limit.condition then
            result, err = evaluate_condition(ngx, limit.condition)
            if err then
                ngx.log(ngx.ERR, "***** DEBUG: CONDITION EVALUATED WITH ERROR  ", limit.condition.name, err)
            elseif result then
                ngx.log(ngx.ERR, "***** DEBUG: CONDITION EVALUATED WITH RESULT  ", limit.condition.name, result)
                return limit, nil
            else
                ngx.log(ngx.ERR, "***** DEBUG: CONDITION EVALUATED WITH NO RESULT  ", limit.condition.name, result)
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

    ngx.log(ngx.ERR, "***** DEBUG: EVALUATING key amalgamation: ")
    local limit_key = ""
    for _, key_component in ipairs(node.limit_key) do
        limit_key = limit_key .. get_key_value(key_component)
    end

    ngx.log(ngx.ERR, "***** DEBUG: EVALUATED key amalgamation: " .. limit_key)
    return limit_key, nil
end

local function apply_rate_limit(ngx, redis_key, interval, threshold)

 -- Connect to Redis
    local red = connect_to_redis()
    if not red then
        return nil, "could not connect to redis"
    end
    -- Increment the key
    local new_value, err = red:incr(redis_key)
    if not new_value then
        ngx.log(ngx.ERR, "apply_rate_limit: Failed to increment Redis key: ", err)
        return nil, err
    end

    if tonumber(new_value) == 1 then
        local ok, err = red:expire(redis_key, interval)
        if not ok then
            ngx.log(ngx.ERR, "apply_rate_limit: Failed to set expiration for Redis key: ", err)
            return nil, err
        end
    end

    close_redis(red)

    ngx.log(ngx.ERR, "apply_rate_limit: ******* USING THRESHOLD ********* : ", threshold)

    return new_value / threshold, nil

end

local function rate_limit(ngx, nodes, verb, uri) -- returns amount to wait, error string
-- 1. Find the appropriate node we want to rate rate_limit
-- 2. Execute the conditions and easy out on first match.
-- 3. Apply the rate limit and return how long one would wait, along with error encountered.
    local best_node = find_best_match(ngx, nodes, verb, uri)
    if not best_node then
        ngx.log(ngx.ERR, "***** DEBUG: find_best_match NO found node")
        return nil, nil
    end

    ngx.log(ngx.ERR, "***** DEBUG: find_best_match found node: " .. best_node.name)

    local best_limit, err = find_best_limit(ngx, best_node)

    if err then
        return nil, err
    end

    local rate_limit_key, err = amalgamate_key(ngx, best_node)

    if err then
        return nil, err
    end

   local redis_key = to_hex_string(rate_limit_key)

   local limit_applied, err = apply_rate_limit(ngx, redis_key, best_limit.interval_seconds, best_limit.threshold)

   if err then
        return nil, err
   end

   return limit_applied, err
end

-- Return the function so it can be used elsewhere
return {
    rate_limit = rate_limit
}
