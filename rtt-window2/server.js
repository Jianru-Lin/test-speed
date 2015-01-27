var dgram = require('dgram')
var config = require('./local-test-config.json')
var f = require('util').format

console.log('rtt-server')
var socket = dgram.createSocket('udp4')
socket.bind(config.server.port, config.server.host, function() {
	socket.on('message', onMessage)

	function onMessage(packet, rinfo) {
		var id = packet.readInt32LE(0)
		console.log(f('packet [%s] from %s:%s', id, rinfo.address, rinfo.port))

		var confirmPacket = new Buffer(4)
		confirmPacket.writeInt32LE(id, 0)
		socket.send(confirmPacket, 0, confirmPacket.length, rinfo.port, rinfo.address)
	}
})