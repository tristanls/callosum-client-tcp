/*

returnConnection.js - callosumClient.returnConnection(socket) test

The MIT License (MIT)

Copyright (c) 2013 Tristan Slominski

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/

"use strict";

var CallosumClient = require('../index.js'),
    net = require('net');

var test = module.exports = {};

test['returnConnection() returns the connection to available pool'] = function (test) {
    test.expect(4);
    var client = new CallosumClient();
    var conn1 = new net.Socket();
    conn1.id = 1;
    client.newConnection(1, conn1);
    var socket1 = client.getConnection();
    test.equal(socket1.id, 1);
    var socket2 = client.getConnection();
    test.strictEqual(socket2, undefined);
    client.returnConnection(socket1);
    test.equal(client.getConnection().id, 1);
    test.equal(client.getConnection(), undefined);
    test.done();
};

test['returnConnection() destroys socket if socket is in deadpool'] = function (test) {
    test.expect(5);
    var client = new CallosumClient({MAX_SLOTS: 1});
    var conn1 = new net.Socket();
    conn1.id = 1;
    var conn3 = new net.Socket();
    conn3.id = 3;
    client.newConnection(3, conn3);
    var socket3 = client.getConnection();
    test.equal(socket3.id, 3);
    // conn3 is leased, adding conn1 will put conn3 in deadpool
    client.newConnection(1, conn1);
    var socket1 = client.getConnection();
    test.equal(socket1.id, 1);
    test.strictEqual(client.getConnection(), undefined); // no more
    client.returnConnection(socket3); // returning should not change available conns
    test.strictEqual(client.getConnection(), undefined); // still none
    client.returnConnection(socket1);
    test.equal(client.getConnection().id, 1); // was returned and leased again
    test.done();
};

test['returnConnection() does not restore socket that emitted "end" event'] = function (test) {
    test.expect(2);
    var client = new CallosumClient();
    var conn1 = new net.Socket();
    conn1.id = 1;
    var conn2 = new net.Socket();
    conn2.id = 2;
    client.newConnection(1, conn1);
    client.newConnection(2, conn2);
    var socket1 = client.getConnection();
    conn1.emit('end');
    conn1.emit('close');
    client.returnConnection(socket1);
    test.equal(client.getConnection().id, 2);
    test.equal(client.slotCount, 1);
    test.done();
};  

test['returnConnection() does not restore socket that emitted "error" event'] = function (test) {
    test.expect(2);
    var client = new CallosumClient();
    var conn1 = new net.Socket();
    conn1.id = 1;
    var conn2 = new net.Socket();
    conn2.id = 2;
    client.newConnection(1, conn1);
    client.newConnection(2, conn2);
    var socket1 = client.getConnection();
    conn1.emit('error');
    conn1.emit('close');
    client.returnConnection(socket1);
    test.equal(client.getConnection().id, 2);
    test.equal(client.slotCount, 1);
    test.done();
};  

test['returnConnection() does not restore socket that emitted "close" event'] = function (test) {
    test.expect(2);
    var client = new CallosumClient();
    var conn1 = new net.Socket();
    conn1.id = 1;
    var conn2 = new net.Socket();
    conn2.id = 2;
    client.newConnection(1, conn1);
    client.newConnection(2, conn2);
    var socket1 = client.getConnection();
    conn1.emit('close');
    client.returnConnection(socket1);
    test.equal(client.getConnection().id, 2);
    test.equal(client.slotCount, 1);
    test.done();
};  