cat /limits.json | redis-cli -h redis -x SET nelly_configuration
cat /allowlist.json | redis-cli -h redis -x SET nelly_allowlist
cat /account_id_network_allowlist.json | redis-cli -h redis -x SET account_id_network_allowlist