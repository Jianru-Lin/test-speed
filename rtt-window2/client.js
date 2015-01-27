var dgram = require('dgram')
var f = require('util').format
var cmd = require('commander')
var path = require('path')

cmd
	.version('1.0.0')
	.usage('[options]')
	.option('-c, --config <filename>', 'config file to load, default is config.json')
	.option('-p, --packet-size <n>', 'packet size in byte, default is 512')
	.option('-w, --window-length <n>', 'window length, default is 32')
	.option('-t, --lost-timeout <n>', 'packet lost timeout in ms, default is 500')
	.parse(process.argv)

var client = {
	serverHost: undefined,
	serverPort: undefined,
	packetSize: 512,
	windowLength: 32,
	lostTimeout: 500,
	_socket: undefined,
	_unconfirmedList: [],
	_nextPacketId: 0,
	_bytesConfirmed: 0,
	_bytesSended: 0,
	start: function() {
		var self = this
		
		log('\nclient start\n')
		log('> serverHost = %s', self.serverHost)
		log('> serverPort = %s', self.serverPort)
		log('> packetSize = %s', self.packetSize)
		log('> windowLength = %s', self.windowLength)
		log('> lostTimeout = %s', self.lostTimeout)
		log('')

		var _onBind = self._onBind
		self._socket = dgram.createSocket('udp4')
		self._socket.bind(_onBind.bind(self))
	},
	reportSpeed: function() {
		var self = this
		var t = 1
		setInterval(function() {
			log('_bytesSended=%s, _bytesConfirmed=%s, _nextPacketId=%s', self._bytesSended, self._bytesConfirmed, self._nextPacketId)
		}, t * 1000)
	},
	_onBind: function() {
		var self = this
		self._socket.on('message', self._onMessage.bind(self))
		self._sendMore()
		setInterval(self._resend.bind(self), self.lostTimeout)
	},
	_sendMore: function() {
		var self = this
		var n = self.windowLength - self._unconfirmedList.length
		if (n <= 0) return
		while (n--) {
			self._sendNextPacket()
		}
	},
	_resend: function() {
		var self = this
		self._unconfirmedList.forEach(resendPacket)

		function resendPacket (unconfirmedPacket) {
			var delta = (new Date().valueOf()) - unconfirmedPacket.sendStamp
			if (delta < self.lostTimeout) return
			self._sendPacket(unconfirmedPacket, false)
		}
	},
	_onMessage: function(confirmPacket, rinfo) {
		var self = this
		confirmPacket = self._parseConfirmPacket(confirmPacket)
		for (var i = 0, len = self._unconfirmedList.length; i < len; ++i) {
			var unconfirmedPacket = self._unconfirmedList[i]
			if (confirmPacket.id === unconfirmedPacket.id) {
				self._bytesConfirmed += confirmPacket.length
				removeUnconfirmedPacket(unconfirmedPacket)
				self._sendMore()
				break;
			}
		}

		function removeUnconfirmedPacket(target) {
			self._unconfirmedList = self._unconfirmedList.filter(function(unconfirmedPacket) {
				return unconfirmedPacket !== target
			})
		}
	},
	_sendNextPacket: function() {
		var self = this
		var packet = self._makePacket()
		self._sendPacket(packet, true)
	},
	_sendPacket: function(packet, addToUnconfirmedList) {
		var self = this
		var _socket = self._socket
		var serverHost = self.serverHost
		var serverPort = self.serverPort
		_socket.send(packet, 0, packet.length, serverPort, serverHost, sendCb)

		function sendCb(err) {
			if (err) {
				console.error(err.toString())
			}
			else {
				packet.sendStamp = new Date().valueOf()
				if (addToUnconfirmedList) {
					self._unconfirmedList.push(packet)					
				}
				self._bytesSended += packet.length
			}
		}
	},
	_makePacket: function() {
		var self = this
		var buf = new Buffer(self.packetSize)
		buf.id = self._nextPacketId++
		buf.writeInt32LE(buf.id, 0)
		return buf
	},
	_parseConfirmPacket: function(packet) {
		packet.id = packet.readInt32LE(0)
		return packet
	}
}

function log() {
	console.log(f.apply(this, arguments))
}

var config = require(path.resolve(cmd.config || 'config.json'))
client.serverHost = config.client.serverHost
client.serverPort = config.client.serverPort

if (cmd.packetSize !== undefined) {
	client.packetSize = cmd.packetSize
}

if (cmd.windowLength !== undefined) {
	client.windowLength = cmd.windowLength
}

if (cmd.lostTimeout !== undefined) {
	client.lostTimeout = cmd.lostTimeout
}

client.start()
client.reportSpeed()