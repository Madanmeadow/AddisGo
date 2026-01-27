const db = require('../config/db');

exports.requestAccess = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM waitlist WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(200).json({
        message: 'You are already on the waitlist 🔥'
      });
    }

    await db.query(
      'INSERT INTO waitlist (email) VALUES (?)',
      [email]
    );

    res.status(201).json({
      message: 'Request received! We’ll notify you soon 🚀'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
