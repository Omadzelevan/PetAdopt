import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signAccessToken } from '../lib/jwt.js';
import { isSmtpConfigured, sendVerificationEmail } from '../lib/mailer.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, conflict, unauthorized } from '../utils/httpError.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

router.post(
  '/register',
  asyncHandler(async (request, response) => {
    const payload = registerSchema.safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid registration fields', payload.error.flatten());
    }

    const { name, email, password } = payload.data;
    const verificationRequired = isSmtpConfigured();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw conflict('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: !verificationRequired,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
      },
    });

    let mailResult = { delivered: false, previewUrl: undefined };

    if (verificationRequired) {
      const token = crypto.randomBytes(32).toString('hex');

      await prisma.emailToken.create({
        data: {
          userId: user.id,
          token,
          type: 'VERIFY_EMAIL',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
      });

      mailResult = await sendVerificationEmail({
        email,
        name,
        token,
      });
    }

    response.status(201).json({
      user,
      message: verificationRequired
        ? 'Registration completed. Please verify your email.'
        : 'Registration completed. You can sign in now.',
      verificationPreview:
        verificationRequired && !mailResult.delivered ? mailResult.previewUrl : undefined,
    });
  }),
);

router.post(
  '/verify-email',
  asyncHandler(async (request, response) => {
    const token = String(request.body?.token || '').trim();

    if (!token) {
      throw badRequest('Verification token is required');
    }

    const emailToken = await prisma.emailToken.findUnique({
      where: { token },
    });

    if (!emailToken || emailToken.type !== 'VERIFY_EMAIL') {
      throw badRequest('Invalid verification token');
    }

    if (emailToken.expiresAt.getTime() < Date.now()) {
      throw badRequest('Verification token has expired');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { emailVerified: true },
      }),
      prisma.emailToken.deleteMany({
        where: { userId: emailToken.userId, type: 'VERIFY_EMAIL' },
      }),
    ]);

    response.json({ message: 'Email verified successfully' });
  }),
);

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

router.post(
  '/login',
  asyncHandler(async (request, response) => {
    const payload = loginSchema.safeParse(request.body);

    if (!payload.success) {
      throw badRequest('Invalid login fields', payload.error.flatten());
    }

    const { email, password } = payload.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw unauthorized('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      throw unauthorized('Invalid email or password');
    }

    if (!user.emailVerified && isSmtpConfigured()) {
      throw badRequest('Please verify your email before login');
    }

    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      user.emailVerified = true;
    }

    const accessToken = signAccessToken(user);

    response.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (request, response) => {
    response.json({ user: request.user });
  }),
);

router.post(
  '/resend-verification',
  asyncHandler(async (request, response) => {
    const email = String(request.body?.email || '').toLowerCase().trim();

    if (!email) {
      throw badRequest('Email is required');
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      response.json({ message: 'If your account exists, verification email has been sent.' });
      return;
    }

    if (user.emailVerified) {
      response.json({ message: 'Email is already verified.' });
      return;
    }

    if (!isSmtpConfigured()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });

      response.json({ message: 'Email verification is disabled. Your account is ready.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        token,
        type: 'VERIFY_EMAIL',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    const mailResult = await sendVerificationEmail({
      email,
      name: user.name,
      token,
    });

    response.json({
      message: 'Verification email sent.',
      verificationPreview: mailResult.delivered ? undefined : mailResult.previewUrl,
    });
  }),
);

export default router;
