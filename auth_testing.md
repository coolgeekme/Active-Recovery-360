# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session

For this PostgreSQL-based app, use psql:

```bash
# Create test user
psql postgresql://ar360:ar360pass@localhost:5432/ar360 -c "
INSERT INTO users (username, email, password, full_name, is_member, is_admin, is_doctor, created_at)
VALUES ('testuser', 'test@example.com', '', 'Test User', false, false, false, NOW())
ON CONFLICT (email) DO NOTHING;
"
```

## Step 2: Test Backend API

```bash
# Test products endpoint (public)
curl -s https://ar360-shop.preview.emergentagent.com/api/products | head -100

# Test user endpoint (should return 401 if not logged in)
curl -s https://ar360-shop.preview.emergentagent.com/api/user

# Test login
curl -X POST https://ar360-shop.preview.emergentagent.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

## Step 3: Browser Testing with Session

```python
# Set session cookie and navigate
await page.context.add_cookies([{
    "name": "connect.sid",
    "value": "YOUR_SESSION_COOKIE",
    "domain": "52da4fc0-c802-41a7-b8e6-42a89a460ad9.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "Lax"
}])
await page.goto("https://ar360-shop.preview.emergentagent.com")
```

## Google OAuth Flow Testing

1. Navigate to /auth page
2. Click "Continue with Google" button
3. Complete Google sign-in
4. Should redirect back to app with session_id in URL hash
5. AuthCallback component exchanges session_id for session
6. User should be logged in and redirected to home

## Checklist

- [ ] User can register with username/password
- [ ] User can login with username/password
- [ ] User can login with Google OAuth
- [ ] Protected routes redirect to /auth when not logged in
- [ ] User session persists across page refreshes
- [ ] Logout clears session properly
- [ ] OAuth callback handles errors gracefully

## Success Indicators

✅ /api/user returns user data when logged in
✅ Protected pages load without redirect when logged in
✅ Google OAuth button redirects to auth.emergentagent.com
✅ OAuth callback successfully exchanges session_id

## Failure Indicators

❌ 401 Unauthorized on /api/user when cookie exists
❌ Redirect loop on protected pages
❌ OAuth callback fails to exchange session_id
