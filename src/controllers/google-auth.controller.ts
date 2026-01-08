import { Request, Response } from 'express';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { logger } from '../utils/logger';
import { LoginAttemptsService } from '../services/loginAttempts.service';

/**
 * Handle Google OAuth login/signup
 * Receives Google ID token from frontend
 */
export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const { token, locale = 'ar' } = req.body;
    const ipAddress = (req.ip || req.socket.remoteAddress || 'unknown').replace('::ffff:', '');
    const userAgent = req.headers['user-agent'];

    if (!token) {
      res.status(400).json({ error: 'Google token is required' });
      return;
    }

    // Verify Google token and get user info
    const googleUserInfo = await GoogleOAuthService.verifyGoogleToken(token);

    // Check if account is locked (for existing email-based accounts)
    const lockStatus = await LoginAttemptsService.isAccountLocked(googleUserInfo.email);
    if (lockStatus.isLocked) {
      res.status(403).json({
        error: lockStatus.message || 'Account is temporarily locked',
        isLocked: true,
        lockedUntil: lockStatus.lockedUntil,
      });
      return;
    }

    // Find or create user
    const user = await GoogleOAuthService.findOrCreateGoogleUser(googleUserInfo, locale as 'ar' | 'en');

    // Reset failed login attempts for this email
    await LoginAttemptsService.resetFailedAttempts(googleUserInfo.email);

    // Record successful login
    await LoginAttemptsService.recordAttempt(googleUserInfo.email, ipAddress, true, userAgent);

    // Generate tokens
    const authResponse = await GoogleOAuthService.generateAuthTokens(user);

    // Debug: Log user data to verify profileImage is included
    logger.info('Google auth response:', {
      userId: user.userId,
      email: user.email,
      profileImage: user.profileImage,
      isNew: user.isNew,
    });

    res.json({
      message: user.isNew ? 'Account created successfully' : 'Login successful',
      isNew: user.isNew,
      ...authResponse,
    });
  } catch (error: any) {
    logger.error('Google auth error:', error);
    
    if (error.message === 'Invalid Google token') {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
}

/**
 * Get Google OAuth configuration for frontend
 */
export async function getGoogleConfig(req: Request, res: Response): Promise<void> {
  try {
    res.json({
      clientId: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    logger.error('Get Google config error:', error);
    res.status(500).json({ error: 'Failed to get Google configuration' });
  }
}

