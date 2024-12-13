cat /limits.json | redis-cli -h redis -x SET nelly_configuration
cat /allowlist.json | redis-cli -h redis -x SET nelly_allowlist