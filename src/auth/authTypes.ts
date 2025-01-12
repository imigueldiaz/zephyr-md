/**
 * Interface for user authentication data
 */
export interface AuthUser {
    username: string;
    password: string;
}

/**
 * Interface for JWT payload
 */
export interface JWTPayload {
    username: string;
    iat?: number;
    exp?: number;
}

/**
 * Interface for authentication response
 */
export interface AuthResponse {
    token: string;
    username: string;
}

/**
 * Interface for authentication configuration
 */
export interface AuthConfig {
    jwtSecret: string;
    jwtExpiresIn: string;
    users: AuthUser[];
}
