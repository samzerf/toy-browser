const EOF = Symbol('EOF') // End of File
let currentToken = null
let currentAttribute = null

function emit(token) {
  if (token.type !== 'text') {
    console.log(token)
  }
  
}

function resetCurrentAttribute() {
  currentAttribute = {
    name: '',
    value: ''
  }
}

function data(c) {
  if (c === '<') {
    return tagOpen
  } else if (c === EOF) {
    emit({
      type: 'EOF'
    })
    return ''
  } else {
    emit({
      type: 'text',
      content: c
    })
    return data
  }
}

function tagOpen(c) {
  if (c === '/') {
    return endTagOpen
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'startTag',
      tagName: ''
    }
    return tagName(c)
  } else {
    return ''
  }
}

function endTagOpen(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'endTag',
      tagName: ''
    }
    return tagName(c)
  } else if (c === '>') {

  } else if (c === EOF) {

  } else {

  }
}

function tagName(c) {
  if (c.match(/^[\t\n\f\s]$/)) {
    return beforeAttributeName
  } else if (c === '/') {
    return selfClosingStartTag
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += c
    return tagName
  } else if (c === '>') {
    emit(currentToken)
    return data
  } else {
    return tagName
  }
}

function beforeAttributeName(c) {
  if (c.match(/^[\t\n\f\s]$/)) {
    return beforeAttributeName
  } else if (c === '/' || c === '>' || c === EOF) {
    return afterAttributeName(c)
  } else if (c === '=') {

  } else {
    currentAttribute = {
      name: '',
      value: ''
    }
    return attributeName(c)
  }
}

function attributeName(c) {
  if (c.match(/^[\t\n\f\s]$/) || c === '/' || c === '>' || c === EOF) {
    return afterAttributeName(c)
  } else if (c === '=') {
    return beforeAttributeValue
  } else if (c === '\u0000') {

  } else if (c ==='"' || c === '\'' || c === '<') {

  } else {
    currentAttribute.name += c
    return attributeName
  }
}

function afterAttributeName(c) {
  if (c.match(/^[\t\n\f\s]$/)) {
    return afterAttributeName
  } else if (c === '/') {
    currentToken[currentAttribute.name] = currentAttribute.value
    return selfClosingStartTag
  } else if (c === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value
    emit(currentToken)
    return data
  } else {
    currentToken[currentAttribute.name] = currentAttribute.value
    currentAttribute = {
      name: '',
      value: ''
    }
    return attributeName(c)
  }
}

function beforeAttributeValue(c) {
  if (c.match(/^[\t\n\f\s]$/) || c === '/' || c === '>' || c === EOF) {
    return beforeAttributeValue
  } else if (c === '"') {
    return doubleQuotedAttributeValue
  } else if (c === '\'') {
    return singleQuotedAttributeValue
  } else if (c === '>') {

  } else {
    return UnQuotedAttributeValue(c)
  }
}

function doubleQuotedAttributeValue(c) {
  if (c === '"') {
    currentToken[currentAttribute.name] = currentAttribute.value
    return afterDoubleQuotedAttributeValue
  } else if (c === '\u0000') {

  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return doubleQuotedAttributeValue
  }
}

function singleQuotedAttributeValue(c) {
  if (c === '\'') {
    currentToken[currentAttribute.name] = currentAttribute.value
    return afterSingleQuotedAttributeValue
  } else if (c === '\u0000') {

  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return singleQuotedAttributeValue
  }
}

function afterDoubleQuotedAttributeValue(c) {
  if (c.match(/^[\t\n\f\s]$/)) { // 读取新的属性
    resetCurrentAttribute()
    return beforeAttributeName
  } else if (c === '/') {
    resetCurrentAttribute()
    return selfClosingStartTag
  } else if (c === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value
    resetCurrentAttribute()
    emit(currentToken)
    return data
  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return doubleQuotedAttributeValue
  }
}

function afterSingleQuotedAttributeValue(c) {
  if (c.match(/^[\t\n\f\s]$/)) { // 读取新的属性
    return beforeAttributeName
  } else if (c === '/') {
    return selfClosingStartTag
  } else if (c === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value
    emit(currentToken)
    return data
  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return singleQuotedAttributeValue
  }
}

function UnQuotedAttributeValue(c) {
  if (c.match(/^[\t\n\f\s]$/)) { // 当前属性值读取结束
    currentToken[currentAttribute.name] = currentAttribute.value
    return beforeAttributeName
  } else if (c === '/') { // 当前闭合标签的所有属性读取结束
    currentToken[currentAttribute.name] = currentAttribute.value
    return selfClosingStartTag
  } else if (c === '>') { // 当前标签读取结束
    currentToken[currentAttribute.name] = currentAttribute.value
    emit(currentToken)
    return data
  } else if (c === '\u0000') {

  } else if (c === '"' || c === '\'' || c === '<' || c === '=' || c === '`') {

  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return UnQuotedAttributeValue
  }
}

function selfClosingStartTag(c) {
  if (c === '>') {
    currentToken.isSelfClosing = true
    emit(currentToken)
    return data
  } else if (c === EOF) {

  } else {

  }
}

module.exports.parseHtml = html => {
  let state = data
  for (c of html) {
    state = state(c)
  }
  state = state(EOF)
}
