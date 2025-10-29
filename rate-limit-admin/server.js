const express = require('express');
// Add redis client
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 4000;

// Redis connection setup
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;
const redisUrl = process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;
const redisClient = redis.createClient({ url: redisUrl });
redisClient.on('error', (err) => console.error('Redis client error:', err));
(async () => {
  try {
    await redisClient.connect();
    console.log(`Connected to Redis at ${redisUrl}`);
  } catch (err) {
    console.error('Failed to connect to Redis on startup:', err);
  }
})();

// Middleware
app.use(express.json()); // Add JSON body parsing

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Router for allowlist
const allowlistRouter = express.Router();

allowlistRouter.get('/', async (req, res) => {
  try {
    const raw = await redisClient.get('nelly_allowlist');
    if (raw == null) return res.status(404).json({ error: 'Key nelly_allowlist not found' });
    try {
      return res.json(JSON.parse(raw));
    } catch (e) {
      console.error('Invalid JSON in Redis key nelly_allowlist:', e);
      return res.status(500).json({ error: 'Invalid JSON format in allowlist data' });
    }
  } catch (err) {
    console.error('Error fetching allowlist from Redis:', err);
    res.status(500).json({ error: 'Failed to fetch allowlist data from Redis' });
  }
});

allowlistRouter.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Body must be an array of allowlist entries' });
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (typeof item !== 'object' || item == null) return res.status(400).json({ error: `Entry at index ${i} is not an object` });
    }
    await redisClient.set('nelly_allowlist', JSON.stringify(data));
    res.json({ status: 'ok', saved: data.length });
  } catch (err) {
    console.error('Error saving allowlist to Redis:', err);
    res.status(500).json({ error: 'Failed to save allowlist data to Redis' });
  }
});

app.use('/api/v1/allowlist', allowlistRouter);

// Add router for network access allowlist (account_id_network_allowlist)
const networkAccessRouter = express.Router();

networkAccessRouter.get('/', async (req, res) => {
  try {
    const raw = await redisClient.get('account_id_network_allowlist');
    if (raw == null) return res.status(404).json({ error: 'Key account_id_network_allowlist not found' });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('Invalid JSON in Redis key account_id_network_allowlist:', e);
      return res.status(500).json({ error: 'Invalid JSON format in network access data' });
    }
    if (typeof parsed !== 'object' || parsed == null || Array.isArray(parsed)) {
      return res.status(400).json({ error: 'Network access data must be an object mapping accountId to array of IPs' });
    }
    // Validate values are arrays of strings
    for (const [k, v] of Object.entries(parsed)) {
      if (!Array.isArray(v) || v.some(ip => typeof ip !== 'string')) {
        return res.status(400).json({ error: `Value for accountId ${k} must be an array of strings` });
      }
    }
    return res.json(parsed);
  } catch (err) {
    console.error('Error fetching network access allowlist from Redis:', err);
    res.status(500).json({ error: 'Failed to fetch network access allowlist from Redis' });
  }
});

networkAccessRouter.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (typeof data !== 'object' || data == null || Array.isArray(data)) {
      return res.status(400).json({ error: 'Body must be an object mapping accountId to array of IPs' });
    }
    for (const [k, v] of Object.entries(data)) {
      if (!Array.isArray(v) || v.some(ip => typeof ip !== 'string')) {
        return res.status(400).json({ error: `Value for accountId ${k} must be an array of strings` });
      }
    }
    await redisClient.set('account_id_network_allowlist', JSON.stringify(data));
    res.json({ status: 'ok', saved_keys: Object.keys(data).length });
  } catch (err) {
    console.error('Error saving network access allowlist to Redis:', err);
    res.status(500).json({ error: 'Failed to save network access allowlist to Redis' });
  }
});

app.use('/api/v1/network-access', networkAccessRouter);

// Add router for limits.json style editor
const limitsRouter = express.Router();

limitsRouter.get('/', async (req, res) => {
  try {
    const raw = await redisClient.get('nelly_configuration');
    if (raw == null) return res.status(404).json({ error: 'Key nelly_limits not found' });
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return res.status(500).json({ error: 'Invalid JSON in nelly_limits' }); }
    if (!Array.isArray(parsed)) return res.status(400).json({ error: 'Limits data must be an array' });
    return res.json(parsed);
  } catch (err) {
    console.error('Error fetching nelly_limits:', err);
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

limitsRouter.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Body must be array of limit root objects' });
    for (let i = 0; i < data.length; i++) {
      const root = data[i];
      if (typeof root !== 'object' || root == null) return res.status(400).json({ error: `Root at index ${i} not object` });
      if (!['plan','product'].includes(root.limit_class)) return res.status(400).json({ error: `Invalid limit_class at index ${i}` });
      if (!root.name) return res.status(400).json({ error: `Missing name at index ${i}` });
      if (!root.limit_key) return res.status(400).json({ error: `Missing limit_key at index ${i}` });
      if (!Array.isArray(root.limits)) return res.status(400).json({ error: `limits must be array at index ${i}` });
      for (let j = 0; j < root.limits.length; j++) {
        const lim = root.limits[j];
        if (typeof lim.threshold !== 'number' || typeof lim.interval_seconds !== 'number') return res.status(400).json({ error: `Invalid threshold/interval at root ${i} limit ${j}` });
        if (!lim.condition || typeof lim.condition !== 'object') return res.status(400).json({ error: `Missing condition at root ${i} limit ${j}` });
      }
    }
    await redisClient.set('nelly_configuration', JSON.stringify(data));
    res.json({ status: 'ok', saved_roots: data.length });
  } catch (err) {
    console.error('Error saving nelly_limits:', err);
    res.status(500).json({ error: 'Failed to save limits' });
  }
});

app.use('/api/v1/limits', limitsRouter);

// Conditional limits router (nelly_conditional_limits)
const conditionalLimitsRouter = express.Router();

conditionalLimitsRouter.get('/', async (req, res) => {
  try {
    const raw = await redisClient.get('nelly_conditional_limits');
    if (raw == null) return res.status(404).json({ error: 'Key nelly_conditional_limits not found' });
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return res.status(500).json({ error: 'Invalid JSON in nelly_conditional_limits' }); }
    if (!Array.isArray(parsed)) return res.status(400).json({ error: 'Conditional limits data must be an array' });
    return res.json(parsed);
  } catch (err) {
    console.error('Error fetching nelly_conditional_limits:', err);
    res.status(500).json({ error: 'Failed to fetch conditional limits' });
  }
});

conditionalLimitsRouter.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Body must be array of conditional limit root objects' });
    for (let i = 0; i < data.length; i++) {
      const root = data[i];
      if (typeof root !== 'object' || root == null) return res.status(400).json({ error: `Root at index ${i} not object` });
      if (root.limit_class !== 'conditional') return res.status(400).json({ error: `limit_class must be 'conditional' at index ${i}` });
      if (!root.name) return res.status(400).json({ error: `Missing name at index ${i}` });
      if (!root.limit_key) return res.status(400).json({ error: `Missing limit_key at index ${i}` });
      if (!Array.isArray(root.limits)) return res.status(400).json({ error: `limits must be array at index ${i}` });
      for (let j = 0; j < root.limits.length; j++) {
        const lim = root.limits[j];
        if (typeof lim.threshold !== 'number' || typeof lim.interval_seconds !== 'number') return res.status(400).json({ error: `Invalid threshold/interval at root ${i} limit ${j}` });
        if (!lim.condition || typeof lim.condition !== 'object') return res.status(400).json({ error: `Missing condition at root ${i} limit ${j}` });
      }
    }
    await redisClient.set('nelly_conditional_limits', JSON.stringify(data));
    res.json({ status: 'ok', saved_roots: data.length });
  } catch (err) {
    console.error('Error saving nelly_conditional_limits:', err);
    res.status(500).json({ error: 'Failed to save conditional limits' });
  }
});

app.use('/api/v1/conditional-limits', conditionalLimitsRouter);

// Health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Fallback 404 JSON (after defined routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path, method: req.method });
});

app.listen(PORT, () => {
  console.log(`Allowlist API server running on port ${PORT}`);
});
