var dgram = require('dgram')
var local_port = process.argv[2]
var local_host = '0.0.0.0'
var socket = dgram.createSocket('udp4')
var bytesReceivedTotal = 0
var time = 0
socket.bind(local_port, local_host, function() {
	var buff = new Buffer(500)
	socket.on('message', function(msg, rinfo) {
		bytesReceivedTotal += msg.length

	})
})

setInterval(function() {
	++time
	console.log('receiving speed: ' + bytesReceivedTotal / time)
}, 1000)