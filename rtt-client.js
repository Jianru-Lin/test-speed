var dgram = require('dgram')
var config = require('./rtt.json')
var f = require('util').format
var hSendPacketTimeout
var lastPacket

console.log('rtt-client')
var socket = dgram.createSocket('udp4')
socket.bind(function() {
	console.log('server_host = ' + config.client.server_host)
	console.log('server_port = ' + config.client.server_port)
	socket.on('message', onMessage)
	sendPacket()
})

function sendPacket() {
	var packet = requestPacket()
	lastPacket = packet

	hSendPacketTimeout = setTimeout(onSendPacketTimeout, 250)
	socket.send(packet, 0, packet.length, config.client.server_port, config.client.server_host, function(err) {
		if (err) {
			console.log(err.toString())
			return
		}
		//console.log('packet ' + packet.seq + ' sended')
	})

}

function onMessage(msg, rinfo) {
	var packet = parsePacket(msg)

	if (lastPacket && packet.seq !== lastPacket.seq) {
		// ignore
		return
	}

	clearTimeout(hSendPacketTimeout)

	//var ftt = packet.serverStamp - packet.clientStamp
	//var btt = (new Date().valueOf()) - packet.serverStamp
	var rtt = (new Date().valueOf()) - packet.clientStamp
	//console.log(f('[%s] rtt = %s, ftt = %s, btt= %s (ms)', packet.seq, rtt, ftt, btt))
	console.log(f('[%s] rtt = %s (ms)', packet.seq, rtt))
	setTimeout(sendPacket, 1000)
}

function onSendPacketTimeout() {
	console.log(f('packet %s timeout', lastPacket.seq))
	sendPacket()
}

function requestPacket() {
	if (requestPacket.nextSeq === undefined) {
		requestPacket.nextSeq = 0
	}
	var buf = new Buffer(512)
	var seq = requestPacket.nextSeq++
	var clientStamp = new Date().valueOf()
	buf.writeInt32LE(seq, 0)
	buf.writeDoubleLE(clientStamp, 4)
	buf.seq = seq
	buf.clientStamp = clientStamp
	return buf
}

function parsePacket(buf) {
	var seq = buf.readInt32LE(0)
	var clientStamp = buf.readDoubleLE(4)
	var serverStamp = buf.readDoubleLE(12)
	buf.seq = seq
	buf.clientStamp = clientStamp
	buf.serverStamp = serverStamp
	return buf
}