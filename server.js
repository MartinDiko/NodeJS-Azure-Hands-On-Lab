
/**
* MODULE DEPENDENCIES
* -------------------------------------------------------------------------------------------------
* include any modules you will use through out the file
**/

var express = require('express')
  , http = require('http')
  , nconf = require('nconf')
  , path = require('path')
  , everyauth = require('everyauth')
  , Recaptcha = require('recaptcha').Recaptcha;

var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

// Create connection to database
var config = {
  userName: 'KBergman', // update me
  password: 'Sw!mmingP00l', // update me
  server: 'holsql.database.windows.net', // update me
  options: {
      database: 'HOLAW', //update me
      encrypt: true
  }
}

var connection = new Connection(config);

// Attempt to connect and execute queries if connection goes through
connection.on('connect', function(err) {
    if (err) {
        console.log(err)
    }
    else{
        queryDatabase()
    }
});
/**
* CONFIGURATION
* -------------------------------------------------------------------------------------------------
* load configuration settings from ENV, then settings.json.  Contains keys for OAuth logins. See
* settings.example.json.
**/
nconf.env().file({ file: 'settings.json' });


var app = express();
app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(app.router);
    app.use(require('less-middleware')({ src: __dirname + '/public' }));
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
    app.use(express.errorHandler());
});



function queryDatabase(){
    var taskSet = [];
    console.log('Reading rows from the Table...');
    // Read all rows from table
    request = new Request("select TOP 1 FirstName, LastName from SalesLT.Customer",
        function(err, rowCount, rows) {
            console.log(rowCount + ' row(s) returned');
        }
    );
    var results = [];
    request.on('row', function(columns) {
      //console.log(columns[0].value);
      var fn = columns[0].value;
      var ln = columns[1].value;
      app.get('/', function (req, res) {
          res.render('index', { title: 'Valorem. ', fn, ln })
      });
  /*    columns.forEach(function(column) {
        var tempCol = column.metadata.colName;
        var tempVal = column.value;
        // console.log("%s", tempVal);
      });
  */
    });
    connection.execSql(request);
}

/**
* ROUTING
* -------------------------------------------------------------------------------------------------
* include a route file for each major area of functionality in the site
**/
//require('./routes/home')(app);

var server = http.createServer(app);

/**
* CHAT / SOCKET.IO
* -------------------------------------------------------------------------------------------------
* this shows a basic example of using socket.io to orchestrate chat
**/

// socket.io configuration
var buffer = [];
var io = require('socket.io').listen(server);


io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 100);
});

io.sockets.on('connection', function (socket) {
    socket.emit('messages', { buffer: buffer });
    socket.on('setname', function (name) {
        socket.set('name', name, function () {
            socket.broadcast.emit('announcement', { announcement: name + ' connected' });
        });
    });
    socket.on('message', function (message) {
        socket.get('name', function (err, name) {
            var msg = { message: [name, message] };
            buffer.push(msg);
            if (buffer.length > 15) buffer.shift();
            socket.broadcast.emit('message', msg);
        })
    });
    socket.on('disconnect', function () {
        socket.get('name', function (err, name) {
            socket.broadcast.emit('announcement', { announcement: name + ' disconnected' });
        })
    })
});


/**
* RUN
* -------------------------------------------------------------------------------------------------
* this starts up the server on the given port
**/

server.listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});
