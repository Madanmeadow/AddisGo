import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { pool } from "../db.js";

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "dev_secret_change_me";

/* =========================================================
   EMAIL TRANSPORTER
========================================================= */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* =========================================================
   REGISTER
   POST /auth/register
========================================================= */

router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      display_name,
      name,
    } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const displayName =
      username ||
      display_name ||
      name ||
      cleanEmail.split("@")[0];

    const hash = await bcrypt.hash(password, 10);

    let result;

    try {
      /*
        Your current database uses the password column.
      */
      result = await pool.query(
        `
        INSERT INTO users
          (username, email, password, display_name)
        VALUES
          ($1, $2, $3, $4)
        RETURNING
          id,
          username,
          email,
          display_name,
          name
        `,
        [
          displayName,
          cleanEmail,
          hash,
          displayName,
        ]
      );
    } catch (err) {
      /*
        Fallback in case your users table does not
        contain username/display_name.
      */
      result = await pool.query(
        `
        INSERT INTO users
          (name, email, password)
        VALUES
          ($1, $2, $3)
        RETURNING
          id,
          name,
          email,
          display_name,
          username
        `,
        [
          displayName,
          cleanEmail,
          hash,
        ]
      );
    }

    const user = result.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      token,

      user: {
        id: user.id,
        username:
          user.username ||
          user.display_name ||
          user.name ||
          user.email,
        email: user.email,
      },
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);

    return res.status(500).json({
      error: err.message || "Register failed",
    });
  }
});

/* =========================================================
   LOGIN
   POST /auth/login
========================================================= */

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
      });
    }

    const cleanEmail = email
      .trim()
      .toLowerCase();

    const userResult = await pool.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (!userResult.rows.length) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const user = userResult.rows[0];

    /*
      Your current production login uses:
      users.password
    */
    const storedPassword = user.password;

    if (!storedPassword) {
      return res.status(500).json({
        error: "Password data is missing for this account",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      storedPassword
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        email: user.email,
        username:
          user.username ||
          user.display_name ||
          user.name ||
          user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      token,

      user: {
        id: user.id,

        username:
          user.username ||
          user.display_name ||
          user.name ||
          user.email,

        email: user.email,
      },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      error: "Login failed",
    });
  }
});

/* =========================================================
   FORGOT PASSWORD
   POST /auth/forgot-password
========================================================= */

router.post(
  "/forgot-password",
  async (req, res) => {
    try {
      const email = String(
        req.body?.email || ""
      )
        .trim()
        .toLowerCase();

      if (!email) {
        return res.status(400).json({
          error: "Email address is required",
        });
      }

      /*
        Always use the same success message.
        This prevents revealing whether an email
        exists in the database.
      */
      const successMessage =
        "If this email exists, a reset link has been sent.";

      const userResult = await pool.query(
        `
        SELECT id, email
        FROM users
        WHERE LOWER(email) = $1
        LIMIT 1
        `,
        [email]
      );

      /*
        User doesn't exist.
        Return normal success response.
      */
      if (!userResult.rows.length) {
        return res.json({
          message: successMessage,
        });
      }

      const user = userResult.rows[0];

      /*
        Generate a cryptographically secure token.
      */
      const token =
        crypto.randomBytes(32).toString("hex");

      /*
        Token expires after 1 hour.
      */
      const expiresAt =
        new Date(
          Date.now() + 60 * 60 * 1000
        );

      /*
        Remove any previous reset tokens
        belonging to this user.
      */
      await pool.query(
        `
        DELETE FROM password_resets
        WHERE user_id = $1
        `,
        [user.id]
      );

      /*
        Save new reset token.
      */
      await pool.query(
        `
        INSERT INTO password_resets
          (
            user_id,
            token,
            expires_at,
            created_at
          )
        VALUES
          ($1, $2, $3, NOW())
        `,
        [
          user.id,
          token,
          expiresAt,
        ]
      );

      /*
        Your Vercel frontend.
      */
      const clientOrigin =
        process.env.CLIENT_ORIGIN ||
        "https://addis-go.vercel.app";

      const resetUrl =
        `${clientOrigin}/reset-password?token=${encodeURIComponent(
          token
        )}`;

      /*
        Send reset email.
      */
      await transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          process.env.SMTP_USER,

        to: user.email,

        subject:
          "Reset your Pulse password",

        text: `
You requested a password reset for your Pulse account.

Click the link below to reset your password:

${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, you can safely ignore this email.
        `.trim(),

        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reset your Pulse password</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <div
    style="
      max-width:600px;
      margin:40px auto;
      background:white;
      padding:40px;
      border-radius:10px;
    "
  >

    <h2>
      Reset your Pulse password
    </h2>

    <p>
      You requested a password reset for your Pulse account.
    </p>

    <p>
      Click the button below to choose a new password.
    </p>

    <p>
      <a
        href="${resetUrl}"
        style="
          display:inline-block;
          padding:12px 24px;
          background:#e11d48;
          color:white;
          text-decoration:none;
          border-radius:6px;
          font-weight:bold;
        "
      >
        Reset Password
      </a>
    </p>

    <p>
      This link will expire in
      <strong>1 hour</strong>.
    </p>

    <p>
      If you did not request this password reset,
      you can safely ignore this email.
    </p>

  </div>

</body>
</html>
        `,
      });

      console.log(
        `PASSWORD RESET EMAIL SENT: ${user.email}`
      );

      return res.json({
        message: successMessage,
      });

    } catch (err) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        err
      );

      return res.status(500).json({
        error:
          "Unable to process password reset request",
      });
    }
  }
);

/* =========================================================
   RESET PASSWORD
   POST /auth/reset-password
========================================================= */

router.post(
  "/reset-password",
  async (req, res) => {
    try {
      const token = String(
        req.body?.token || ""
      ).trim();

      const newPassword = String(
        req.body?.password || ""
      );

      if (!token || !newPassword) {
        return res.status(400).json({
          error:
            "Token and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error:
            "Password must be at least 6 characters",
        });
      }

      /*
        Find a token that has not expired.
      */
      const resetResult = await pool.query(
        `
        SELECT
          id,
          user_id
        FROM password_resets
        WHERE token = $1
          AND expires_at > NOW()
        LIMIT 1
        `,
        [token]
      );

      if (!resetResult.rows.length) {
        return res.status(400).json({
          error:
            "This password reset link is invalid or expired",
        });
      }

      const reset = resetResult.rows[0];

      /*
        Hash the new password.
      */
      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          10
        );

      /*
        Update the existing users.password
        column used by your login system.
      */
      await pool.query(
        `
        UPDATE users
        SET password = $1
        WHERE id = $2
        `,
        [
          hashedPassword,
          reset.user_id,
        ]
      );

      /*
        Delete the token so it cannot
        be reused.
      */
      await pool.query(
        `
        DELETE FROM password_resets
        WHERE id = $1
        `,
        [reset.id]
      );

      return res.json({
        message:
          "Password reset successfully",
      });

    } catch (err) {
      console.error(
        "RESET PASSWORD ERROR:",
        err
      );

      return res.status(500).json({
        error:
          "Unable to reset password",
      });
    }
  }
);

export default router;





