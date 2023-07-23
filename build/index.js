"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const colyseus_1 = require("colyseus");
const colyseus_2 = require("colyseus");
class MyRoom extends colyseus_2.Room {
    constructor() {
        super(...arguments);
        this.messages = [];
    }
    onCreate(options) {
        this.messages = [];
        this.setMetadata({ roomName: options.roomName });
        console.log(`Room "${this.metadata.roomName}" created with id "${this.roomId}"`);
        this.onMessage("messages", (client, message) => {
            this.messages.push(message);
            this.broadcast("messages", this.messages);
        });
    }
    onJoin(client, options) {
        console.log(`${client.sessionId} joined the room "${this.roomId}"`);
        this.broadcast("messages", this.messages);
        const user = {
            sessionId: client.sessionId,
            nickname: options.nickname,
        };
        if (!connectedUsers.some((u) => u.sessionId === client.sessionId)) {
            connectedUsers.push(user);
        }
    }
    onLeave(client, consented) {
        console.log(`${client.sessionId} left the room "${this.roomId}"`);
        const index = connectedUsers.findIndex((user) => user.sessionId === client.sessionId);
        if (index !== -1) {
            connectedUsers.splice(index, 1);
        }
        if (this.metadata.roomName === "lobby" && connectedUsers.length === 0) {
            this.autoDispose = false;
        }
    }
}
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const gameServer = new colyseus_1.Server({ server });
const connectedUsers = [];
gameServer.define("my_room", MyRoom);
colyseus_1.matchMaker.createRoom("my_room", { roomName: "lobby" });
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});
app.get("/users", (req, res) => {
    res.json(connectedUsers);
});
app.get("/user/:nickname", (req, res) => {
    const { nickname } = req.params;
    const user = connectedUsers.find((user) => user.nickname === nickname);
    res.json({ user });
});
app.get("/room/:roomId", async (req, res) => {
    const { roomId } = req.params;
    try {
        const rooms = await colyseus_1.matchMaker.query({ roomId });
        if (rooms.length > 0) {
            const room = rooms[0];
            const roomCache = {
                clients: room.clients,
                locked: room.locked,
                private: room.private,
                maxClients: room.maxClients,
                metadata: room.metadata,
                name: room.name,
                publicAddress: room.processId,
                processId: room.processId,
                roomId: room.roomId,
                createdAt: new Date(room.createdAt),
                unlisted: room.unlisted,
            };
            res.json(roomCache);
        }
        else {
            res.status(404).json({ error: "Room not found" });
        }
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
});
app.get("/room/:roomId/users", async (req, res) => {
    const { roomId } = req.params;
    try {
        const room = colyseus_1.matchMaker.getRoomById(roomId);
        if (room) {
            const users = room.clients.map((client) => {
                const user = connectedUsers.find((user) => user.sessionId === client.sessionId);
                return user;
            });
            res.json(users);
        }
        else {
            res.status(404).json({ error: "Room not found" });
        }
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
});
app.get("/rooms", (req, res) => {
    colyseus_1.matchMaker.query({ name: "my_room" }).then((rooms) => {
        res.json(rooms);
    });
});
app.get("/check-nickname/:nickname", (req, res) => {
    const { nickname } = req.params;
    const nicknameInUse = connectedUsers.some((user) => user.nickname === nickname);
    res.json({ nicknameInUse });
});
gameServer.listen(3000);
console.log(`Listening on ws://localhost:3000`);
