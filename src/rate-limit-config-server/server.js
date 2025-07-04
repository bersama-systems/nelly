const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3008;
const CONFIG_FILE = 'limits.json';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory storage for the configuration
let limitsConfig = [];

// Load configuration from file
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    limitsConfig = JSON.parse(data);
    
    // Add unique IDs to existing items if they don't have them
    limitsConfig.forEach((item, index) => {
      if (!item.id) {
        item.id = uuidv4();
      }
      // Add IDs to limits within each item
      if (item.limits) {
        item.limits.forEach((limit, limitIndex) => {
          if (!limit.id) {
            limit.id = uuidv4();
          }
        });
      }
    });
    
    await saveConfig();
    console.log('Configuration loaded successfully');
  } catch (error) {
    console.log('No existing config file found, starting with empty configuration');
    limitsConfig = [];
  }
}

// Save configuration to file
async function saveConfig() {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(limitsConfig, null, 2));
    console.log('Configuration saved successfully');
  } catch (error) {
    console.error('Error saving configuration:', error);
    throw error;
  }
}

// Validate limit configuration structure
function validateLimitConfig(config) {
  const requiredFields = ['limit_class', 'name'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  if (!['plan', 'product'].includes(config.limit_class)) {
    throw new Error('limit_class must be either "plan" or "product"');
  }
  
  if (config.limits && Array.isArray(config.limits)) {
    config.limits.forEach((limit, index) => {
      if (!limit.condition || !limit.threshold || !limit.interval_seconds) {
        throw new Error(`Invalid limit at index ${index}: missing condition, threshold, or interval_seconds`);
      }
    });
  }
  
  return true;
}

// Helper function to recursively add IDs to conditions
function addIdsToCondition(condition) {
  if (!condition.id) {
    condition.id = uuidv4();
  }
  
  if (typeof condition.lhs === 'object' && condition.lhs !== null) {
    addIdsToCondition(condition.lhs);
  }
  
  if (typeof condition.rhs === 'object' && condition.rhs !== null) {
    addIdsToCondition(condition.rhs);
  }
  
  return condition;
}

// API Routes

// Get all limit configurations
app.get('/api/limits', (req, res) => {
  res.json(limitsConfig);
});

// Get a specific limit configuration by ID
app.get('/api/limits/:id', (req, res) => {
  const limit = limitsConfig.find(l => l.id === req.params.id);
  if (!limit) {
    return res.status(404).json({ error: 'Limit configuration not found' });
  }
  res.json(limit);
});

// Create a new limit configuration
app.post('/api/limits', async (req, res) => {
  try {
    const newLimit = req.body;
    
    // Validate the configuration
    validateLimitConfig(newLimit);
    
    // Add unique ID
    newLimit.id = uuidv4();
    
    // Add IDs to limits and their conditions
    if (newLimit.limits) {
      newLimit.limits.forEach(limit => {
        limit.id = uuidv4();
        if (limit.condition) {
          addIdsToCondition(limit.condition);
        }
      });
    }
    
    limitsConfig.push(newLimit);
    await saveConfig();
    
    res.status(201).json(newLimit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a limit configuration
app.put('/api/limits/:id', async (req, res) => {
  try {
    const index = limitsConfig.findIndex(l => l.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Limit configuration not found' });
    }
    
    const updatedLimit = { ...req.body, id: req.params.id };
    
    // Validate the configuration
    validateLimitConfig(updatedLimit);
    
    // Ensure limits have IDs
    if (updatedLimit.limits) {
      updatedLimit.limits.forEach(limit => {
        if (!limit.id) {
          limit.id = uuidv4();
        }
        if (limit.condition) {
          addIdsToCondition(limit.condition);
        }
      });
    }
    
    limitsConfig[index] = updatedLimit;
    await saveConfig();
    
    res.json(updatedLimit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a limit configuration
app.delete('/api/limits/:id', async (req, res) => {
  const index = limitsConfig.findIndex(l => l.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Limit configuration not found' });
  }
  
  const deletedLimit = limitsConfig.splice(index, 1)[0];
  await saveConfig();
  
  res.json({ message: 'Limit configuration deleted', deleted: deletedLimit });
});

// Add a new limit rule to an existing configuration
app.post('/api/limits/:id/limits', async (req, res) => {
  try {
    const configIndex = limitsConfig.findIndex(l => l.id === req.params.id);
    if (configIndex === -1) {
      return res.status(404).json({ error: 'Limit configuration not found' });
    }
    
    const newLimitRule = req.body;
    
    // Validate the limit rule
    if (!newLimitRule.condition || !newLimitRule.threshold || !newLimitRule.interval_seconds) {
      return res.status(400).json({ error: 'Missing required fields: condition, threshold, or interval_seconds' });
    }
    
    // Add unique ID
    newLimitRule.id = uuidv4();
    
    // Add IDs to condition
    if (newLimitRule.condition) {
      addIdsToCondition(newLimitRule.condition);
    }
    
    // Initialize limits array if it doesn't exist
    if (!limitsConfig[configIndex].limits) {
      limitsConfig[configIndex].limits = [];
    }
    
    limitsConfig[configIndex].limits.push(newLimitRule);
    await saveConfig();
    
    res.status(201).json(newLimitRule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a specific limit rule
app.put('/api/limits/:id/limits/:limitId', async (req, res) => {
  try {
    const configIndex = limitsConfig.findIndex(l => l.id === req.params.id);
    if (configIndex === -1) {
      return res.status(404).json({ error: 'Limit configuration not found' });
    }
    
    const limitIndex = limitsConfig[configIndex].limits.findIndex(l => l.id === req.params.limitId);
    if (limitIndex === -1) {
      return res.status(404).json({ error: 'Limit rule not found' });
    }
    
    const updatedLimitRule = { ...req.body, id: req.params.limitId };
    
    // Validate the limit rule
    if (!updatedLimitRule.condition || !updatedLimitRule.threshold || !updatedLimitRule.interval_seconds) {
      return res.status(400).json({ error: 'Missing required fields: condition, threshold, or interval_seconds' });
    }
    
    // Add IDs to condition
    if (updatedLimitRule.condition) {
      addIdsToCondition(updatedLimitRule.condition);
    }
    
    limitsConfig[configIndex].limits[limitIndex] = updatedLimitRule;
    await saveConfig();
    
    res.json(updatedLimitRule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a specific limit rule
app.delete('/api/limits/:id/limits/:limitId', async (req, res) => {
  try {
    const configIndex = limitsConfig.findIndex(l => l.id === req.params.id);
    if (configIndex === -1) {
      return res.status(404).json({ error: 'Limit configuration not found' });
    }
    
    const limitIndex = limitsConfig[configIndex].limits.findIndex(l => l.id === req.params.limitId);
    if (limitIndex === -1) {
      return res.status(404).json({ error: 'Limit rule not found' });
    }
    
    const deletedLimit = limitsConfig[configIndex].limits.splice(limitIndex, 1)[0];
    await saveConfig();
    
    res.json({ message: 'Limit rule deleted', deleted: deletedLimit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get configuration schema/template
app.get('/api/schema', (req, res) => {
  const schema = {
    limit_classes: ['plan', 'product'],
    operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'or', 'and'],
    template: {
      plan: {
        limit_class: 'plan',
        name: 'Plan Name',
        uri: '/api/path/*',
        limit_key: ['ngx.var.http_x_account_plan', 'ngx.var.http_x_account_id'],
        limits: [
          {
            condition: {
              name: 'Condition Name',
              lhs: 'ngx.var.http_x_account_plan',
              operator: 'eq',
              rhs: '1'
            },
            threshold: 100,
            interval_seconds: 60
          }
        ]
      },
      product: {
        limit_class: 'product',
        name: 'Product Endpoint Name',
        short_name: 'endpoint_name',
        verb: 'GET',
        uri: '/api/endpoint',
        limit_key: ['ngx.var.http_x_account_id', 'ngx.var.request_method', 'ngx.var.uri'],
        limits: [
          {
            condition: {
              name: 'Condition Name',
              lhs: 'ngx.var.http_x_account_plan',
              operator: 'eq',
              rhs: '1'
            },
            threshold: 100,
            interval_seconds: 60
          }
        ]
      }
    }
  };
  res.json(schema);
});

// Export configuration
app.get('/api/export', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="limits.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(limitsConfig);
});

// Import configuration
app.post('/api/import', async (req, res) => {
  try {
    const importedConfig = req.body;
    
    if (!Array.isArray(importedConfig)) {
      return res.status(400).json({ error: 'Configuration must be an array' });
    }
    
    // Validate each configuration
    importedConfig.forEach((config, index) => {
      validateLimitConfig(config);
      
      // Add IDs if missing
      if (!config.id) {
        config.id = uuidv4();
      }
      
      if (config.limits) {
        config.limits.forEach(limit => {
          if (!limit.id) {
            limit.id = uuidv4();
          }
          if (limit.condition) {
            addIdsToCondition(limit.condition);
          }
        });
      }
    });
    
    limitsConfig = importedConfig;
    await saveConfig();
    
    res.json({ message: 'Configuration imported successfully', count: limitsConfig.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, async () => {
  await loadConfig();
  console.log(`Rate Limiting Configuration Server running on port ${PORT}`);
  console.log(`API Documentation:`);
  console.log(`  GET    /api/limits                    - Get all configurations`);
  console.log(`  GET    /api/limits/:id                - Get specific configuration`);
  console.log(`  POST   /api/limits                    - Create new configuration`);
  console.log(`  PUT    /api/limits/:id                - Update configuration`);
  console.log(`  DELETE /api/limits/:id                - Delete configuration`);
  console.log(`  POST   /api/limits/:id/limits         - Add limit rule to configuration`);
  console.log(`  PUT    /api/limits/:id/limits/:limitId - Update specific limit rule`);
  console.log(`  DELETE /api/limits/:id/limits/:limitId - Delete specific limit rule`);
  console.log(`  GET    /api/schema                    - Get configuration schema`);
  console.log(`  GET    /api/export                    - Export configuration`);
  console.log(`  POST   /api/import                    - Import configuration`);
});

module.exports = app;

