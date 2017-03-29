const latexCommands = require('./latexCommands')
const specialCharacters = require('./specialCharacters')
const sanitizeHtml = require('sanitize-html')
const sanitizeOpts = require('./sanitizeOpts')
const util = require('./util')
const MQ = MathQuill.getInterface(2)
const $equationEditor = $('.equationEditor')
const $latexEditor = $('.latexEditor')
const $answer = $('.answer')
const $mathToolbar = $('.mathToolbar')
const $math = $('.math')
let answerFocus = true
let latexEditorFocus = false
let editorVisible = false
initMathToolbar()
initSpecialCharacterSelector()

$('.newEquation').mousedown(e => {
    e.preventDefault()
    if(!answerFocus)
        return
    newEquation()
})

$('.save').click(() => {
    $.post('/save', {text: $answer.html()})
})

$.get('/load', data => data && $answer.html(data.html))

$answer.on('paste', e => {
    const reader = new FileReader()
    const file = e.originalEvent.clipboardData.items[0].getAsFile()
    if(file) reader.readAsDataURL(file)

    reader.onload = evt => {
        let img = `<img src="${evt.target.result}"/>`
        window.document.execCommand('insertHTML', false, sanitizeHtml(img, sanitizeOpts))
    }
})
function newEquation(optionalMarkup) {
    window.document.execCommand('insertHTML', false, (optionalMarkup ? optionalMarkup : '') + '<img class="result new" style="display: none"/>');
    $('.result.new').removeClass('new').after($math)
    mathField.latex('')
    editorVisible = true
    $mathToolbar.show()
    setTimeout(() => mathField.focus(), 0)
}
$answer.on('focus blur', e => {
    if(editorVisible && e.type === 'focus') onClose()
    answerFocus = e.type === 'focus'
})
    .keypress(e => {
        if(e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'l') {
            newEquation()
        }
    })
function onShowEditor($img) {
    $mathToolbar.show()
    $img.hide()
        .after($math)
    const latex = $img.prop('alt')
    $latexEditor.val(latex)
    onLatexUpdate()
    editorVisible = true
    setTimeout(() => mathField.focus(), 0)
}
$answer.on('mousedown', '.result', e => {
    if(editorVisible) onClose()
    onShowEditor($(e.target))
})

function onClose() {
    const $img = $math.prev()
    if($latexEditor.val().trim() === '') {
        $img.remove()
    } else {
        $img.show()
            .prop('src', '/math.svg?latex=' + encodeURIComponent($latexEditor.val()))
            .prop('alt', $latexEditor.val())
    }
    $('.outerPlaceholder').html($math)
    $mathToolbar.hide()
    editorVisible = false
    mathField.blur()
    latexEditorFocus = false
    $answer.get(0).focus()
}
$('.math .close').mousedown(e => {
    e.preventDefault()
    onClose()
})
const mathField = MQ.MathField($equationEditor.get(0), {
    spaceBehavesLikeTab: true,
    handlers:            {
        edit:      () => !latexEditorFocus && $latexEditor.val(mathField.latex()),
        downOutOf: field => {
            onClose()
            setTimeout(() => newEquation('<div></div>'), 2)
        }
    }
})
$math.find('textarea').keypress(e => {
    if(e.ctrlKey && !e.altKey && !e.shiftKey && e.keyCode === 13) {
        onClose()
    }
})
function onLatexUpdate() { setTimeout(() => mathField.latex($latexEditor.val()), 1) }

$latexEditor
    .keyup(onLatexUpdate)
    .on('focus blur', e => latexEditorFocus = e.type === 'focus')

$answer.get(0).focus()

function initMathToolbar() {
    $mathToolbar.append(latexCommands
        .map(o => `<button id="${o.action}" title="${o.action}">
<img src="/math.svg?latex=${encodeURIComponent(o.label ? o.label.replace(/X/g, '\\square') : o.action)}"/>
</button>`)
        .join('')
    ).on('mousedown', 'button', e => {
        e.preventDefault()
        insertMath(e.currentTarget.id)
    })
    $mathToolbar.hide()
}

function initSpecialCharacterSelector() {
    $('.toolbar .characters').find('.list')
        .append(specialCharacters.map(char => $(`<span class="button" ${char.latexCommand ? `data-command="${char.latexCommand}"` : ''}>${char.character}</span>`)))
        .on('mousedown', '.button', e => {
            e.preventDefault()
            const character = e.currentTarget.innerText
            const command = e.currentTarget.dataset.command
            if(answerFocus) {
                window.document.execCommand('insertText', false, character)
            } else {
                insertMath(command || character)
            }
        })
    $('.toggle').mousedown(e => {
        $(e.target.parentNode).toggleClass('expanded')
        e.preventDefault()
        return false
    })
}

function insertMath(symbol) {
    if(latexEditorFocus) {
        util.insertToTextAreaAtCursor($latexEditor.get(0), symbol)
        onLatexUpdate()
    } else if($equationEditor.hasClass('mq-focused')) {
        mathField.typedText(symbol)
        if(symbol.startsWith('\\')) mathField.keystroke('Tab')
        setTimeout(() => mathField.focus(), 0)
    }
}
