export default function auth(req, res, next) {
  // TEMP fake auth
  req.user = { id: "user123" };
  next();
}

