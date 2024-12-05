require('dotenv').config();
const express = require('express');
const cors = require("cors");
const connectDB = require('./helpers/db'); // Import the database connection
const githubIntegrationRoutes = require('./routes/githubIntegrationRoutes');

const app = express();
app.use(cors());
connectDB();


const PORT = process.env.PORT || 3000;

//routes
app.use('/api/github', githubIntegrationRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
