import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      message: "Access denied. No token provided.",
      code: "NO_TOKEN"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // You can access this in your controllers via req.user.userId
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: "Token has expired. Please login again.",
        code: "TOKEN_EXPIRED"
      });
    }
    return res.status(401).json({ 
      message: "Invalid token.",
      code: "INVALID_TOKEN"
    });
  }
};

export default authenticate;
