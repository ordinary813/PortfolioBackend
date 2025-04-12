import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import Token from './models/Token.js';
import connectDB from './config/db.js';
import Message from './models/Message.js';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';


dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({ origin: 'https://portfolio-frontend-ordinary813s-projects.vercel.app/' }));
app.use(helmet());
app.use(compression());

const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';
const ADMIN_KEY = process.env.ADMIN_KEY || 'secret-key';
const PORT = process.env.PORT || 4999;

connectDB();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP
});
app.use(limiter);

// API requests

// Generate a token for future use
app.post('/api/generate-token', async (req, res) => {
    try {
        const token = jwt.sign({ access: 'portfolio' }, SECRET_KEY, { expiresIn: '15m' });
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
        const used = false;
        await Token.create({ token, createdAt, expiresAt, used });
        res.json({ token, createdAt, expiresAt, used });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/validate-token', async (req, res) => {
    const { token } = req.body;
    try {
        jwt.verify(token, SECRET_KEY);
        const tokenDoc = await Token.findOne({ token });

        // No token
        if (!tokenDoc) {
            await Token.deleteOne({ token });
            return res.json({ valid: false });
        }

        const now = new Date();
        // Used
        if (tokenDoc.used) {
            if (now > tokenDoc.expiresAt) {
                await Token.deleteOne({ token });
                return res.json({ valid: false });
            }
        }

        const newExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
        await Token.updateOne({ token }, { used: true, expiresAt: newExpiresAt });
        res.json({ valid: true });
    } catch (error) {
        console.error('Error validating token:', error);
        res.json({ valid: false });
    }
});

app.post('/api/messages', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        const newMessage = await Message.create({
            name,
            email,
            message,
            createdAt: new Date(),
        });

        res.status(201).json({ message: 'Message sent successfully', data: newMessage });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

// Cleanup interval
setInterval(async () => {
    try {
        await Token.deleteMany({ expiresAt: { $lt: new Date() } });
    } catch (error) {
        console.error('Error cleaning tokens:', error);
    }
}, 60 * 60 * 1000); // Hourly

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));