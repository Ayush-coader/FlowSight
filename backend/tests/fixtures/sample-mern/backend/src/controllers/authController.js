
const { loginUser } = require('../services/authService');
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    return res.json({ token: result.token, user: result.user });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}
module.exports = { login };