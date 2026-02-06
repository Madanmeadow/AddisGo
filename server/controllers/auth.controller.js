export const register = async (req, res) => {
  res.json({
    message: "Register endpoint hit",
    body: req.body,
  });
};

export const login = async (req, res) => {
  res.json({
    message: "Login endpoint hit",
    body: req.body,
  });
};
