const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  bankName: { type: String, required: true },
  bankAccount: { type: String, required: true },
  nicNumber: { type: String, required: true },
  dob: { type: Date, required: true },
  isVerified: { type: Boolean, default: false },
  adminVerification: {
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    verificationDate: { type: Date },
  },
  wallet: {
    address: { type: String },
    seedPhrase: {type: String},
    balance: { type: Number, default: 0 },
    nativeBalance: { type: Number, default: 0 },
  },
  nicFrontPicture: { type: String },
  nicBackPicture: { type: String },
  tokenTransfers: [
    {
      fromAddress: { type: String },
      toAddress: { type: String },
      value: { type: Number },
      valueWithDecimals : { type: String },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.userId) {
    this.userId = uuidv4();
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
