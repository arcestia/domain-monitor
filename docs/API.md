# Domain Monitor API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All API endpoints (except login and register) require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## Error Responses
All endpoints may return these error responses:
```json
{
    "error": "Error message"
}
```
Common HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## Authentication Endpoints

### Register
```
POST /auth/register
```
Request body:
```json
{
    "username": "string",
    "email": "string",
    "password": "string"
}
```
Response:
```json
{
    "message": "User registered successfully"
}
```

### Login
```
POST /auth/login
```
Request body:
```json
{
    "email": "string",
    "password": "string"
}
```
Response:
```json
{
    "token": "string",
    "user": {
        "id": "number",
        "username": "string",
        "email": "string",
        "role": "string",
        "credits": "number",
        "api_calls_limit": "number",
        "api_calls_count": "number"
    }
}
```

### Change Password
```
POST /auth/change-password
```
Request body:
```json
{
    "currentPassword": "string",
    "newPassword": "string"
}
```
Response:
```json
{
    "message": "Password changed successfully"
}
```

### Generate API Token
```
POST /auth/generate-token
```
Response:
```json
{
    "apiToken": "string"
}
```

## Domain Endpoints

### Get All Domains
```
GET /domains
```
Response:
```json
{
    "domains": [
        {
            "id": "number",
            "domain": "string",
            "status": "boolean",
            "check_interval": "number",
            "credits_per_check": "number",
            "last_checked": "string",
            "interval_label": "string"
        }
    ],
    "user_info": {
        "credits": "number",
        "api_calls_count": "number",
        "api_calls_limit": "number"
    }
}
```

### Add Domain
```
POST /domains
```
Request body:
```json
{
    "domain": "string",
    "check_interval": "number"
}
```
Response:
```json
{
    "message": "Domain added successfully",
    "domain": {
        "id": "number",
        "domain": "string",
        "status": "boolean",
        "check_interval": "number",
        "credits_per_check": "number",
        "interval_label": "string"
    }
}
```

### Check Domain
```
POST /domains/:id/check
```
Response:
```json
{
    "message": "Domain checked successfully",
    "status": "boolean",
    "credits_remaining": "number"
}
```

### Remove Domain
```
DELETE /domains/:id
```
Response:
```json
{
    "message": "Domain removed successfully"
}
```

## Admin Endpoints

### Admin Domain Management

#### Get Admin's Domains
```
GET /admin/domains
```
Response:
```json
{
    "domains": [
        {
            "id": "number",
            "domain": "string",
            "status": "boolean",
            "check_interval": "number",
            "credits_per_check": "number",
            "last_checked": "string",
            "interval_label": "string"
        }
    ],
    "user_info": {
        "credits": "number",
        "api_calls_count": "number",
        "api_calls_limit": "number"
    }
}
```

#### Add Admin Domain
```
POST /admin/domains
```
Request body:
```json
{
    "domain": "string",
    "check_interval": "number"
}
```
Response:
```json
{
    "message": "Domain added successfully",
    "domain": {
        "id": "number",
        "domain": "string",
        "status": "boolean",
        "check_interval": "number",
        "credits_per_check": "number",
        "interval_label": "string"
    }
}
```

#### Check Admin Domain
```
POST /admin/domains/:domainId/check
```
Response:
```json
{
    "message": "Domain checked successfully",
    "domains": [
        {
            "id": "number",
            "domain": "string",
            "status": "boolean",
            "check_interval": "number",
            "credits_per_check": "number",
            "last_checked": "string",
            "interval_label": "string"
        }
    ],
    "user_info": {
        "credits": "number",
        "api_calls_count": "number",
        "api_calls_limit": "number"
    }
}
```

#### Remove Admin Domain
```
DELETE /admin/domains/:domainId
```
Response:
```json
{
    "message": "Domain removed successfully"
}
```

### User Management

#### Get All Users
```
GET /admin/users
```
Response:
```json
{
    "users": [
        {
            "id": "number",
            "username": "string",
            "email": "string",
            "role": "string",
            "credits": "number",
            "api_calls_limit": "number",
            "api_calls_count": "number",
            "is_active": "boolean",
            "created_at": "string",
            "updated_at": "string",
            "domains": [
                {
                    "id": "number",
                    "domain": "string",
                    "status": "boolean",
                    "check_interval": "number",
                    "credits_per_check": "number",
                    "last_checked": "string",
                    "interval_label": "string"
                }
            ]
        }
    ]
}
```

#### Update User
```
PUT /admin/users/:id
```
Request body:
```json
{
    "credits": "number?",
    "api_calls_limit": "number?",
    "is_active": "boolean?"
}
```
Response:
```json
{
    "message": "User updated successfully",
    "user": {
        "id": "number",
        "username": "string",
        "email": "string",
        "role": "string",
        "credits": "number",
        "api_calls_limit": "number",
        "api_calls_count": "number",
        "is_active": "boolean"
    }
}
```

#### Get User Stats
```
GET /admin/users/:id/stats
```
Response:
```json
{
    "user": {
        "id": "number",
        "username": "string",
        "email": "string",
        "role": "string",
        "credits": "number",
        "api_calls_limit": "number",
        "api_calls_count": "number",
        "is_active": "boolean"
    },
    "stats": {
        "domain_count": "number",
        "recent_transactions": [
            {
                "id": "number",
                "user_id": "number",
                "amount": "number",
                "transaction_type": "string",
                "description": "string",
                "created_at": "string"
            }
        ]
    }
}
```

#### Check User Domain
```
POST /admin/users/:userId/domains/:domainId/check
```
Response:
```json
{
    "message": "Domain checked successfully",
    "domains": [
        {
            "id": "number",
            "domain": "string",
            "status": "boolean",
            "check_interval": "number",
            "credits_per_check": "number",
            "last_checked": "string",
            "interval_label": "string"
        }
    ],
    "user_info": {
        "credits": "number",
        "api_calls_count": "number",
        "api_calls_limit": "number"
    }
}
```

## Valid Check Intervals
```javascript
{
    5: "FiveMinutes",
    15: "FifteenMinutes",
    30: "ThirtyMinutes",
    60: "OneHour",
    180: "ThreeHours",
    360: "SixHours",
    720: "TwelveHours",
    1440: "TwentyFourHours"
}
