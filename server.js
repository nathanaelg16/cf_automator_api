const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Joi = require('joi');
const mysql = require('mysql');
const {config, armored_key} = require('./resources/config');
const openpgp = require('openpgp');
const fs = require('fs');

let key = openpgp.key.readArmored(armored_key)

const schema = Joi.object({
    username: Joi.string().replace(/(@login.cuny.edu)/, '').required(),
    password: Joi.string().required(),
    email: Joi.string().email({minDomainSegments: 2}).required(),
    college: Joi.string().required(),
    term: Joi.string().alphanum().required(),
    enrollment_appointment: Joi.string().pattern(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/).required()
});

app.use(bodyParser.json());
app.post("/enroll", function (req, res) {
    let valid = schema.validate(req.body);
    if (valid.error === undefined) {
        res.status(202).send()
        store(req.body)
    } else res.status(400).send(JSON.stringify(valid.error.message))
});

function store(data) {

    let encrypted_password = encryptPassword(data.password);
    return;

    let con = mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
    });

    con.connect(function (error) {
        if (error) throw error;
        var sql = "INSERT INTO EnrollmentQueue (username, encrypted_password, email, college, term, enrollment_appt) VALUES (?, ?, ?, ?, ?, ?);";
        con.query(sql, [data.username, data.password, data.email, data.college, data.term, data.enrollment_appointment], function (err, result) {
            if (err) throw err;
            console.log("Done");
        });
    });
}

function encryptPassword(password) {
    let pubKey = Promise.resolve(key).then(function (value) {
        return value;
    });
    console.log(pubKey);
    const options = {
        message: openpgp.message.fromText(password),
        publicKeys: key,
        armor: true
    };

    openpgp.encrypt(options).then(function (text) {
        console.log(text.data);
    });
}

var server = app.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
})