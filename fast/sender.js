var dgram = require('dgram')
var local_port = process.argv[2]
var remote_host = process.argv[3]
var remote_port = process.argv[4]
var socket = dgram.createSocket('udp4')
var bytesSendedTotal = 0
var time = 0
socket.bind(local_port, function() {
	var buff = new Buffer(500)
	doSend()
	function doSend() {
		socket.send(buff, 0, buff.length, remote_port, remote_host, function(err, bytesSended) {
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
	console.log(bytesSendedTotal / time)
}, 1000)