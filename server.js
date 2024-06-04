const express = require('express');
const http = require('http');
const mqtt = require('mqtt');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const keys = require('./iot-test-data-425419-09bd41dcab52.json'); // Update with your credentials file path

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const mqttClient = mqtt.connect('mqtt://test.mosquitto.org');

// Google Sheets API setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
    credentials: keys,
    scopes: SCOPES,
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1s36kvg54A9MfFQ-YSvaQy8l5suraRI8LnJe-Y6_q6-I'; // Update with your spreadsheet ID
console.log("DATA : " + "https://docs.google.com/spreadsheets/d/1s36kvg54A9MfFQ-YSvaQy8l5suraRI8LnJe-Y6_q6-I/edit#gid=0")

mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    const topics = ['sensor/heart-rate', 'sensor/alcohol', 'sensor/ultrasonic', 'sensor/temp', 'sensor/humid'];
    mqttClient.subscribe(topics, (err) => {
        if (err) {
            console.error('Subscription error:', err);
        } else {
            console.log('Subscribed to topics:', topics);
        }
    });
});

mqttClient.on('message', (topic, message) => {
    const value = message.toString();
    console.log(`Received message from ${topic}: ${value}`);
    logToSheet(topic, value);
    switch (topic) {
        case 'sensor/heart-rate':
            io.emit('heartRateData', value);
            break;
        case 'sensor/alcohol':
            io.emit('alcoholData', value);
            break;
        case 'sensor/ultrasonic':
            io.emit('ultrasonicData', value);
            break;
        case 'sensor/temp':
            io.emit('tempData', value);
            break;
        case 'sensor/humid':
            io.emit('humidData', value);
            break;
        default:
            break;
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/public/login.html");
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    console.log('User:', username);
    console.log('Password:', password);

    if ((username === "admin" && password === "123") || (username === "user" && password === "123")) {
        console.log('Login successful for user:', username);
        res.redirect("/index");
    } else {
        res.send("Incorrect username or password");
    }
});

app.get("/index", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000/login');
});

// Function to log data to Google Sheets
async function logToSheet(topic, value) {
    try {
        const request = {
            spreadsheetId: SPREADSHEET_ID,
            range: 'A2:A4', // Adjust based on your sheet structure
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [
                    [new Date().toLocaleString(), topic, value],
                ],
            },
        };
        await sheets.spreadsheets.values.append(request);
        console.log('Logged to sheet:', topic, value);
    } catch (error) {
        console.error('Error logging to sheet:', error);
    }
}
