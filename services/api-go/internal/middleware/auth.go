// Package middleware provides shared HTTP auth helpers for the Go API gateway.
package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// jwtClaims are the fields we read from the FinVerify JWT.
type jwtClaims struct {
	Sid   int    `json:"sid"`
	Sub   int    `json:"sub"`
	Cid   int    `json:"cid"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Exp   int64  `json:"exp"`
}

type AuthContext struct {
	UserID    int
	CompanyID int
	SessionID int
	Email     string
	Role      string
}

// ExtractCompanyID returns the company ID from a verified FinVerify bearer JWT.
func ExtractCompanyID(r *http.Request) string {
	claims, ok := ExtractVerifiedClaims(r)
	if !ok || claims.Cid == 0 {
		return ""
	}
	return strconv.Itoa(claims.Cid)
}

// AuthenticateRequest verifies the JWT and checks the backing DB session/user.
func AuthenticateRequest(db *sql.DB, r *http.Request) (AuthContext, bool) {
	token := bearerToken(r)
	if token == "" {
		return AuthContext{}, false
	}

	claims, ok := verifyToken(token)
	if !ok {
		return AuthContext{}, false
	}

	hashBytes := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hashBytes[:])

	var auth AuthContext
	err := db.QueryRowContext(r.Context(),
		`SELECT u.id, u.company_id, s.id, u.email, u.role
		 FROM auth_sessions s
		 JOIN users u ON u.id = s.user_id
		 WHERE s.id = $1
		   AND s.user_id = $2
		   AND s.company_id = $3
		   AND s.token_hash = $4
		   AND s.expires_at > NOW()
		   AND s.revoked_at IS NULL
		   AND u.status = 'active'`,
		claims.Sid, claims.Sub, claims.Cid, tokenHash).
		Scan(&auth.UserID, &auth.CompanyID, &auth.SessionID, &auth.Email, &auth.Role)
	if err != nil {
		return AuthContext{}, false
	}

	return auth, true
}

// ExtractVerifiedClaims verifies the Authorization bearer JWT with the same
// HS256 signing scheme used by the TypeScript fallback.
func ExtractVerifiedClaims(r *http.Request) (jwtClaims, bool) {
	return verifyToken(bearerToken(r))
}

func bearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(auth, "Bearer ")
}

func verifyToken(token string) (jwtClaims, bool) {
	if token == "" {
		return jwtClaims{}, false
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return jwtClaims{}, false
	}

	unsigned := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, []byte(jwtSecret()))
	_, _ = mac.Write([]byte(unsigned))
	expectedSignature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(parts[2]), []byte(expectedSignature)) {
		return jwtClaims{}, false
	}

	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return jwtClaims{}, false
	}

	var claims jwtClaims
	if err := json.Unmarshal(raw, &claims); err != nil || claims.Cid == 0 {
		return jwtClaims{}, false
	}
	if claims.Exp == 0 || claims.Exp < time.Now().Unix() {
		return jwtClaims{}, false
	}

	return claims, true
}

func jwtSecret() string {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		return secret
	}
	if secret := os.Getenv("SESSION_SECRET"); secret != "" {
		return secret
	}
	return "finverify-dev-session-secret-change-me"
}
