const express = require('express');
const bcrypt = require('bcrypt');
const fileUpload = require('express-fileupload');
const admin = require('firebase-admin');
const serviceAccount = require('./key.json');
const User = require('../models/user');
const { Storage } = require("@google-cloud/storage");
const functions = require('firebase-functions')
const formidable = require("formidable-serverless");
const router = express.Router();
const moment = require('moment');
const ethers = require('ethers');
const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/common-evm-utils");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'fyproject-618db', // Replace with your Firebase Storage bucket URL
});


const storage = new Storage({
  keyFilename: './key.json',
});

const bucket = storage.bucket('gs://fyproject-618db.appspot.com');

// Middleware to handle file uploads
router.use(fileUpload({
  useTempFiles : true,
  tempFileDir : 'tmp'
}));

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, address, bankName, bankAccount, nicNumber, dob } = req.body;

    // Check if files were included in the request
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'NIC pictures are required' });
    }

    const nicFrontPicture = req.files.nicFrontPicture;
    const nicBackPicture = req.files.nicBackPicture;

    // Create a folder with the user's username in Firebase Storage
    const userFolder = `users/${name}`;
    const frontFolder = `${userFolder}/front`;
    const backFolder = `${userFolder}/back`;

    // Upload images to Firebase Cloud Storage
    const nicFrontPictureUpload = await bucket.upload(nicFrontPicture.tempFilePath, {
      destination: `${frontFolder}/${nicFrontPicture.name}`,
    });

    const nicBackPictureUpload = await bucket.upload(nicBackPicture.tempFilePath, {
      destination: `${backFolder}/${nicBackPicture.name}`,
    });

    const nicFrontPictureUrl = await nicFrontPictureUpload[0].getSignedUrl({ action: 'read', expires: '03-09-2491' });
    const nicBackPictureUrl = await nicBackPictureUpload[0].getSignedUrl({ action: 'read', expires: '03-09-2491' });


    const newUser = new User({ 
      name, 
      email, 
      password,
      address, 
      bankName, 
      bankAccount, 
      nicNumber, 
      dob, 
      nicFrontPicture: nicFrontPictureUrl[0], 
      nicBackPicture: nicBackPictureUrl[0],
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// router.post('/register', async (req, res) => {
//   try {
//     const { name, email, password, address, bankName, bankAccount, nicNumber, dob } = req.body;

//     if (!req.files || Object.keys(req.files).length === 0) {
//       return res.status(400).json({ message: 'NIC pictures are required' });
//     }

//     const nicFrontPicture = req.files.nicFrontPicture;
//     const nicBackPicture = req.files.nicBackPicture;

//     // Create a folder with the user's username in Firebase Storage
//     const userFolder = `users/${name}`;
//     const frontFolder = `${userFolder}/front`;
//     const backFolder = `${userFolder}/back`;

//     // Upload images to Firebase Cloud Storage
//     const nicFrontPictureUpload = await bucket.upload(nicFrontPicture.tempFilePath, {
//       destination: `${frontFolder}/${nicFrontPicture.name}`,
//     });

//     const nicBackPictureUpload = await bucket.upload(nicBackPicture.tempFilePath, {
//       destination: `${backFolder}/${nicBackPicture.name}`,
//     });

//     const nicFrontPictureUrl = await nicFrontPictureUpload[0].getSignedUrl({ action: 'read', expires: '03-09-2491' });
//     const nicBackPictureUrl = await nicBackPictureUpload[0].getSignedUrl({ action: 'read', expires: '03-09-2491' });

//     const newUser = new User({ 
//       name, 
//       email, 
//       password,
//       address, 
//       bankName, 
//       bankAccount, 
//       nicNumber, 
//       dob, 
//       nicFrontPicture: nicFrontPictureUrl[0], 
//       nicBackPicture: nicBackPictureUrl[0],
//     });

//     // Save user to Firestore
//     await newUser.save();

//     res.status(201).json({ message: 'User registered successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password,user.password );
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/transferToken', async (req, res) => {
  try {
    const { fromAddress, toAddress, value, userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.tokenTransfers.push({
      fromAddress,
      toAddress,
      value
    });
    await user.save();

    res.status(200).json({ message: 'Token transferred successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.get('/users', async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await User.find();

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/getUnverified', async (req, res) => {
  try {
    // Fetch unverified users from the database
    const unverifiedUsers = await User.find({ isVerified: false });

    res.status(200).json(unverifiedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/verifyUser', async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the user in the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's verification status
    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: 'User verified successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/createWallet', async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the user in the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new wallet and get the seed phrase
    const wallet = ethers.Wallet.createRandom();
    const seedPhrase = wallet.mnemonic.phrase;

    // Update the user's wallet and seed phrase information
    user.wallet = {
      address: wallet.address,
      seedPhrase: seedPhrase,
      balance: 0, // Set an initial balance, if needed
      nativeBalance: 0 // Set an initial balance, if needed
    };

    user.seedPhrase = seedPhrase;

    // Save the updated user to the database
    await user.save();

    res.status(200).json({ message: 'Wallet created successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/zeroBalance', async (req, res) => {
  try {
    // Fetch users with a zero balance from the database
    const usersWithZeroBalance = await User.find({ 'wallet.nativeBalance': 0 });

    res.status(200).json(usersWithZeroBalance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/updateBalance', async (req, res) => {
  try {
    const { userId, newBalance } = req.body;

    // Find the user in the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's balance
    user.wallet.nativeBalance = newBalance;
    
    // Save the updated user to the database
    await user.save();

    res.status(200).json({ message: 'Balance updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/userTransfers', async (req, res) => {
  try {
    // Promise.all() for receiving data async from two endpoints
    const {address} = req.body

    const [nativeBalance, tokenTransfers, tokenBalances] = await Promise.all([
      Moralis.EvmApi.balance.getNativeBalance({
        chain: EvmChain.SEPOLIA,
        address: address,
      }),
      Moralis.EvmApi.token.getWalletTokenTransfers({
        chain: EvmChain.SEPOLIA,
        address: address,
      }),
      Moralis.EvmApi.token.getWalletTokenBalances({
        chain: EvmChain.SEPOLIA,
        address: address,
      }),
    ]);

    res.status(200).json({
      // formatting the output
      address,
      nativeBalance: nativeBalance.result.balance.ether,
      tokenTransfers: tokenTransfers.result,
      tokenBalances: tokenBalances.result
    });
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500);
    res.json({ error: error.message });
  }
});

router.get('/dashboardData', async (req, res) => {
  try {
    // Get total number of transactions today
    const todayStart = moment().startOf('day');
    const todayEnd = moment().endOf('day');
    const totalTransactionsToday = await User.aggregate([
      {
        $match: {
          'tokenTransfers.timestamp': {
            $gte: todayStart.toDate(),
            $lte: todayEnd.toDate()
          }
        }
      },
      {
        $project: {
          transactions: { $size: '$tokenTransfers' }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: '$transactions' }
        }
      }
    ]);

    // Get total transaction amount today
    const totalAmountToday = await User.aggregate([
      {
        $match: {
          'tokenTransfers.timestamp': {
            $gte: todayStart.toDate(),
            $lte: todayEnd.toDate()
          }
        }
      },
      {
        $unwind: '$tokenTransfers'
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$tokenTransfers.value' }
        }
      }
    ]);

    // Calculate average transaction amount today
    const averageAmountToday = totalAmountToday.length > 0 && totalTransactionsToday.length > 0 ?
      totalAmountToday[0].totalAmount / totalTransactionsToday[0].totalTransactions : 0;

    // Get total number of users
    const totalUsers = await User.countDocuments();

    // Construct response object
    const dashboardData = {
      totalTransactionsToday: totalTransactionsToday.length > 0 ? totalTransactionsToday[0].totalTransactions : 0,
      totalAmountToday: totalAmountToday.length > 0 ? totalAmountToday[0].totalAmount : 0,
      averageAmountToday: averageAmountToday,
      totalUsers: totalUsers
    };

    // Send response
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/transaction-history', async (req, res) => {
  try {
    // Fetch transaction history
    const transactionHistory = await User.aggregate([
      {
        $unwind: "$tokenTransfers" // unwind the array for aggregation
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$tokenTransfers.timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(transactionHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.get('/transaction-distribution-by-bank', async (req, res) => {
  try {
    // Fetch transaction distribution by bankName
    const transactionDistribution = await User.aggregate([
      {
        $group: {
          _id: "$bankName",
          count: { $sum: { $size: "$tokenTransfers" } } // Count the number of transactions for each bank
        }
      }
    ]);

    res.json(transactionDistribution);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



module.exports = router;
