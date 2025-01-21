const { PrismaClient } = require('@prisma/client')
const cookieParser = require('cookie-parser')
const express = require('express')
const app = express()
const port = 3000
const jwt = require('jsonwebtoken')
const client = new PrismaClient()

app.use(express.json())
app.use(cookieParser())
app.get('/', (req, res) => res.send('Hello World!'))


app.post('/reg', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const user = await client.users.findFirst({
        where: {
            email
        }
    })

    if (user) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const newUser = await client.users.create({
        data: {
            name,
            email,
            password
        },
        select: {
            id: true,
            name: true,
            email: true
        }
    })

    return res.status(201).json({ message: 'User created successfully', user: newUser });
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const user = await client.users.findFirst({
        where: {
            email,
            password
        },
        select: {
            id: true,
            name: true,
            email: true
        }
    })

    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, 'my-server-secret');
    res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        maxAge: 24 * 60 * 60 * 1000
    });
    return res.status(200).json({ message: 'Login successful', user, token });
})

const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, 'my-server-secret');

        const user = await client.users.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Attach user to request object
        req.user = user;
        next();

    } catch (error) {
        return res.status(500).json({ error });
    }
};

app.get('/profile', verifyToken, (req, res) => {
    return res.status(200).json({ user: req.user });
})

app.post('/create', verifyToken, async (req, res) => {
    const { name, price, description } = req.body;
    if (!name || !price || !description) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const product = await client.product.create({
        data: {
            name,
            price,
            description,
            userId: req.user.id
        }
    });

    return res.status(201).json({ message: 'Product created successfully', product });
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))