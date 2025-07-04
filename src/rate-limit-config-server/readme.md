# Rate Limiting Configuration Server

A Node.js server for managing complex rate limiting configuration files with a web-based interface. This server allows you to create, edit, and manage rate limiting rules with support for nested conditions, multiple limit types, and incremental updates.

## Features

- **Full CRUD Operations**: Create, read, update, and delete rate limiting configurations
- **Incremental Edits**: Add, modify, or remove individual limit rules without recreating entire configurations
- **Unique Identifiers**: Automatically assigns UUIDs to all configurations and rules for reliable identification
- **Complex Conditions**: Support for nested logical conditions with AND/OR operators
- **Web Interface**: Beautiful, responsive web UI for easy configuration management
- **Import/Export**: Easily import existing configurations or export current settings
- **Validation**: Built-in validation for configuration structure and required fields
- **Real-time Updates**: Live updating interface with error handling

## Configuration Structure

The server supports two types of rate limiting configurations:

### Plan-based Limits
```json
{
  "limit_class": "plan",
  "name": "A Particular Product API Plan Limits",
  "uri": "/api/.*",
  "limit_key": ["ngx.var.http_x_account_plan", "ngx.var.http_x_account_id"],
  "limits": [
    {
      "condition": {
        "name": "Particular Product Plan Type 1",
        "lhs": "ngx.var.http_x_account_plan",
        "operator": "eq",
        "rhs": "1"
      },
      "threshold": 300,
      "interval_seconds": 60
    }
  ]
}
```

### Product-based Limits
```json
{
  "limit_class": "product",
  "name": "Limit on example controller endpoint",
  "short_name": "example_controller_index",
  "verb": "GET",
  "uri": "/api/example",
  "limit_key": ["ngx.var.http_x_account_id", "ngx.var.request_method", "ngx.var.uri"],
  "limits": [
    {
      "condition": {
        "name": "Plan Type 1",
        "lhs": "ngx.var.http_x_account_plan",
        "operator": "eq",
        "rhs": "1"
      },
      "threshold": 200,
      "interval_seconds": 60
    }
  ]
}
```

## Installation & Setup

1. **Clone or download the files**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Create the public directory**:
   ```bash
   mkdir public
   ```
4. **Move the HTML interface**:
   - Save the HTML interface as `public/index.html`
5. **Start the server**:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Usage

### Web Interface
1. Open your browser and navigate to `http://localhost:3000`
2. Use the intuitive web interface to:
   - View all configurations
   - Create new configurations
   - Edit existing configurations
   - Delete configurations
   - Import/export configurations

### API Endpoints

#### Configuration Management
- `GET /api/limits` - Get all configurations
- `GET /api/limits/:id` - Get specific configuration
- `POST /api/limits` - Create new configuration
- `PUT /api/limits/:id` - Update configuration
- `DELETE /api/limits/:id` - Delete configuration

#### Limit Rule Management
- `POST /api/limits/:id/limits` - Add limit rule to configuration
- `PUT /api/limits/:id/limits/:limitId` - Update specific limit rule
- `DELETE /api/limits/:id/limits/:limitId` - Delete specific limit rule

#### Utility Endpoints
- `GET /api/schema` - Get configuration schema and templates
- `GET /api/export` - Export all configurations as JSON
- `POST /api/import` - Import configurations from JSON array

### Example API Usage

**Create a new configuration:**
```bash
curl -X POST http://localhost:3000/api/limits \
  -H "Content-Type: application/json" \
  -d '{
    "limit_class": "product",
    "name": "My API Endpoint",
    "short_name": "my_api",
    "verb": "GET",
    "uri": "/api/my-endpoint",
    "limit_key": ["ngx.var.http_x_account_id", "ngx.var.request_method", "ngx.var.uri"],
    "limits": [
      {
        "condition": {
          "name": "Standard Plan",
          "lhs": "ngx.var.http_x_account_plan",
          "operator": "eq",
          "rhs": "1"
        },
        "threshold": 100,
        "interval_seconds": 60
      }
    ]
  }'
```

**Add a limit rule to existing configuration:**
```bash
curl -X POST http://localhost:3000/api/limits/{config-id}/limits \
  -H "Content-Type: application/json" \
  -d '{
    "condition": {
      "name": "Premium Plan",
      "lhs": "ngx.var.http_x_account_plan",
      "operator": "eq",
      "rhs": "2"
    },
    "threshold": 500,
    "interval_seconds": 60
  }'
```

## Key Improvements Made

1. **Unique Identifiers**: All configurations and limit rules now have UUID-based IDs for reliable identification
2. **Incremental Updates**: Can add, modify, or remove individual limit rules without recreating entire configurations
3. **Enhanced Validation**: Comprehensive validation for all configuration elements
4. **Complex Conditions**: Support for nested logical conditions using AND/OR operators
5. **Better Error Handling**: Detailed error messages and proper HTTP status codes
6. **Web Interface**: Beautiful, responsive UI for easy management
7. **Import/Export**: Easy data portability
8. **Real-time Updates**: Live interface updates with proper loading states

## Configuration File Structure

The server automatically maintains a `limits.json` file that contains all configurations. This file is:
- Automatically created if it doesn't exist
- Updated whenever configurations are modified
- Enhanced with unique IDs for all elements
- Properly formatted with indentation for readability

## Error Handling

The server includes comprehensive error handling:
- Validation errors for malformed configurations
- 404 errors for non-existent configurations
- 400 errors for invalid requests
- Detailed error messages to help with debugging

## Development

The server is built with:
- **Express.js** for the web framework
- **UUID** for generating unique identifiers
- **Native Node.js fs/promises** for file operations
- **Vanilla JavaScript** for the frontend (no frameworks required)

## License

MIT License - feel free to use and modify as needed.