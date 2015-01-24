var dgram = require('dgram')
var config = require('./rtt.json')
var f = require('util').format
var packetSize = process.argv[2] ? parseInt(process.argv[2]) : 128
var hSendPacketTimeout
var lastPacket
var byteSended = 0
var byteSendedTotal = 0
var packetReceivedCount = 0
var startupDateTime = new Date().valueOf()

console.log('rtt-client')
console.log('packet size ' + packetSize)
var socket = dgram.createSocket('udp4')
socket.bind(function() {
	console.log('server_host = ' + config.client.server_host)
	console.log('server_port = ' + config.client.server_port)
	socket.on('message', onMessage)
	sendPacket()
	calcSpeed()
})

function calcSpeed() {
	var t = 1
	setInterval(function() {
		var speed = (byteSended / t).toFixed(0)
		var speedAverage = (byteSendedTotal * 1000 / (new Date().valueOf() - startupDateTime)).toFixed(0)
		var lostRate = (packetReceivedCount / (lastPacket.seq + 1) * 100).toFixed(2)
		//console.log('speed %s B/s, lost %s%%', speed, lostRate)
		console.log('speed %s B/s, avrage speed %s B/s, sended %s packets, received %s packets', speed, speedAverage, lastPacket.seq + 1, packetReceivedCount)
		byteSended = 0
	}, t * 1000)
}

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
	byteSended += msg.length
	byteSendedTotal += msg.length
	packetReceivedCount++

	var rtt = (new Date().valueOf()) - packet.clientStamp
	// console.log(f('[%s] rtt = %s (ms)', packet.seq, rtt))
	//setTimeout(sendPacket, 0)
	sendPacket()
}

function onSendPacketTimeout() {
	// console.log(f('packet %s timeout', lastPacket.seq))
	sendPacket()
}

function requestPacket() {
	if (requestPacket.nextSeq === undefined) {
		requestPacket.nextSeq = 0
	}
	var buf = new Buffer(packetSize)
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