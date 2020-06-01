const net = require('net')
const parser = require('./parser')

class Request {
  constructor(options) {
    const { method, host, port, path, headers, body } = options
    this.method = method && method.toUpperCase() || 'GET'
    this.host = host
    this.port = port || 80
    this.path = path || '/'
    this.headers = headers || {}
    this.body = body || {}
    let contentType = this.headers['Content-Type']
    if (!contentType) {
      contentType = 'application/x-www-form-urlencoded'
    }
    if (contentType === 'application/json') {
      this.bodyText = JSON.stringify(this.body)
    } else if (contentType === 'application/x-www-form-urlencoded') {
      this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&')
    }
    this.headers['Content-Length'] = this.bodyText.length

  }

  toString() {
    return `${this.method} ${this.path} HTTP/1.1\r\nHOST: ${this.host}\r\n${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r\n\r\n${this.bodyText}\r\n\r\n`
  }

  send(conn) {
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser
      if (conn) {
        conn.write(this.toString())
      } else {
        conn = net.createConnection({
          host: this.host,
          port: this.port
        }, () => {
          conn.write(this.toString())
        })
      }

      conn.on('data', (data) => {
        parser.receive(data.toString())
        if (parser.isFinished) {
          resolve(parser.getResponse())
        }
        conn.end()
      })

      conn.on('error', (err) => {
        reject(err)
        conn.end()
      })
    })
  }
}

class Response {

}

class ResponseParser {
  constructor() {
    this.WAITING_STATUS_LINE = 0
    this.WAITING_STATUS_LINE_END = 1
    this.WAITING_HEADER_NAME = 2
    this.WAITING_HEADER_SPACE = 3
    this.WAITING_HEADER_VALUE = 4
    this.WAITING_HEADER_LINE_END = 5
    this.WAITING_HEADER_BLOCK_END = 6
    this.WAITING_BODY = 7

    this.current = this.WAITING_STATUS_LINE
    this.statusLine = ''
    this.headers = {}
    this.headerName = ''
    this.headerValue = ''
    this.bodyParser = null
  }

  get isFinished() {
    return this.bodyParser && this.bodyParser.isFinished
  }

  getResponse() {
    this.statusLine.match(/HTTP\/1\.1 ([0-9]+) ([\s\S]+)/)
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: decodeURIComponent(this.bodyParser.content.join(''))
    }
  }

  receive(string) {
    for (let i = 0; i < string.length; i++) {
      this.receiveChar(string.charAt(i))
    }
  }

  receiveChar(char) {
    if (this.current === this.WAITING_STATUS_LINE) {
      if (char === '\r') {
        this.current = this.WAITING_STATUS_LINE_END
      } else {
        this.statusLine += char
      }
    } else if (this.current === this.WAITING_STATUS_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME
      }
    } else if (this.current === this.WAITING_HEADER_NAME) {
      if (char === ':') {
        this.current = this.WAITING_HEADER_SPACE
      } else if (char === '\r') {
        this.current = this.WAITING_HEADER_BLOCK_END
      } else {
        this.headerName += char
      }
    } else if (this.current === this.WAITING_HEADER_SPACE) {
      if (char === ' ') {
        this.current = this.WAITING_HEADER_VALUE
      }
    } else if (this.current === this.WAITING_HEADER_VALUE) {
      if (char === '\r') {
        this.current = this.WAITING_HEADER_LINE_END
      } else {
        this.headerValue += char
      }
    } else if (this.current === this.WAITING_HEADER_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME
        this.headers[this.headerName] = decodeURIComponent(this.headerValue)
        this.headerName = ''
        this.headerValue = ''
      }
    } else if (this.current === this.WAITING_HEADER_BLOCK_END) {
      if (char === '\n') {
        this.current = this.WAITING_BODY
        if (this.headers['Transfer-Encoding'] === 'chunked') {
          this.bodyParser = new TrunkedBodyParser
        }
      }
    } else if (this.current === this.WAITING_BODY) {
      this.bodyParser.receiveChar(char)
    }
  }

}

class TrunkedBodyParser {
  constructor() {
    this.WAITING_LENGTH = 0
    this.WAITING_LENGTH_LINE_END = 1
    this.READING_TRUNK = 2
    this.WAITING_NEW_LINE = 3
    this.WAITING_NEW_LINE_END = 4
    this.length = 0
    this.content = []
    this.isFinished = false
    this.current = this.WAITING_LENGTH
  }

  receiveChar(char) {
    if (this.isFinished) {
      return
    }
    if (this.current === this.WAITING_LENGTH) {
      if (char === '\r') {
        if (this.length === 0) {
          this.isFinished = true
        }
        this.current = this.WAITING_LENGTH_LINE_END
      } else {
        this.length *= 16
        this.length += parseInt(char, 16)
      }
    } else if (this.current === this.WAITING_LENGTH_LINE_END) {
      if (char === '\n') {
        this.current = this.READING_TRUNK
      }
    } else if (this.current === this.READING_TRUNK) {
      this.content.push(char)
      this.length--
      if (this.length === 0) {
        this.current = this.WAITING_NEW_LINE
      }
    } else if (this.current === this.WAITING_NEW_LINE) {
      if (char === '\r') {
        this.current = this.WAITING_NEW_LINE_END
      }
    } else if (this.current === this.WAITING_NEW_LINE_END) {
      if (char === '\n') {
        this.length = 0
        this.current = this.WAITING_LENGTH
      }
    }
  }
}

void async function () {
  let req = new Request({
    host: '127.0.0.1',
    port: 8088,
    method: 'POST',
    body: {
      name: 'frank'
    },
    headers: {
      't-foo': 'bar'
    }
  })
  
  let res = await req.send()
  console.log('response: ', res)
  let dom = parser.parseHtml(res.body)
}()


