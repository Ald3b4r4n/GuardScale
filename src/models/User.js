/*
 * Modelo: User (usuários do sistema)
 * Campos: email, passwordHash, role ('admin'|'user'), active, createdAt
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
module.exports = { User };
