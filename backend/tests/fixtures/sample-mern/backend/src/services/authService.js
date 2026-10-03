
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function loginUser(email, password) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }
  const token = jwt.sign({ id: user._id }, 'secret');
  return { token, user };
}
module.exports = { loginUser };