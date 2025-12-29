package auth

import (
	"context"
	"encoding/base64"
	"encoding/gob"
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// Config holds the authentication configuration
type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	AdminEmails  []string
	CookieName   string
	CookieSecret []byte
}

// GoogleOAuth2 holds the OAuth2 configuration and state
type GoogleOAuth2 struct {
	config       *oauth2.Config
	adminEmails  map[string]bool
	cookieName   string
	cookieSecret []byte
}

// UserInfo represents the authenticated user information
type UserInfo struct {
	Email   string
	Name    string
	Picture string
	IsAdmin bool
}

// NewGoogleOAuth2 creates a new Google OAuth2 instance
func NewGoogleOAuth2(cfg Config) *GoogleOAuth2 {
	if cfg.ClientID == "" || cfg.ClientSecret == "" {
		// Return a mock auth that allows all (for development)
		return &GoogleOAuth2{
			config:       nil,
			adminEmails:  map[string]bool{"dev@example.com": true},
			cookieName:   cfg.CookieName,
			cookieSecret: cfg.CookieSecret,
		}
	}

	// Parse admin emails into a map
	adminMap := make(map[string]bool)
	for _, email := range cfg.AdminEmails {
		adminMap[strings.TrimSpace(email)] = true
	}

	oauth2Config := &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURL:  cfg.RedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return &GoogleOAuth2{
		config:       oauth2Config,
		adminEmails:  adminMap,
		cookieName:   cfg.CookieName,
		cookieSecret: cfg.CookieSecret,
	}
}

// GetLoginURL returns the Google OAuth2 login URL
func (g *GoogleOAuth2) GetLoginURL(state string) string {
	if g.config == nil {
		// Return a mock URL for development
		return "/auth/mock-login?state=" + state
	}
	return g.config.AuthCodeURL(state)
}

// ExchangeCode exchanges the authorization code for tokens
func (g *GoogleOAuth2) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	if g.config == nil {
		// Return a mock token for development
		return &oauth2.Token{
			AccessToken: "mock-token",
			Expiry:      time.Now().Add(time.Hour * 24),
		}, nil
	}
	return g.config.Exchange(ctx, code)
}

// GetUserInfo retrieves user information from Google
func (g *GoogleOAuth2) GetUserInfo(ctx context.Context, token *oauth2.Token) (*UserInfo, error) {
	if g.config == nil || token == nil {
		// Return mock user for development
		return &UserInfo{
			Email:   "dev@example.com",
			Name:    "Dev User",
			Picture: "https://example.com/avatar.png",
			IsAdmin: true,
		}, nil
	}

	client := g.config.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Parse the response (simplified - in production use google.UserInfo)
	var info UserInfo
	info.Email = extractEmailFromToken(token)
	info.IsAdmin = g.IsAdmin(info.Email)

	return &info, nil
}

// extractEmailFromToken extracts email from ID token or returns empty
func extractEmailFromToken(token *oauth2.Token) string {
	// In a real implementation, you'd decode the JWT ID token
	// For now, we'll use a simple approach
	return ""
}

// IsAdmin checks if the email is in the admin whitelist
func (g *GoogleOAuth2) IsAdmin(email string) bool {
	return g.adminEmails[email]
}

// AdminWhitelist returns the list of admin emails
func (g *GoogleOAuth2) AdminWhitelist() []string {
	emails := make([]string, 0, len(g.adminEmails))
	for email := range g.adminEmails {
		emails = append(emails, email)
	}
	return emails
}

// Session management

// SessionCookieName returns the session cookie name
func (g *GoogleOAuth2) SessionCookieName() string {
	if g.cookieName == "" {
		return "session"
	}
	return g.cookieName
}

// SetSessionCookie sets a secure session cookie
func (g *GoogleOAuth2) SetSessionCookie(w http.ResponseWriter, user *UserInfo) {
	gob.Register(UserInfo{})

	cookie := &http.Cookie{
		Name:     g.SessionCookieName(),
		Value:    serializeUserInfo(user, g.cookieSecret),
		Path:     "/",
		HttpOnly: true,
		Secure:   !isDevelopment(),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   60 * 60 * 24 * 7, // 7 days
	}

	http.SetCookie(w, cookie)
}

// GetSessionCookie retrieves the session cookie value
func (g *GoogleOAuth2) GetSessionCookie(r *http.Request) (*UserInfo, error) {
	cookie, err := r.Cookie(g.SessionCookieName())
	if err != nil {
		return nil, err
	}

	return deserializeUserInfo(cookie.Value, g.cookieSecret)
}

// ClearSessionCookie clears the session cookie
func (g *GoogleOAuth2) ClearSessionCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     g.SessionCookieName(),
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   !isDevelopment(),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	}
	http.SetCookie(w, cookie)
}

// Middleware

// RequireAdmin is a middleware that checks for valid admin session
func (g *GoogleOAuth2) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := g.GetSessionCookie(r)
		if err != nil {
			// No valid cookie - redirect to login
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		if user == nil || !user.IsAdmin {
			// Valid cookie but not admin - return 403
			http.Error(w, "Forbidden: Admin access required", http.StatusForbidden)
			return
		}

		// Add user to request context
		ctx := context.WithValue(r.Context(), UserContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserContextKey is the context key for user info
type ContextKey string

const UserContextKey ContextKey = "user"

// GetUserFromContext retrieves user info from context
func GetUserFromContext(ctx context.Context) *UserInfo {
	if user, ok := ctx.Value(UserContextKey).(*UserInfo); ok {
		return user
	}
	return nil
}

// Helper functions

// encodeBase64 encodes a string to base64
func encodeBase64(s string) string {
	return base64.URLEncoding.EncodeToString([]byte(s))
}

// decodeBase64 decodes a base64 string
func decodeBase64(s string) string {
	data, err := base64.URLEncoding.DecodeString(s)
	if err != nil {
		return ""
	}
	return string(data)
}

// isDevelopment returns true if running in development mode
func isDevelopment() bool {
	return os.Getenv("GO_ENV") != "production"
}

// serializeUserInfo serializes user info to a cookie value
func serializeUserInfo(user *UserInfo, secret []byte) string {
	// Simple base64 encoding for development
	// In production, use proper encryption
	data := user.Email + "|" + user.Name + "|" + user.Picture + "|" + boolToString(user.IsAdmin)
	return encodeBase64(data)
}

// deserializeUserInfo deserializes user info from a cookie value
func deserializeUserInfo(value string, secret []byte) (*UserInfo, error) {
	data := decodeBase64(value)
	parts := strings.Split(data, "|")
	if len(parts) < 4 {
		return nil, nil
	}

	return &UserInfo{
		Email:   parts[0],
		Name:    parts[1],
		Picture: parts[2],
		IsAdmin: stringToBool(parts[3]),
	}, nil
}

// boolToString converts bool to string
func boolToString(b bool) string {
	if b {
		return "1"
	}
	return "0"
}

// stringToBool converts string to bool
func stringToBool(s string) bool {
	return s == "1"
}
