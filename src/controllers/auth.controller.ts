import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getPool, sql, executeTransaction } from '../config/database';
import { generateAccessToken, generateRefreshToken } from '../utils/tokenHelper';
import { 
  sendWelcomeEmail, 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendPasswordChangedEmail 
} from '../services/emailService';
import { TOKEN_EXPIRY, ROLES } from '../config/constants';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Sign Up
export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, locale = 'ar' } = req.body;

    const pool = await getPool();

    // Check if user exists
    const existingUser = await pool
      .request()
      .input('email', sql.NVarChar, email.toLowerCase())
      .query('SELECT id FROM Users WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with email already verified (no email confirmation required)
    await executeTransaction(async (transaction) => {
      // Insert user with isEmailVerified = true
      const userResult = await transaction
        .request()
        .input('email', sql.NVarChar, email.toLowerCase())
        .input('password', sql.NVarChar, hashedPassword)
        .input('name', sql.NVarChar, name)
        .input('role', sql.NVarChar, ROLES.USER)
        .query(`
          INSERT INTO Users (email, password, name, role, isEmailVerified)
          OUTPUT INSERTED.id
          VALUES (@email, @password, @name, @role, 1)
        `);

      const userId = userResult.recordset[0].id;

      // Create free subscription
      await transaction
        .request()
        .input('userId', sql.Int, userId)
        .input('planId', sql.Int, 1) // Free plan
        .input('billingCycle', sql.NVarChar, 'free')
        .query(`
          INSERT INTO Subscriptions (userId, planId, billingCycle, status)
          VALUES (@userId, @planId, @billingCycle, 'active')
        `);

      // Note: Email verification is disabled for now
      // TODO: Re-enable email verification when email service is configured
      
      // Optionally send welcome email (non-blocking)
      try {
        sendWelcomeEmail(email, name, locale as 'ar' | 'en').catch(() => {
          logger.warn('Welcome email failed to send (non-critical)');
        });
      } catch (error) {
        // Ignore email errors - account is created successfully
      }
    });

    res.status(201).json({
      message: 'Account created successfully! You can now login.',
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
}

// Login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const pool = await getPool();

    // Get user
    const userResult = await pool
      .request()
      .input('email', sql.NVarChar, email.toLowerCase())
      .query('SELECT * FROM Users WHERE email = @email');

    if (userResult.recordset.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = userResult.recordset[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Note: Email verification check is disabled
    // TODO: Re-enable when email verification is required
    // if (!user.isEmailVerified) {
    //   res.status(403).json({ 
    //     error: 'Please verify your email before logging in',
    //     emailVerificationRequired: true,
    //   });
    //   return;
    // }

    // Update last login
    await pool
      .request()
      .input('userId', sql.Int, user.id)
      .query('UPDATE Users SET lastLoginAt = GETDATE() WHERE id = @userId');

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profileImage: user.profileImage,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}

// Verify Email
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.query;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const pool = await getPool();

    // Get verification record
    const verificationResult = await pool
      .request()
      .input('token', sql.NVarChar, token as string)
      .query(`
        SELECT * FROM EmailVerifications 
        WHERE token = @token AND expiresAt > GETDATE()
      `);

    if (verificationResult.recordset.length === 0) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    const verification = verificationResult.recordset[0];

    // Update user and delete verification token
    await executeTransaction(async (transaction) => {
      await transaction
        .request()
        .input('userId', sql.Int, verification.userId)
        .query(`
          UPDATE Users 
          SET isEmailVerified = 1, emailVerifiedAt = GETDATE()
          WHERE id = @userId
        `);

      await transaction
        .request()
        .input('token', sql.NVarChar, token as string)
        .query('DELETE FROM EmailVerifications WHERE token = @token');
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
}

// Resend Verification Email
export async function resendVerification(req: Request, res: Response): Promise<void> {
  try {
    const { email, locale = 'ar' } = req.body;

    const pool = await getPool();

    // Get user
    const userResult = await pool
      .request()
      .input('email', sql.NVarChar, email.toLowerCase())
      .query('SELECT * FROM Users WHERE email = @email');

    if (userResult.recordset.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.recordset[0];

    if (user.isEmailVerified) {
      res.status(400).json({ error: 'Email is already verified' });
      return;
    }

    // Delete old tokens
    await pool
      .request()
      .input('userId', sql.Int, user.id)
      .query('DELETE FROM EmailVerifications WHERE userId = @userId');

    // Create new token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.EMAIL_VERIFICATION);

    await pool
      .request()
      .input('userId', sql.Int, user.id)
      .input('token', sql.NVarChar, token)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO EmailVerifications (userId, token, expiresAt)
        VALUES (@userId, @token, @expiresAt)
      `);

    // Send email
    await sendVerificationEmail(email, user.name, token, locale as 'ar' | 'en');

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
}

// Forgot Password
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, locale = 'ar' } = req.body;

    const pool = await getPool();

    // Get user
    const userResult = await pool
      .request()
      .input('email', sql.NVarChar, email.toLowerCase())
      .query('SELECT * FROM Users WHERE email = @email');

    if (userResult.recordset.length === 0) {
      // Don't reveal if email exists
      res.json({ message: 'If the email exists, a reset link will be sent' });
      return;
    }

    const user = userResult.recordset[0];

    // Create reset token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET);

    await pool
      .request()
      .input('userId', sql.Int, user.id)
      .input('token', sql.NVarChar, token)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO PasswordResets (userId, token, expiresAt)
        VALUES (@userId, @token, @expiresAt)
      `);

    // Send email
    await sendPasswordResetEmail(email, user.name, token, locale as 'ar' | 'en');

    res.json({ message: 'If the email exists, a reset link will be sent' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

// Reset Password
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword, locale = 'ar' } = req.body;

    const pool = await getPool();

    // Get reset record
    const resetResult = await pool
      .request()
      .input('token', sql.NVarChar, token)
      .query(`
        SELECT pr.*, u.email, u.name
        FROM PasswordResets pr
        JOIN Users u ON pr.userId = u.id
        WHERE pr.token = @token 
          AND pr.expiresAt > GETDATE()
          AND pr.isUsed = 0
      `);

    if (resetResult.recordset.length === 0) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const reset = resetResult.recordset[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and mark token as used
    await executeTransaction(async (transaction) => {
      await transaction
        .request()
        .input('userId', sql.Int, reset.userId)
        .input('password', sql.NVarChar, hashedPassword)
        .query('UPDATE Users SET password = @password WHERE id = @userId');

      await transaction
        .request()
        .input('token', sql.NVarChar, token)
        .query('UPDATE PasswordResets SET isUsed = 1 WHERE token = @token');
    });

    // Send confirmation email
    await sendPasswordChangedEmail(reset.email, reset.name, locale as 'ar' | 'en');

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

// Get Current User
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const pool = await getPool();

    const userResult = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          u.id, u.email, u.name, u.role, u.phoneNumber, u.country, 
          u.dateOfBirth, u.gender, u.address, u.profileImage,
          u.isEmailVerified, u.createdAt,
          s.planId, p.name as planName, p.maxMenus, p.maxProductsPerMenu
        FROM Users u
        LEFT JOIN Subscriptions s ON u.id = s.userId AND s.status = 'active'
        LEFT JOIN Plans p ON s.planId = p.id
        WHERE u.id = @userId
      `);

    if (userResult.recordset.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.recordset[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: user.address,
        profileImage: user.profileImage,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        subscription: {
          planId: user.planId,
          planName: user.planName,
          maxMenus: user.maxMenus,
          maxProductsPerMenu: user.maxProductsPerMenu,
        },
      },
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
}

