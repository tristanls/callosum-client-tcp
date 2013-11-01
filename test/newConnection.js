/*

newConnection.js - callosumClient.newConnection(slot, socket) test

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

test['newConnection() adds the connection if MAX_SLOTS not yet reached to minHeap'] = function (test) {
    test.expect(1);
    var client = new CallosumClient();
    var socket = new net.Socket();
    socket.id = 'mysock';
    client.newConnection(0, socket);
    test.equal(client.getConnection().id, 'mysock');
    test.done();
};

test['newConnection() replaces the connection with highest slot number if MAX_SLOTS is exceeded'] = function (test) {
    test.expect(3);
    var client = new CallosumClient({MAX_SLOTS: 2});
    var conn1 = new net.Socket();
    conn1.id = 1;
    var conn2 = new net.Socket();
    conn2.id = 2;
    var conn3 = new net.Socket();
    conn3.id = 3;
    client.newConnection(1, conn1);
    client.newConnection(3, conn3);
    client.newConnection(2, conn2);
    test.equal(client.getConnection().id, 1);
    test.equal(client.getConnection().id, 2);
    test.strictEqual(client.getConnection(), undefined);
    test.done();
};

test['after new connection is added, slot count is decremented if connection '
    + 'becomes unusable outside of the client'] = function (test) {

    test.expect(3);
    var client = new CallosumClient({MAX_SLOTS: 1});
    var conn1 = new net.Socket();
    conn1.id = 1;
    client.newConnection(1, conn1);
    var socket1 = client.getConnection();
    var conn2 = new net.Socket();
    conn2.id = 2;
    var conn3 = new net.Socket();
    conn3.id = 3;
    // conn2 won't be accepted
    client.newConnection(2, conn2);
    test.strictEqual(client.getConnection(), undefined);
    // crash conn1
    conn1.emit('error');
    // conn3 should now be accepted
    client.newConnection(3, conn3);
    test.equal(client.getConnection().id, 3);
    // conn1 is destroyed
    test.ok(conn1._destroyed);
    test.done();
};