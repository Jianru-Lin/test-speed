var dgram = require('dgram')
var local_port = process.argv[2]
var local_host = '0.0.0.0'
var socket = dgram.createSocket('udp4')
var bytesSendedTotal = 0
var time = 0
socket.bind(local_port, local_host, function() {
	var buff = new Buffer(500)
	var client = {
		host: undefined,
		port: undefined
	}
	socket.once('message', function(msg, rinfo) {
		client.port = rinfo.port
		client.host = rinfo.address
		console.log('I will send to ' + client.host + ':' + client.port)
		time = 0
		doSend()
	})

	function doSend() {
		socket.send(buff, 0, buff.length, client.port, client.host, function(err, bytesSended) {
			if (err) {
				console.error(err.toString())
				return
			}
			bytesSendedTotal += bytesSended
			doSend()
		})		
	}
})

setInterval(function() {
	++time
	console.log('sending speed: ' + (bytesSendedTotal / time).toFixed(0) + ', ' + bytesSendedTotal)
}, 1000)