const db = require('./userdb');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
const FormData = require('form-data');
const axios = require('axios').create({  
    withCredentials: true
  })

var app = express();

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//Common login page
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/linenotifyconnection', function (request, response) {
    response.sendFile(path.join(__dirname + '/notifyConnection.html'))
});

app.get('/simplehome', function (request, response) {
    response.sendFile(path.join(__dirname + '/simpleHome.html'));
});

app.get('/simplelink', function (request, response) {
    response.sendFile(path.join(__dirname + '/simpleLogin.html'));
});

app.get('/eventpicker', function (request, response) {
    response.sendFile(path.join(__dirname + '/eventPicker.html'));
});

app.get('/linenotifycallback', function (request, response) {
    
    if (request.query.code) {
        var notifyCode = request.query.code;
        console.log(`notify Code: ${notifyCode}`);
        var data = {
            "grant_type": 'authorization_code',
            "code": notifyCode,
            "redirect_uri": 'https://3b37620e9255.ngrok.io/linenotifycallback',
            "client_id": '3DwsOFccpUAMcIJeK7QGqB',
            "client_secret": 'aPn7YxUViYLaS6qoLBhwaw92qTQMVDaxkyOHGi1MvJL'
        };

        postFormData ('https://notify-bot.line.me/oauth/token', data)  
        .then(res => {
            console.log(`notify back: ${res}`);
            if (res.status == 200) {
                var token = res.access_token;
                db.addLineTokenData(token);
                console.log(`add lineToken: ${token}`);
                sendNotifyMessage('Line Notify 連結完成', token);
            }
         })
    }

    response.sendFile(path.join(__dirname + '/notifyCallback.html'));
});

app.get('/sendnotify', function (request, response) {
    if (!request.query.msg) {
        console.log(`send msg error: empty`);
        response.sendStatus(400);
    }

    var msg = request.query.msg;
    db.getLineTokens((err, rows) => {
        console.log(JSON.stringify(rows));
        //if (!err) {
            rows.forEach(token => {
                console.log(`send token: ${token}`);
                sendNotifyMessage(msg, token);
            })
        //}
    })

    response.send('success');
})

//line link login page
app.get('/link', function (request, response) {
    if (!request.query.link_token) {
        console.log('link_token not set');
        response.sendStatus(400);
    }
    console.log(`link with token: ${request.query.link_token}`);

    request.session.link_token = request.query.link_token;

    response.sendFile(path.join(__dirname + '/login.html'));
});

//line request data
app.get('/getname', function(request, response) {
    if (!request.query.nonce) {
        console.log('auth failed');
        response.sendStatus(400);
    }

    console.log(`getname nonce: ${request.query.nonce}`);
    var nonce = request.query.nonce;
    db.getUserName(nonce, (error,row) => {
        if (error != null) {
            console.log('auth failed');
            response.send('error');
        } else {
            console.log(`row: ${row.uid}`);
            response.send(row.uid);
        }
        response.end();        
    })
});

app.get('/unlink', function(request, response) {
    if (!request.query.nonce) {
        console.log('unlink failed no auth');
        response.sendStatus(400);
    }

    console.log(`unlink nonce: ${request.query.nonce}`);
    var nonce = request.query.nonce;
    db.removeDataByNonce(nonce);

    response.send(nonce);
    response.end();
})

app.post('/simpleauth', function(request, response) {
    var username = request.body.username;
    var token = request.body.usertoken;
    var redirect = '/simplehome';
    console.log(`token: ${token}`);
    //To George: I didn't recognize the id instead I added just for convenience
    if (username) {
        db.getUserData(username, (error, row) => {
            //not exist
            if(error != null) {
                db.addUserData(username, token); 

                request.session.loggedin = true;
                request.session.username = username;
                response.redirect(redirect);
                response.end();

            } else {
                if (row.nonce == "" && token != null) {
                    db.updateUserData(username, token);
                }

                request.session.loggedin = true;
                request.session.username = username;
                response.redirect(redirect);
                response.end();
            }
        });
       
    } else {
        response.send('please enter Username!');
        response.end();
    }
});

app.post('/auth', function(request, response) {
    var username = request.body.username;
    var token = request.session.link_token;
    var redirect = '/home';
    console.log(`token: ${token}`);
    //To George: I didn't recognize the id instead I added just for convenience
    if (username) {
        db.getUserData(username, (error, row) => {
            //not exist
            if(error != null) {
                if (token != null) {
                    var nonce = getBase64Nonce(token, username);
                    db.addUserData(username, nonce); 
                    redirect = redirectLink(token, nonce);
                } else {
                    db.addUserData(username, ""); 
                }

                request.session.loggedin = true;
                request.session.username = username;
                response.redirect(redirect);
                response.end();

            } else {
            
                if (row.nonce == "" && token != null) {
                    var nonce = getBase64Nonce(token, username);
                    db.updateUserData(username, nonce);
                    redirect = redirectLink(token, nonce);
                }

                request.session.loggedin = true;
                request.session.username = username;
                console.log(`redirect: ${redirect}`);
                response.redirect(redirect);
                response.end();
            }
        });
       
    } else {
        response.send('please enter Username!');
        response.end();
    }
});

app.get('/home', function (request, response) {
    if (request.session.loggedin) {
        response.send('Welcome back, ' + request.session.username + '!');
    } else {
        response.send('Please login to view this page!');
    }
    response.end();
});

function getBase64Nonce (token, userId) {
    var str = token + userId;
    let buff = new Buffer(str);
    let base64data = buff.toString('base64');
    console.log(`origin: ${base64data}`);
    console.log(`replace: ${base64data.replace('=', '')}`);
    return base64data.replace('=', '');
}

function redirectLink (token, nonce) {
    var linkUrl = `https://access.line.me/dialog/bot/accountLink?linkToken=${token}&nonce=${nonce}`;

    return linkUrl;
}

function postFormData (uri, data) {  
    const formData = new FormData()
    Object.keys(data).forEach(key => {
        formData.append(key, data[key])
    })
  
    const request = axios.post(uri, formData, {
        headers: formData.getHeaders()
      })
      .then(r => r.data)
      .catch(function (e) {
        console.error(e)
      })
  
    return request
}

function sendNotifyMessage (msg, token) {
    const formData = new FormData()
    formData.append('message', msg)

    var msgHeaders = formData.getHeaders();
    msgHeaders['Authorization'] = `Bearer ${token}`;
   
    const config = {
        headers: msgHeaders
    };

    const request = axios.post( 
        'https://notify-api.line.me/api/notify',
        formData,
        config
    )
    .then(r => r.data)
    .catch(function(e) {
        db.removeLineTokenData(token);
        console.error(e);
    });

    return request;
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});