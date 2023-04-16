const express = require('express')
const app = express()
const config = require("./source/config/config.js");
const port = config.serverPort;
const bodyParser = require('body-parser');
// require("dotenv").config();
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const expressWinston = require("express-winston");
const responseTime = require("response-time");
const secret = config.sessionSecret;
const store = new session.MemoryStore();
const cors = require("cors");
const helmet = require("helmet");
var amqp = require('amqplib/callback_api');


app.use(cors());
app.use(helmet());

app.use(responseTime());

app.use(
  expressWinston.logger({
    transports: [new winston.transports.Console()],
    format: winston.format.json(),
    statusLevels: true,
    meta: false,
    msg: "HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
    expressFormat: true,
    ignoreRoute() {
      return false;
    },
  })
);

app.use(
  rateLimit(config.rate)
);

//Cofiguraciones de servidor
app.use(bodyParser.json({ limit: "1mb" }));
app.use(bodyParser.urlencoded({ limit: "1mb", extended: false, parameterLimit: 50 }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  let oneof = false
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', true);
    oneof = true;
  }
  if (req.headers['access-control-request-method']) {
    res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
    oneof = true;
  }
  if (req.headers['access-control-request-headers']) {
    res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
    oneof = true;
  }
  if (oneof) {
    res.header('Access-Control-Max-Age', 60 * 60 * 24 * 365);
  }
  return next();
});

app.use(
  session({
    secret,
    resave: false,
    saveUninitialized: true,
    store,
  })
);


amqp.connect('amqp://127.0.0.1', function (error0, connection) {
  if (error0) {
    console.log('ERROR NO SE PUDO CONECTARSE CON RABBIT')
    console.log(error0)
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    console.log('rabit fue conectado correctamente')
    if (error1) {
      console.log('Erro en la coneccioón a rabbit')
      console.log(error1)
      throw error1;
    }
    var queue = 'hello1';
    var msg = 'Hola manolo';

    channel.assertQueue(queue, {
      // durable: false //En false si el servico de rabir se detiene por alguna razon se perderan los mensajes y las colas
      durable: true //En true si el servico de rabir se detiene por alguna razon los mensajes y las colas se guardan en memoria
    });

    channel.sendToQueue(queue, Buffer.from(msg), {
      persistent: true
    });
    console.log(" [x] Sent %s", msg);
  });

});

//Rutas
// let solicitud = require('./source/router/solicitud/solicitud.js');
//var gamificacion = require('./source/gamificacion/gamificacion.js');

app.get('/', (req, res) => {
  res.send('Hola bienvenido a rabbitqm') //
})

// app.use('/s/solicitud/', solicitud);

const server = app.listen(port, (err) => {
  if (err) throw new Error(err);
  console.log(`SERVIDOR CORRIENDO PUERTO: ${port}`);
});


module.exports = { app, server };
