const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        w: 'majority',
        maxPoolSize: 10,
        keepAlive: true,
        keepAliveInitialDelay: 300000
    })
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        console.log('📊 Database:', mongoose.connection.name);
        console.log('🔌 Connection State:', mongoose.connection.readyState);
    })
    .catch((err) => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1); // Exit if unable to connect to database
    });

// Add MongoDB connection error handlers
mongoose.connection.on('error', (err) => {
    console.error('MongoDB Runtime Error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Lost MongoDB connection');
});

mongoose.connection.on('reconnected', () => {
    console.log('Reconnected to MongoDB');
});

// Update the root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;

console.log('Available Routes:', app._router.stack);

const axios = require('axios');
const querystring = require('querystring');

const FB_APP_ID = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const FB_REDIRECT_URI = process.env.FB_REDIRECT_URI;

// Facebook OAuth route
app.get('/auth/facebook', (req, res) => {
    const permissions = [
        'email',
        'public_profile',
        'pages_show_list',
        'pages_read_engagement'
    ].join(',');

    const fbAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${FB_REDIRECT_URI}&scope=${permissions}`;
    res.redirect(fbAuthUrl);
});

// Add verification endpoint for Facebook
app.get('/privacy-policy', (req, res) => {
    res.send(`
        <h1>Privacy Policy</h1>
        <p>This app is used to display Facebook Page insights and analytics.</p>
        <p>We only access the following data:</p>
        <ul>
            <li>Public profile information</li>
            <li>Page insights for pages you manage</li>
            <li>List of pages you manage</li>
        </ul>
        <p>We do not store any personal data except what is necessary for the app to function.</p>
    `);
});

app.get('/terms-of-service', (req, res) => {
    res.send(`
        <h1>Terms of Service</h1>
        <p>This app is for demonstration purposes and accessing Facebook Page insights.</p>
        <p>By using this app, you agree to allow access to your public profile and page insights data.</p>
    `);
});

// Update the callback route to redirect to the frontend
app.get('/auth/facebook/callback', async (req, res) => {
    const { code } = req.query;
    const tokenUrl = `https://graph.facebook.com/v10.0/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${FB_REDIRECT_URI}&client_secret=${FB_APP_SECRET}&code=${code}`;
    
    try {
        const tokenResponse = await axios.get(tokenUrl);
        const { access_token } = tokenResponse.data;
        // Redirect to the frontend with the access token
        res.redirect(`/?access_token=${access_token}`);
    } catch (error) {
        console.error('Error getting access token:', error);
        res.status(500).send('Error during Facebook OAuth');
    }
});

// Fetch user profile
app.get('/profile', async (req, res) => {
    const { access_token } = req.query;
    try {
        const profileResponse = await axios.get(`https://graph.facebook.com/me?fields=id,name,picture&access_token=${access_token}`);
        const userProfile = profileResponse.data;
        res.json(userProfile);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send('Error fetching user profile');
    }
});

// Fetch user pages
app.get('/pages', async (req, res) => {
    const { access_token } = req.query;
    try {
        const pagesResponse = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${access_token}`);
        const userPages = pagesResponse.data;
        res.json(userPages);
    } catch (error) {
        console.error('Error fetching user pages:', error);
        res.status(500).send('Error fetching user pages');
    }
});

// Fetch page insights
app.get('/page-insights', async (req, res) => {
    const { access_token, page_id, since, until } = req.query;
    
    try {
        // First try to get detailed insights from Facebook Insights API
        const insightsUrl = `https://graph.facebook.com/v16.0/${page_id}/insights`;
        const params = {
            access_token,
            metric: 'page_fans_total,page_engaged_users,page_impressions_unique,page_actions_post_reactions',
            since,
            until,
            period: 'total_over_range'
        };

        const insightsResponse = await axios.get(insightsUrl, { params });
        
        // Add source information to the response
        const processedData = {
            source: 'Facebook Insights API',
            data: insightsResponse.data.data.map(item => ({
                name: item.name,
                period: item.period,
                values: item.values
            }))
        };

        res.json(processedData);
    } catch (error) {
        // If Insights API fails (usually due to insufficient followers), 
        // fallback to basic page statistics
        try {
            const basicData = await getBasicPageStats(page_id, access_token);
            res.json({
                source: 'Basic Page Statistics',
                note: 'Using basic page data as fallback because insights are not available',
                data: basicData.data
            });
        } catch (fallbackError) {
            res.status(500).json({ 
                error: true, 
                message: error.response?.data?.error?.message || error.message
            });
        }
    }
});

async function getBasicPageStats(pageId, accessToken) {
    const pageDataResponse = await axios.get(`https://graph.facebook.com/v16.0/${pageId}`, {
        params: {
            access_token: accessToken,
            fields: 'fan_count,followers_count,new_like_count,talking_about_count'
        }
    });

    return {
        data: [
            {
                name: 'page_fans_total',
                values: [{ value: pageDataResponse.data.fan_count || 0 }]
            },
            {
                name: 'page_engaged_users',
                values: [{ value: pageDataResponse.data.talking_about_count || 0 }]
            },
            {
                name: 'page_impressions_unique',
                values: [{ value: pageDataResponse.data.followers_count || 0 }]
            },
            {
                name: 'page_actions_post_reactions',
                values: [{ value: pageDataResponse.data.new_like_count || 0 }]
            }
        ]
    };
}

app.post('/api/users', async (req, res) => {
    try {
        const { name, email, picture } = req.body; // Destructure data from request body

        const newUser = new User({ name, email, picture }); // Create a new User object
        await newUser.save(); // Save user to database

        res.status(201).json({ message: 'User created successfully', user: newUser }); // Success response
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating user', error });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find(); // Fetch all users
        res.status(200).json(users); // Send response with users
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching users', error });
    }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email, picture } = req.body; // Destructure updated data from request body
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, picture },
            { new: true } // Return the updated user
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User updated successfully', user }); // Success response
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating user', error });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});




