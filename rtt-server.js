var dgram = require('dgram')
var config = require('./rtt.json')
var f = require('util').format

console.log('rtt-server')
var socket = dgram.createSocket('udp4')
socket.bind(config.server.port, config.server.host, function() {
	socket.on('message', onMessage)

	function onMessage(msg, rinfo) {
		var seq = msg.readInt32LE(0)
		var clientStamp = msg.readDoubleLE(4)
		var serverStamp = new Date().valueOf()
		var ftt = serverStamp - clientStamp
		//console.log(f('packet [%s] from %s:%s, ftt = %s (ms)', seq, rinfo.address, rinfo.port, ftt))
		console.log(f('packet [%s] from %s:%s', seq, rinfo.address, rinfo.port))
		msg.writeDoubleLE(serverStamp, 12)
		socket.send(msg, 0, msg.length, rinfo.port, rinfo.address)
	}
})