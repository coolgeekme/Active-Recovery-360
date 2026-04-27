# AR360 Test Credentials

## Admin Login (use /admin-login page, NOT /auth)
- Email: admin@example.com
- Password: password
- URL: https://ar360-shop.preview.emergentagent.com/admin-login

## Production Admin (also valid)
- Email: reggie@coolgeek.me
- Password: (set via password reset)

## Notes
- Main `/auth` page uses Firebase OAuth — for staff/JWT login use `/admin-login`
- Admin endpoint: `POST /api/login` with `{username,password}`
- Test HCP user: drsmith / test123 (approved)
