// src/app.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const Moralis = require("moralis").default;

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://dunkinburner:rikisandive@cluster0.zkydjrc.mongodb.net/?retryWrites=true&w=majority');

// Define routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);


const startServer = async () => {
  await Moralis.start({
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImZmMjc4ODlkLTdiMTEtNGQwMi04OTZlLTYyMzE0MWIwZmE4MSIsIm9yZ0lkIjoiMzY3MjU1IiwidXNlcklkIjoiMzc3NDQ1IiwidHlwZUlkIjoiYzI3ZTE2OTAtYTUwMi00YmJkLWE0MTUtNWRjZjBlM2JiZDNkIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MDE5NDQ5MDgsImV4cCI6NDg1NzcwNDkwOH0.194Dw6iy1jANKTvyIMePZ1zyHKisRoBKyQgQOx0dSHs'
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

startServer();