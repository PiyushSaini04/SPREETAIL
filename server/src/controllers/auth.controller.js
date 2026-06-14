import * as authService from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.', statusCode: 400 });
    }
    const data = await authService.registerUser({ name, email, password });
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.', statusCode: 400 });
    }
    const data = await authService.loginUser({ email, password });
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return res.status(200).json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json({ success: true, data: [] });
    const users = await authService.searchUsers(q, req.user.id);
    return res.status(200).json({ success: true, data: users });
  } catch (err) { next(err); }
};
