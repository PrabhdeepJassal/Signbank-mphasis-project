package com.signbank.backend.dto.request;

/**
 * DTO for creating or updating a user from the Admin panel.
 *
 * passwordHash field carries the raw password string stored as plaintext.
 */
public class UserCreateRequest {

    private String userId;
    private String username;
    private String email;
    private String roleId;

    /** Raw plaintext password supplied by admin. Stored as-is. */
    private String passwordHash;

    /** Gesture hash for biometric login (optional) */
    private String gestureHash;

    public String getUserId()      { return userId; }
    public void   setUserId(String v)  { this.userId = v; }

    public String getUsername()    { return username; }
    public void   setUsername(String v){ this.username = v; }

    public String getEmail()       { return email; }
    public void   setEmail(String v)   { this.email = v; }

    public String getRoleId()      { return roleId; }
    public void   setRoleId(String v)  { this.roleId = v; }

    public String getPasswordHash()    { return passwordHash; }
    public void   setPasswordHash(String v) { this.passwordHash = v; }

    public String getGestureHash()     { return gestureHash; }
    public void   setGestureHash(String v)  { this.gestureHash = v; }
}