# Security Fix - OAuth Email Validation

## Critical Issue Found

### Authentication Bypass Vulnerability

**Severity:** HIGH
**Status:** FIXED in commit `d955b96`

### The Problem

The Google OAuth implementation had a critical bug that allowed **any Google user** to access admin features, regardless of the admin email whitelist configuration.

#### Root Cause

In `internal/auth/google.go`, the `GetUserInfo` function was calling a stub function:

```go
// OLD CODE (VULNERABLE)
func (g *GoogleOAuth2) GetUserInfo(ctx context.Context, token *oauth2.Token) (*UserInfo, error) {
    // ... fetch from Google ...
    var info UserInfo
    info.Email = extractEmailFromToken(token)  // ← Always returned ""
    info.IsAdmin = g.IsAdmin(info.Email)       // ← Checked IsAdmin("")
    return &info, nil
}

func extractEmailFromToken(token *oauth2.Token) string {
    // In a real implementation, you'd decode the JWT ID token
    // For now, we'll use a simple approach
    return ""  // ← BUG: Always returns empty string!
}
```

**Impact:**
- User's email was extracted as empty string `""`
- `IsAdmin("")` was checked against the whitelist
- If admin emails weren't configured properly, authentication still succeeded
- The admin middleware checked `user.IsAdmin` flag which was set during login
- Once logged in, users had full admin access

### Why You Could Login

You saw in logs: `Google OAuth2 initialized with 0 admin emails`

This happened because:
1. The environment variable `ADMIN_EMAILS` might not have been passed correctly from Portainer
2. Even if it was passed, the email extraction bug meant it didn't matter
3. The code wasn't actually checking the real Google email against the whitelist

## The Fix

### 1. Proper Email Extraction (Commit `d955b96`)

```go
// NEW CODE (SECURE)
func (g *GoogleOAuth2) GetUserInfo(ctx context.Context, token *oauth2.Token) (*UserInfo, error) {
    client := g.config.Client(ctx, token)
    resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Parse the JSON response from Google
    var googleUser struct {
        Email   string `json:"email"`
        Name    string `json:"name"`
        Picture string `json:"picture"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
        return nil, err
    }

    // Check if user is admin using REAL email
    isAdmin := g.IsAdmin(googleUser.Email)

    return &UserInfo{
        Email:   googleUser.Email,
        Name:    googleUser.Name,
        Picture: googleUser.Picture,
        IsAdmin: isAdmin,
    }, nil
}
```

### 2. Enhanced Logging

Added detailed logging to help debug configuration issues:

```go
log.Printf("Google OAuth2 initialized with %d admin emails: %v (raw: %q)",
    len(googleAuth.AdminWhitelist()),
    googleAuth.AdminWhitelist(),
    adminEmailsRaw)
```

This will show you:
- How many admin emails were parsed
- What emails are in the whitelist
- The raw environment variable value

### 3. Better Email Parsing

Improved whitespace handling in admin email parsing:

```go
for _, email := range cfg.AdminEmails {
    trimmed := strings.TrimSpace(email)
    if trimmed != "" {
        adminMap[trimmed] = true
    }
}
```

## Portainer Environment Variable Issues

### R2_PUBLIC_DOMAIN Empty

You set in Portainer:
```
R2_PUBLIC_DOMAIN=https://img.cc.wandergeek.org
```

But logs showed:
```
R2 client initialized successfully (bucket: crimekickers, public domain: )
```

**Possible causes:**
1. Typo in environment variable name in Portainer
2. Portainer didn't restart the container after adding the variable
3. Variable was added after stack was already running

**Fix:**
- Verify the environment variable name matches exactly: `R2_PUBLIC_DOMAIN`
- Restart the Portainer stack after the deployment completes
- Check with: `docker exec crimekickershub env | grep R2`

### ADMIN_EMAILS Not Parsed

You set in Portainer:
```
ADMIN_EMAILS=vakorjavin@gmail.com, korjavin@gmail.com
```

Logs showed: `0 admin emails`

**Possible causes:**
1. Environment variable not passed to container
2. Extra spaces in the CSV (now handled better in the fix)

**Fix:**
- Remove spaces after commas (though the fix now handles this):
  ```
  ADMIN_EMAILS=vakorjavin@gmail.com,korjavin@gmail.com
  ```
- After deployment, check logs for the new detailed output:
  ```
  Google OAuth2 initialized with 2 admin emails: [vakorjavin@gmail.com korjavin@gmail.com] (raw: "vakorjavin@gmail.com,korjavin@gmail.com")
  ```

## Verification Steps

After the new deployment completes:

### 1. Check Logs

```bash
ssh pet.kfamcloud.com
sudo podman logs crimekickershub | grep "OAuth2 initialized"
```

You should see:
```
Google OAuth2 initialized with 2 admin emails: [vakorjavin@gmail.com korjavin@gmail.com] (raw: "...")
```

### 2. Test Admin Access

1. Logout from the application
2. Login again with Google
3. Try to access admin features
4. Only whitelisted emails should have access

### 3. Test Non-Admin Access

1. Login with a Google account NOT in the whitelist
2. Should be able to access public features
3. Should get "403 Forbidden" when accessing `/admin/*` routes

### 4. Check Environment Variables

```bash
ssh pet.kfamcloud.com
sudo podman exec crimekickershub env | grep -E "ADMIN_EMAILS|R2_PUBLIC_DOMAIN"
```

Should show:
```
ADMIN_EMAILS=vakorjavin@gmail.com,korjavin@gmail.com
R2_PUBLIC_DOMAIN=https://img.cc.wandergeek.org
```

## Security Recommendations

### 1. Review Admin Access

After this deployment:
- Clear all existing sessions (users should re-login)
- Verify only whitelisted emails can access admin features
- Review any data created by unauthorized users

### 2. Monitor Logs

Watch for authentication attempts:
```bash
sudo podman logs -f crimekickershub | grep -i "admin\|auth"
```

### 3. Production Hardening

Consider adding:
- Rate limiting on auth endpoints
- Audit logging for admin actions
- Session expiration (currently 7 days)
- HTTPS-only cookies in production (already enabled via `Secure` flag)

## Timeline

- **Issue Introduced:** Initial deployment
- **Issue Discovered:** 2025-12-30
- **Issue Fixed:** 2025-12-30 (commit `d955b96`)
- **Deployed:** Automatically via GitHub Actions

## Related Files

- `internal/auth/google.go` - OAuth implementation
- `cmd/server/main.go` - Auth initialization
- `internal/api/router.go` - Admin middleware usage

## Additional Notes

The OAuth routing fix (commit `1254083`) is separate from this security issue and handles the callback URL routing properly.
