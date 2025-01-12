import http from "http";
import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";
import bodyParser from "body-parser";
import * as crypto from "crypto";
import WS from "ws";

const app = express();

app.use(cors());
app.use(
  bodyParser.json({
    type(req) {
      return true;
    },
  })
);
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

let userState = [];
const chat = [];
let currentWSClients = [];

app.get("/", async (request, response) => {
  const result = {
    status: "yes",
    message: "Server is working!",
  };
  response.status(200).send(JSON.stringify(result)).end();
});

app.get("/users", async (request, response) => {
  const usersList = [];
  currentWSClients.forEach(user => {
    const currentUser = {
      name: user.name,
    };
    usersList.push(currentUser);
  });
  /*
  userState.forEach(user => {
    const currentUser = {
      name: user.name,
      id: user.id,
    };
    usersList.push(currentUser);
  });
  */
  response.status(200).send(JSON.stringify(usersList)).end();
});

app.post("/new-user", async (request, response) => {
  if (Object.keys(request.body).length === 0) {
    const result = {
      status: "error",
      message: "Не получены данные от клиента!",
    };
    response.status(400).send(JSON.stringify(result)).end();
  } else {
    const { name } = request.body;
    const isExist = userState.find((user) => user.name === name);
    if (!isExist) {
      const newUser = {
        id: crypto.randomUUID(),
        name: name,
      };
      userState.push(newUser);
      const result = {
        status: "ok",
        user: newUser,
      };
      response.send(JSON.stringify(result)).end();
    } else {
      const result = {
        status: "error",
        message: "Такой пользователь уже существует!",
      };
      response.status(409).send(JSON.stringify(result)).end();
    }
  }
});

app.get('/chat', async (request, response) => {
  response.status(200).send(JSON.stringify(chat)).end();
})

const server = http.createServer(app);
const wsServer = new WebSocketServer({ server });

wsServer.on("connection", (ws) => {
  //ws.send('server connected msg');
  let username;

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    //console.log('Принято data', data);

    if (data.type === 'onOpen') {
      currentWSClients = currentWSClients.filter(client => client.name !== data.name);
      currentWSClients.push({ws: ws, name: data.name});
      username = data.name;
    } else if (data.type === 'onMessage') {
      if (username === data.name) {
        chat.push({name: data.name, message: data.message});
      } else {
        username = data.name;
        console.log(`Пользователь ${username} подлючился`);
        currentWSClients = currentWSClients.filter(client => client.name !== data.name);
        currentWSClients.push({ws: ws, name: data.name});
        chat.push({name: data.name, message: data.message});
      }

      //console.log('sending: ', JSON.stringify([{name: data.name, message: data.message}]));
      Array.from(wsServer.clients).forEach(client => client.send(JSON.stringify([{name: data.name, message: data.message}])));
    } else if (data.type === 'onClose') {
      currentWSClients = currentWSClients.filter(client => client.name !== data.name);
    }
  });

  ws.on('close', () => {
    currentWSClients = currentWSClients.filter(client => (client.name !== username) && (client.ws !== ws));
    userState = userState.filter(client => (client.name !== username) && (client.ws !== ws));
    //console.log(`Пользователь ${username} отключился`);
  });

});

const port = process.env.PORT || 3000;

const bootstrap = async () => {
  try {
    server.listen(port, () =>
      console.log(`Server has been started on http://localhost:${port}`)
    );
  } catch (error) {
    console.error(error);
  }
};

bootstrap();


      /*Array.from(wsServer.clients).filter(client => client !== ws).forEach(client => client.send(JSON.stringify([{name: data.name, message: data.message}])));
      ws.send(JSON.stringify(chat));*/