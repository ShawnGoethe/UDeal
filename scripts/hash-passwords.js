const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

async function migrate() {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  let changed = 0;

  for (const user of users) {
    if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      console.log(`Hashing: ${user.username}`);
      user.password = await bcrypt.hash(user.password, 10);
      changed++;
    }
  }

  if (changed > 0) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2) + '\n', 'utf-8');
    console.log(`Done. ${changed} passwords hashed.`);
  } else {
    console.log('All passwords already hashed.');
  }
}

migrate().catch(console.error);
