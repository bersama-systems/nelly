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

local function find_best_limit(ngx, node)
    for _, limit in ipairs(node.limits) do
        if limit and limit.condition then
         -- Evaluate the condition using loadstring

           ngx.log(ngx.ERR, "***** DEBUG: EVALUATING CONDITION: " .. limit.condition)

            local func, err = loadstring("return " .. limit.condition)
            if not func then
                return nil, "Failed to load condition: " .. err
            end

            -- Set the environment for the function to access ngx module
            setfenv(func, { ngx = ngx })

            -- Call the function to evaluate the condition
            local success, result = pcall(func)
            if not success then
                ngx.log(ngx.ERR, "***** DEBUG: ERROR CONDITION: " .. result)
                return nil, "Failed to evaluate condition: " .. result
            end
            if result then
                ngx.log(ngx.ERR, "***** DEBUG: CONDITION EVALUATED WITH RESULT  ", limit.condition, result)
                return limit, nil
            else
                ngx.log(ngx.ERR, "***** DEBUG: CONDITION EVALUATED WITH NO RESULT  ", limit.condition, result)
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

   -- Evaluate the condition using loadstring

   ngx.log(ngx.ERR, "***** DEBUG: EVALUATING key amalgamation: " .. node.limit_key)

    local func, err = loadstring("return " .. node.limit_key)
    if not func then
        return nil, "Failed to load condition: " .. err
    end

    -- Set the environment for the function to access ngx module
    setfenv(func, { ngx = ngx })

    -- Call the function to evaluate the condition
    local success, result = pcall(func)
    if not success then
        ngx.log(ngx.ERR, "***** DEBUG: ERROR with key amalgamation " .. result)
        return nil, "Failed to evaluate key amalgamation: " .. result
    end
    if result then
        ngx.log(ngx.ERR, "***** DEBUG: key amalgamation success  ", node.limit_key, " ", result)
        return result, nil
    else
        ngx.log(ngx.ERR, "***** DEBUG: key amalgamation with failure  ", node.limit_key, " ", result)
        return nil, "amalgamation evaluated with no result"
    end
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

end

-- Return the function so it can be used elsewhere
return {
    say_something_from_redis = say_something_from_redis,
    rate_limit = rate_limit
}
