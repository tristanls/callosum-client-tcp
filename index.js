/*

index.js - "callosum-client-tcp": TCP client for Callosum: a self-balancing 
                   distributed services protocol

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

var events = require('events'),
    PriorityQueue = require('priority-heap-queue'),
    util = require('util');

/*
  * `options`: _Object_ _(Default: {})_
    * `MAX_SLOTS`: _Integer_ _(Default: 100)_ Number of connection slots to
            maintain.
*/
var CallosumClient = module.exports = function CallosumClient (options) {
    var self = this;
    events.EventEmitter.call(self);

    options = options || {};

    self.deadpool = [];
    self.MAX_SLOTS = options.MAX_SLOTS || 100;
    self.minHeap = new PriorityQueue({kind: 'min'});
    self.maxHeap = new PriorityQueue({kind: 'max'});
    self.slotCount = 0;
};

util.inherits(CallosumClient, events.EventEmitter);

/*
  * Return: _Socket object_
    * `_destroyed`: _Boolean_ _**CAUTION: reserved for internal use**_
    * `_leased`: _Boolean_ _**CAUTION: reserved for internal use**_
    * `_slot`: _Integer_ _**CAUTION: reserved for internal use**_
*/
CallosumClient.prototype.getConnection = function getConnection () {
    var self = this;

    var minSocket = self.minHeap.extractMin();
    // we get rid of destroyed sockets here
    while (minSocket && minSocket._destroyed) {
        minSocket = self.minHeap.extractMin();
    }

    if (minSocket)
        minSocket._leased = true;

    return minSocket;
};

/*
  * `slot`: _Integer_ Slot number.
  * `socket`: _Socket object_ Socket.
*/
CallosumClient.prototype.insertSocket = function insertSocket (slot, socket) {
    var self = this;

    socket._slot = slot;
    if (!socket._destroySocket) {
        // append watchdogs if not present
        var destroySocket = function destroySocket () {
            // only-once semantics by removal of the listeners
            socket.removeListener('end', socket._destroySocket);
            socket.removeListener('error', socket._destroySocket);
            socket.removeListener('close', socket._destroySocket); 
            // decrement max slots because socket got destroyed for some reason
            // so we can't use it anymore
            if (self.slotCount > 0)
                self.slotCount--;

            socket._destroyed = true;
        };
        socket._destroySocket = destroySocket;
        socket.on('end', destroySocket);
        socket.on('error', destroySocket);
        socket.on('close', destroySocket);
    }
    self.minHeap.insert(slot, socket);
    self.maxHeap.insert(slot, socket);
};

/*
  * `slot`: _Integer_ Slot number.
  * `socket`: _Socket object_ Socket.
*/
CallosumClient.prototype.newConnection = function newConnection (slot, socket) {
    var self = this;

    if (self.slotCount < self.MAX_SLOTS) {
        self.slotCount++;
        self.insertSocket(slot, socket);
        return;
    }
    
    // we reached MAX_SLOTS, in this case compare the new connection with
    // socket that has highest slot number

    var maxSocket = self.maxHeap.extractMax();
    // we get rid of destroyed sockets here
    while (maxSocket && maxSocket._destroyed) {
        maxSocket = self.maxHeap.extractMax();
    }

    // if our max socket slot is less or equal than the new one
    // then reject the new connection
    if (maxSocket && maxSocket._slot <= slot) {
        socket.destroy();
        // put back our maxSocket
        self.maxHeap.insert(maxSocket._slot, maxSocket);
        return;
    }

    if (!maxSocket)
        return; // no more sockets

    // mark the socket as destroyed
    maxSocket._destroyed = true;

    // if the socket is not currently leased, destroy it right away
    if (!maxSocket._leased) {
        maxSocket.removeListener('end', maxSocket._destroySocket);
        maxSocket.removeListener('error', maxSocket._destroySocket);
        maxSocket.removeListener('close', maxSocket._destroySocket);        
        maxSocket.destroy();
    } else {
        // otherwise, place it in the deadpool
        self.deadpool.push(maxSocket);
    }

    // add the new socket
    self.insertSocket(slot, socket);
};

/*
  * `socket`: _Socket object_
    * `_destroyed`: _Boolean_ _**CAUTION: reserved for internal use**_
    * `_leased`: _Boolean_ _**CAUTION: reserved for internal use**_
    * `_slot`: _Integer_ _**CAUTION: reserved for internal use**_
*/
CallosumClient.prototype.returnConnection = function returnConnection (socket) {
    var self = this;

    var deadpoolIndex = self.deadpool.indexOf(socket);
    if (deadpoolIndex >= 0) {
        var deadSocket = self.deadpool[deadpoolIndex];
        deadSocket.removeListener('end', deadSocket._destroySocket);
        deadSocket.removeListener('error', deadSocket._destroySocket);
        deadSocket.removeListener('close', deadSocket._destroySocket);
        deadSocket.destroy();
        self.deadpool.splice(deadpoolIndex, 1);
        return;
    }

    if (socket._destroyed)
        return; // nothing to do if socket was already destroyed

    // socket not in deadpool, return it to the population
    socket._leased = false;
    self.insertSocket(socket._slot, socket);
};