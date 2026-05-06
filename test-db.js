const mongoose = require('mongoose');
const User = require('./src/server/models/User');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const users = await User.find({});
    console.log("Users:", users.length);
    if(users.length > 0) {
      console.log("First user:", users[0]);
    }
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
