require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

if (process.env.MONGO_URI) {
  connectDB().catch((err) => {
    console.warn('MongoDB connection optional warning:', err.message);
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 FlowSight backend server running on port ${PORT}`);
});