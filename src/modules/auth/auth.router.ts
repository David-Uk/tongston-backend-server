import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  loginBodySchema,
  registerBodySchema,
  type LoginInput,
  type RegisterInput,
} from './auth.schema.js';
import { loginUser, registerUser } from './auth.service.js';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerBodySchema }), async (req, res, next) => {
  try {
    res.status(201).json(await registerUser(req.validated.body as RegisterInput));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', validate({ body: loginBodySchema }), async (req, res, next) => {
  try {
    res.json(await loginUser(req.validated.body as LoginInput));
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});
