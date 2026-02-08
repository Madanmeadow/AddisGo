const users = [];

export const register = (req, res) => {
  const { email, password } = req.body;

  users.push({ id: Date.now(), email, password });

  res.json({ success: true });
};

export const login = (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({
    token: "mock-token",
    user: { id: user.id, email }
  });
};


