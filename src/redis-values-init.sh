redis-cli -h redis SET nelly_configuration_version "1"
cat /limits.json | redis-cli -h redis -x SET nelly_configuration