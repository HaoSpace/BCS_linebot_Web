var fs = require('fs');
var path = require('path');
var file = path.resolve(__dirname, '../config/user.db');
var exists = fs.existsSync(file);
//load sqlite3
var sqlite3 = require('sqlite3').verbose();

//new a database
var db = new sqlite3.Database(file);



function initUserdb(action) {
    var msg;

    db.serialize( function() {
        //db.run create if not exist
        db.run('CREATE TABLE IF NOT EXISTS users (uid TEXT, nonce TEXT)');
    
        msg = action();
    });

    return msg;
}

function initLineNotifyTokendb(action) {
    var msg;

    db.serialize( function() {
        //db.run create if not exist
        db.run('CREATE TABLE IF NOT EXISTS notifyTokens (token TEXT)');
    
        msg = action();
    });

    return msg;
}

function addLineTokenData (token) {

    var action = () => {
        var sqlAdd = 'INSERT INTO notifyTokens(token) VALUES (?)';
        db.run(sqlAdd,[token]); 
    
        return 'append finished';
    };

    return initLineNotifyTokendb(action);
}

function removeLineTokenData (token) {
    var action = () => {
        var sqlAdd = 'DELETE FROM notifyTokens WHERE token=?';
        db.run(sqlAdd,[token]); 
    
        return 'remove finished';
    };

    return initLineNotifyTokendb(action);
}

function getLineTokens (callback) {
    var action =() => {
        var sqlGet = "SELECT * FROM notifyTokens";
        var rowData = [];
        var error = null;
        db.each(sqlGet, function (err, row) {
            console.log(`token: ${row}`);
            // rows.forEach((row) => {
                // console.log(`token: ${row.token}`);
                rowData.push(row.token);
            // });
        }, function(err, count) {
            if (count == 0) {
                error = count;
            }
            console.log(`err: ${err}`);
            callback(error, rowData);
        });

        return 'get row finished';
    };

    return initLineNotifyTokendb(action);
}


function addUserData (uid, nonce) {

    var action = () => {
        var sqlAdd = 'INSERT INTO users(uid, nonce) VALUES (?,?)';
        db.run(sqlAdd,[uid, nonce]); 
    
        return 'append finished';
    };

    return initUserdb(action);
}

function updateUserData (uid, nonce) {

    var action = () => {
        var sqlUpdate = 'update users set nonce=? where uid=?';
        db.run(sqlUpdate, [nonce, uid]);
        return 'update finished';
    };
  
    return initUserdb(action);
}

function getUserData (uid, callback) {

    var action =() => {
        var sqlGet = 'SELECT rowid AS No, uid, nonce From users where uid=?';
        var rowData = null;
        var error = null;
        db.each(sqlGet, uid, function (err, row) {
            if (err != null) {
                error = err;
            } else {
                rowData = row;
            }
        }, function(err, count) {
            if (count == 0) {
                error = count;
            }
            console.log(`count: ${count}`);
            callback(error, rowData);
        });

        return 'get row finished';
    };

    return initUserdb(action);
}

function getUserName (nonce, callback) {

    var action =() => {
        var sqlGet = 'SELECT rowid AS No, uid, nonce From users where nonce=?';
        var rowData = null;
        var error = null;
        db.each(sqlGet, nonce, function (err, row) {
            if (err != null) {
                error = err;
            } else {
                rowData = row;
            }
        }, function(err, count) {
            if (count == 0) {
                error = count;
            }
            callback(error, rowData);
        });

        return 'get row finished';
    };

    return initUserdb(action);
}

function removeDataById (uid) {

    var action = () => {
        var sqlRemove = 'delete from users where uid=?';
        db.run(sqlRemove, [uid]);
        return 'remove finished';
    };
    
    return initUserdb(action);
}

function removeDataByNonce (nonce) {

    var action = () => {
        var sqlRemove = 'delete from users where nonce=?';
        db.run(sqlRemove, [nonce]);
        return 'remove finished';
    };
    
    return initUserdb(action);
}



module.exports = {
    addUserData,
    updateUserData,
    getUserData,
    getUserName,
    removeDataById,
    removeDataByNonce,
    addLineTokenData,
    removeLineTokenData,
    getLineTokens
}